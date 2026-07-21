import { Router, type IRouter } from "express";
import { db, gamesTable, usersTable } from "@workspace/db";
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

const router: IRouter = Router();

function safeUser(user: {
  id: number;
  username: string;
  email: string;
  avatarUrl: string | null;
  dexbux: number;
  isAdmin: boolean;
  avatarItemId: number | null;
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
      if (!combined.find((r) => r.games.id === row.games.id)) {
        combined.push(row);
      }
    }
    res.json(combined.slice(0, 5).map((r) => formatGame(r.games, r.users)));
    return;
  }

  res.json(results.map((r) => formatGame(r.games, r.users)));
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

  res.json(results.map((r) => formatGame(r.games, r.users)));
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
    games: results.map((r) => formatGame(r.games, r.users)),
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
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
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
    .set({ playCount: result.games.playCount + 1 })
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

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
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

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
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

  await db.delete(gamesTable).where(eq(gamesTable.id, params.data.id));

  res.json({ success: true });
});

router.get("/users/:id/games", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
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

  res.json(results.map((r) => formatGame(r.games, r.users)));
});

export default router;
