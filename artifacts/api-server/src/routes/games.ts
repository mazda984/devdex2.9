import { Router, type IRouter } from "express";
import { db, gamesTable, usersTable, gameCommentsTable, groupGamesTable, gamePlaysTable, gameReportsTable } from "@workspace/db";
import { eq, ilike, or, desc, sql } from "drizzle-orm";
import {
  CreateGameBody,
  UpdateGameBody,
  GetGameParams,
  UpdateGameParams,
  DeleteGameParams,
  GetUserGamesParams,
  ListGamesQueryParams,
  SearchGamesQueryParams,
} from "@workspace/api-zod";
import { getSessionId, getSessionUser } from "../lib/auth";
import { uniqueSlug } from "../lib/slugify";
import { containsAdultContent } from "../lib/content-filter";

const router: IRouter = Router();

function safeUser(user: {
  id: number;
  username: string;
  email: string;
  avatarUrl: string | null;
  dexbux: number;
  isAdmin: boolean;
  avatarItemId: number | null;
  avatarItemType: string;
  createdAt: Date;
}) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl,
    dexbux: user.dexbux,
    isAdmin: user.isAdmin,
    avatarItemId: user.avatarItemId,
    avatarItemType: user.avatarItemType,
    createdAt: user.createdAt.toISOString(),
  };
}

function formatGame(game: typeof gamesTable.$inferSelect, author: typeof usersTable.$inferSelect) {
  return {
    id: game.id,
    title: game.title,
    description: game.description,
    gameUrl: game.gameUrl,
    coverImageUrl: game.coverImageUrl,
    slug: game.slug,
    category: game.category,
    featured: game.featured,
    playCount: game.playCount,
    authorId: game.authorId,
    author: safeUser(author),
    createdAt: game.createdAt.toISOString(),
    updatedAt: game.updatedAt.toISOString(),
  };
}

router.get("/games/featured", async (_req, res): Promise<void> => {
  const results = await db
    .select()
    .from(gamesTable)
    .innerJoin(usersTable, eq(gamesTable.authorId, usersTable.id))
    .where(eq(gamesTable.featured, true))
    .orderBy(desc(gamesTable.playCount))
    .limit(5);

  if (results.length < 5) {
    const extra = await db
      .select()
      .from(gamesTable)
      .innerJoin(usersTable, eq(gamesTable.authorId, usersTable.id))
      .orderBy(desc(gamesTable.playCount))
      .limit(5);

    const combined = [...results];
    for (const row of extra) {
      if (combined.length >= 5) break;
      if (!combined.find((r: any) => r.games.id === row.games.id)) {
        combined.push(row);
      }
    }
    res.json(combined.slice(0, 5).map((r: any) => formatGame(r.games, r.users)));
    return;
  }

  res.json(results.map((r: any) => formatGame(r.games, r.users)));
});

router.get("/games/search", async (req, res): Promise<void> => {
  const parsed = SearchGamesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const q = parsed.data.q;
  const results = await db
    .select()
    .from(gamesTable)
    .innerJoin(usersTable, eq(gamesTable.authorId, usersTable.id))
    .where(
      or(
        ilike(gamesTable.title, `%${q}%`),
        ilike(gamesTable.description, `%${q}%`),
        ilike(gamesTable.category, `%${q}%`)
      )
    )
    .orderBy(desc(gamesTable.playCount))
    .limit(20);

  res.json(results.map((r: any) => formatGame(r.games, r.users)));
});

router.get("/games/stats", async (_req, res): Promise<void> => {
  const [gameCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(gamesTable);
  const [userCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(usersTable);
  const [playTotal] = await db
    .select({ total: sql<number>`coalesce(sum(play_count),0)::int` })
    .from(gamesTable);

  res.json({
    totalGames: gameCount?.count ?? 0,
    totalUsers: userCount?.count ?? 0,
    totalPlays: playTotal?.total ?? 0,
  });
});

// GET /games/discovery — Roblox-Discovery-style rows: actively played, most
// popular, and recommended.
router.get("/games/discovery", async (_req, res): Promise<void> => {
  const LIMIT = 12;

  const activelyPlayedRows = await db
    .select()
    .from(gamesTable)
    .innerJoin(usersTable, eq(gamesTable.authorId, usersTable.id))
    .where(sql`${gamesTable.lastPlayedAt} is not null`)
    .orderBy(desc(gamesTable.lastPlayedAt))
    .limit(LIMIT);

  const popularRows = await db
    .select()
    .from(gamesTable)
    .innerJoin(usersTable, eq(gamesTable.authorId, usersTable.id))
    .orderBy(desc(gamesTable.playCount))
    .limit(LIMIT);

  // "Recommended": no personalization yet, so surface a randomized sample —
  // still gives the "something new every visit" discovery feel.
  const recommendedRows = await db
    .select()
    .from(gamesTable)
    .innerJoin(usersTable, eq(gamesTable.authorId, usersTable.id))
    .orderBy(sql`random()`)
    .limit(LIMIT);

  res.json({
    activelyPlayed: activelyPlayedRows.map((r: any) => formatGame(r.games, r.users)),
    popular: popularRows.map((r: any) => formatGame(r.games, r.users)),
    recommended: recommendedRows.map((r: any) => formatGame(r.games, r.users)),
  });
});

router.get("/games", async (req, res): Promise<void> => {
  const parsed = ListGamesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { search, limit = 20, offset = 0 } = parsed.data;

  let query = db
    .select()
    .from(gamesTable)
    .innerJoin(usersTable, eq(gamesTable.authorId, usersTable.id))
    .$dynamic();

  if (search) {
    query = query.where(
      or(
        ilike(gamesTable.title, `%${search}%`),
        ilike(gamesTable.description, `%${search}%`)
      )
    );
  }

  const [totalResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(gamesTable)
    .where(
      search
        ? or(
            ilike(gamesTable.title, `%${search}%`),
            ilike(gamesTable.description, `%${search}%`)
          )
        : undefined
    );

  const results = await query
    .orderBy(desc(gamesTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({
    games: results.map((r: any) => formatGame(r.games, r.users)),
    total: totalResult?.count ?? 0,
  });
});

router.post("/games", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const user = await getSessionUser(sessionId);
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const parsed = CreateGameBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { title, gameUrl, coverImageUrl, description, category } = parsed.data;

  if (containsAdultContent(title, description, category)) {
    res.status(400).json({
      error: "Oyun başlığı/açıklaması izin verilmeyen içerik (18+/cinsel içerik) barındırıyor. DevDex'te bu tür içeriklere izin verilmiyor.",
    });
    return;
  }

  const slug = await uniqueSlug(title);

  const [game] = await db
    .insert(gamesTable)
    .values({
      title,
      gameUrl,
      coverImageUrl: coverImageUrl ?? null,
      description: description ?? null,
      category: category ?? null,
      slug,
      authorId: user.id,
    })
    .returning();

  res.status(201).json(formatGame(game, user));
});

router.get("/games/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(String(req.params.id)) ? String(req.params.id)[0] : String(req.params.id);
  const params = GetGameParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [result] = await db
    .select()
    .from(gamesTable)
    .innerJoin(usersTable, eq(gamesTable.authorId, usersTable.id))
    .where(eq(gamesTable.id, params.data.id));

  if (!result) {
    res.status(404).json({ error: "Game not found" });
    return;
  }

  // Increment play count
  await db
    .update(gamesTable)
    .set({ playCount: result.games.playCount + 1, lastPlayedAt: new Date() })
    .where(eq(gamesTable.id, result.games.id));

  // Reward the author with 1 DexBux per play — but not for the author
  // playing their own game, to avoid trivial self-farming.
  const sessionId = getSessionId(req);
  const player = sessionId ? await getSessionUser(sessionId) : null;
  let author = result.users;
  if (!player || player.id !== result.games.authorId) {
    const [updatedAuthor] = await db
      .update(usersTable)
      .set({ dexbux: sql`${usersTable.dexbux} + 1` })
      .where(eq(usersTable.id, result.games.authorId))
      .returning();
    if (updatedAuthor) author = updatedAuthor;
  }

  // Record this play in the player's history (upsert so repeat plays just
  // bump the timestamp rather than creating duplicate rows).
  if (player) {
    await db
      .insert(gamePlaysTable)
      .values({ userId: player.id, gameId: result.games.id })
      .onConflictDoUpdate({
        target: [gamePlaysTable.userId, gamePlaysTable.gameId],
        set: { playedAt: new Date() },
      });
  }

  res.json(formatGame({ ...result.games, playCount: result.games.playCount + 1 }, author));
});

router.patch("/games/:id", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const user = await getSessionUser(sessionId);
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const raw = Array.isArray(String(req.params.id)) ? String(req.params.id)[0] : String(req.params.id);
  const params = UpdateGameParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(gamesTable)
    .where(eq(gamesTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Game not found" });
    return;
  }

  if (existing.authorId !== user.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const parsed = UpdateGameBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (containsAdultContent(parsed.data.title, parsed.data.description, parsed.data.category)) {
    res.status(400).json({
      error: "Oyun başlığı/açıklaması izin verilmeyen içerik (18+/cinsel içerik) barındırıyor. DevDex'te bu tür içeriklere izin verilmiyor.",
    });
    return;
  }

  const [updated] = await db
    .update(gamesTable)
    .set(parsed.data)
    .where(eq(gamesTable.id, params.data.id))
    .returning();

  res.json(formatGame(updated, user));
});

router.delete("/games/:id", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const user = await getSessionUser(sessionId);
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const raw = Array.isArray(String(req.params.id)) ? String(req.params.id)[0] : String(req.params.id);
  const params = DeleteGameParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(gamesTable)
    .where(eq(gamesTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Game not found" });
    return;
  }

  if (existing.authorId !== user.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.delete(gameCommentsTable).where(eq(gameCommentsTable.gameId, params.data.id));
  await db.delete(groupGamesTable).where(eq(groupGamesTable.gameId, params.data.id));
  await db.delete(gamesTable).where(eq(gamesTable.id, params.data.id));

  res.json({ success: true });
});

router.get("/users/:id/games", async (req, res): Promise<void> => {
  const raw = Array.isArray(String(req.params.id)) ? String(req.params.id)[0] : String(req.params.id);
  const params = GetUserGamesParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const results = await db
    .select()
    .from(gamesTable)
    .innerJoin(usersTable, eq(gamesTable.authorId, usersTable.id))
    .where(eq(gamesTable.authorId, params.data.id))
    .orderBy(desc(gamesTable.createdAt));

  res.json(results.map((r: any) => formatGame(r.games, r.users)));
});

// GET /users/:id/play-history — games this user has played, most recent first
router.get("/users/:id/play-history", async (req, res): Promise<void> => {
  const userId = parseInt(String(req.params.id), 10);
  if (isNaN(userId)) { res.status(404).json({ error: "Not found" }); return; }

  const results = await db
    .select()
    .from(gamePlaysTable)
    .innerJoin(gamesTable, eq(gamePlaysTable.gameId, gamesTable.id))
    .innerJoin(usersTable, eq(gamesTable.authorId, usersTable.id))
    .where(eq(gamePlaysTable.userId, userId))
    .orderBy(desc(gamePlaysTable.playedAt))
    .limit(24);

  res.json(results.map((r: any) => formatGame(r.games, r.users)));
});

// Badge tiers, in ascending order — a game can only earn its highest
// qualifying tier (not one badge per tier) to avoid cluttering profiles.
const BADGE_TIERS = [
  { threshold: 1000, id: "successful_developer", label: "Başarılı Geliştirici" },
  { threshold: 10000, id: "rising_star", label: "Yükselen Yıldız" },
  { threshold: 100000, id: "legendary_developer", label: "Efsanevi Geliştirici" },
] as const;

// GET /users/:id/badges — badges earned from this user's games' play counts.
// Computed live from playCount, not stored, so it's always accurate.
router.get("/users/:id/badges", async (req, res): Promise<void> => {
  const userId = parseInt(String(req.params.id), 10);
  if (isNaN(userId)) { res.status(404).json({ error: "Not found" }); return; }

  const games = await db.select().from(gamesTable).where(eq(gamesTable.authorId, userId));

  const badges = games
    .map((game: any) => {
      const tier = [...BADGE_TIERS].reverse().find((t: any) => game.playCount >= t.threshold);
      if (!tier) return null;
      return {
        badgeId: tier.id,
        label: tier.label,
        threshold: tier.threshold,
        gameId: game.id,
        gameTitle: game.title,
        gameCoverImageUrl: game.coverImageUrl,
        gameSlug: game.slug,
        playCount: game.playCount,
      };
    })
    .filter((b: any): b is NonNullable<typeof b> => b !== null)
    .sort((a: any, b: any) => b.playCount - a.playCount);

  res.json(badges);
});
router.get("/games/:id/comments", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(404).json({ error: "Not found" }); return; }

  const results = await db
    .select()
    .from(gameCommentsTable)
    .innerJoin(usersTable, eq(gameCommentsTable.authorId, usersTable.id))
    .where(eq(gameCommentsTable.gameId, id))
    .orderBy(desc(gameCommentsTable.createdAt));

  res.json(
    results.map((r: any) => ({
      id: r.game_comments.id,
      gameId: r.game_comments.gameId,
      authorId: r.game_comments.authorId,
      content: r.game_comments.content,
      author: safeUser(r.users),
      createdAt: r.game_comments.createdAt.toISOString(),
    })),
  );
});

// POST /games/:id/comments
router.post("/games/:id/comments", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  const user = sessionId ? await getSessionUser(sessionId) : null;
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(404).json({ error: "Not found" }); return; }

  const { content } = req.body;
  if (!content || typeof content !== "string" || content.trim().length === 0) {
    res.status(400).json({ error: "Content is required" });
    return;
  }

  const [game] = await db.select().from(gamesTable).where(eq(gamesTable.id, id));
  if (!game) { res.status(404).json({ error: "Game not found" }); return; }

  const [comment] = await db
    .insert(gameCommentsTable)
    .values({ gameId: id, authorId: user.id, content: content.trim() })
    .returning();

  res.status(201).json({
    id: comment.id,
    gameId: comment.gameId,
    authorId: comment.authorId,
    content: comment.content,
    author: safeUser(user),
    createdAt: comment.createdAt.toISOString(),
  });
});

// DELETE /games/:id/comments/:commentId — comment author, game author, or site admin
router.delete("/games/:id/comments/:commentId", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  const user = sessionId ? await getSessionUser(sessionId) : null;
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const gameId = parseInt(String(req.params.id), 10);
  const commentId = parseInt(String(req.params.commentId), 10);
  if (isNaN(gameId) || isNaN(commentId)) { res.status(404).json({ error: "Not found" }); return; }

  const [comment] = await db.select().from(gameCommentsTable).where(eq(gameCommentsTable.id, commentId));
  if (!comment || comment.gameId !== gameId) { res.status(404).json({ error: "Comment not found" }); return; }

  const [game] = await db.select().from(gamesTable).where(eq(gamesTable.id, gameId));

  const canDelete = comment.authorId === user.id || game?.authorId === user.id || user.isAdmin;
  if (!canDelete) { res.status(403).json({ error: "Forbidden" }); return; }

  await db.delete(gameCommentsTable).where(eq(gameCommentsTable.id, commentId));
  res.json({ success: true });
});

// POST /games/:id/report — flag a game for admin review (e.g. inappropriate content)
router.post("/games/:id/report", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  const user = sessionId ? await getSessionUser(sessionId) : null;
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(404).json({ error: "Not found" }); return; }

  const { reason } = req.body as { reason?: string };
  if (!reason || reason.trim().length === 0) {
    res.status(400).json({ error: "Bir sebep belirtmelisin" });
    return;
  }

  const [game] = await db.select().from(gamesTable).where(eq(gamesTable.id, id));
  if (!game) { res.status(404).json({ error: "Game not found" }); return; }

  await db.insert(gameReportsTable).values({ gameId: id, reporterId: user.id, reason: reason.trim() });
  res.status(201).json({ success: true });
});

export default router;
