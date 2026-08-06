import { Router, type IRouter } from "express";
import { db, usersTable, gamesTable, gameCommentsTable, groupsTable, groupMembersTable, groupPostsTable, groupGamesTable, gameReportsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { requireAdmin, isProtectedAdminEmail } from "../lib/auth";

const router: IRouter = Router();

function safeUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl,
    dexbux: user.dexbux,
    isAdmin: user.isAdmin,
    avatarItemId: user.avatarItemId,
    bannedUntil: user.bannedUntil ? user.bannedUntil.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
  };
}

// GET /admin/users — list every user (admin only)
router.get("/admin/users", requireAdmin, async (_req, res): Promise<void> => {
  const results = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
  res.json(results.map(safeUser));
});

// PATCH /admin/users/:id — grant/revoke admin, or set a user's DexBux balance
router.patch("/admin/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(404).json({ error: "Not found" }); return; }

  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!target) { res.status(404).json({ error: "User not found" }); return; }

  const { isAdmin, dexbux } = req.body as { isAdmin?: boolean; dexbux?: number };
  const patch: Partial<{ isAdmin: boolean; dexbux: number }> = {};

  if (typeof isAdmin === "boolean") {
    if (isAdmin === false && isProtectedAdminEmail(target.email)) {
      res.status(403).json({ error: "Bu hesabın admin yetkisi kaldırılamaz" });
      return;
    }
    patch.isAdmin = isAdmin;
  }
  if (typeof dexbux === "number" && Number.isInteger(dexbux) && dexbux >= 0) patch.dexbux = dexbux;

  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: "Nothing to update — provide isAdmin and/or dexbux" });
    return;
  }

  const [updated] = await db.update(usersTable).set(patch).where(eq(usersTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "User not found" }); return; }

  res.json(safeUser(updated));
});

const MAX_BAN_HOURS = 24;

// POST /admin/users/:id/ban — suspend access for up to 24 hours (account itself is never deleted)
router.post("/admin/users/:id/ban", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(404).json({ error: "Not found" }); return; }

  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!target) { res.status(404).json({ error: "User not found" }); return; }

  if (isProtectedAdminEmail(target.email) || target.isAdmin) {
    res.status(403).json({ error: "Bir admin banlanamaz" });
    return;
  }

  const { hours } = req.body as { hours?: number };
  const clampedHours = Math.min(Math.max(typeof hours === "number" ? hours : MAX_BAN_HOURS, 0.0166), MAX_BAN_HOURS);
  const bannedUntil = new Date(Date.now() + clampedHours * 60 * 60 * 1000);

  const [updated] = await db.update(usersTable).set({ bannedUntil }).where(eq(usersTable.id, id)).returning();
  res.json(safeUser(updated));
});

// POST /admin/users/:id/unban — lift a ban early
router.post("/admin/users/:id/unban", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(404).json({ error: "Not found" }); return; }

  const [updated] = await db.update(usersTable).set({ bannedUntil: null }).where(eq(usersTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "User not found" }); return; }
  res.json(safeUser(updated));
});

// DELETE /admin/games/:id — admin override, delete any game regardless of owner
router.delete("/admin/games/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(404).json({ error: "Not found" }); return; }

  await db.delete(gameCommentsTable).where(eq(gameCommentsTable.gameId, id));
  await db.delete(groupGamesTable).where(eq(groupGamesTable.gameId, id));
  await db.delete(gamesTable).where(eq(gamesTable.id, id));
  res.json({ success: true });
});

// DELETE /admin/groups/:id — admin override, delete any group regardless of owner
router.delete("/admin/groups/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(404).json({ error: "Not found" }); return; }

  await db.delete(groupPostsTable).where(eq(groupPostsTable.groupId, id));
  await db.delete(groupGamesTable).where(eq(groupGamesTable.groupId, id));
  await db.delete(groupMembersTable).where(eq(groupMembersTable.groupId, id));
  await db.delete(groupsTable).where(eq(groupsTable.id, id));
  res.json({ success: true });
});

// GET /admin/debug — temporary diagnostics: real row counts per table
router.get("/admin/debug", requireAdmin, async (_req, res): Promise<void> => {
  const [gameCount] = await db.select({ count: sql<number>`count(*)::int` }).from(gamesTable);
  const [userCount] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable);
  const [groupCount] = await db.select({ count: sql<number>`count(*)::int` }).from(groupsTable);
  const sampleGames = await db.select({ id: gamesTable.id, title: gamesTable.title, authorId: gamesTable.authorId }).from(gamesTable).limit(5);

  res.json({
    gameCount: gameCount?.count ?? 0,
    userCount: userCount?.count ?? 0,
    groupCount: groupCount?.count ?? 0,
    sampleGames,
  });
});

// GET /admin/migrate — idempotent, self-healing schema fixup.
// Adds any missing columns/tables directly via raw SQL, in case `drizzle-kit
// push` didn't run (or didn't finish) during a deploy. Safe to visit
// multiple times — every statement is guarded with IF NOT EXISTS / OR REPLACE.
router.get("/admin/migrate", requireAdmin, async (_req, res): Promise<void> => {
  const ran: string[] = [];
  try {
    await db.execute(sql`ALTER TABLE games ADD COLUMN IF NOT EXISTS last_played_at timestamptz`);
    ran.push("games.last_played_at");

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS game_comments (
        id serial PRIMARY KEY,
        game_id integer NOT NULL REFERENCES games(id),
        author_id integer NOT NULL REFERENCES users(id),
        content text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    ran.push("game_comments table");

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS group_games (
        id serial PRIMARY KEY,
        group_id integer NOT NULL REFERENCES groups(id),
        game_id integer NOT NULL REFERENCES games(id),
        added_by integer NOT NULL REFERENCES users(id),
        added_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(group_id, game_id)
      )
    `);
    ran.push("group_games table");

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS group_posts (
        id serial PRIMARY KEY,
        group_id integer NOT NULL REFERENCES groups(id),
        author_id integer NOT NULL REFERENCES users(id),
        content text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    ran.push("group_posts table");

    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS dexbux integer NOT NULL DEFAULT 0`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_item_id integer`);
    ran.push("users.dexbux/is_admin/avatar_item_id");

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS catalog_items (
        id serial PRIMARY KEY,
        name text NOT NULL,
        image_url text NOT NULL,
        price integer NOT NULL,
        creator_id integer NOT NULL REFERENCES users(id),
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS catalog_purchases (
        id serial PRIMARY KEY,
        item_id integer NOT NULL REFERENCES catalog_items(id),
        user_id integer NOT NULL REFERENCES users(id),
        purchased_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(item_id, user_id)
      )
    `);
    ran.push("catalog tables");

    // studio_scenes may still exist in its old (pre-publish) shape from
    // earlier testing — that data isn't important, so replace it outright
    // with the current shape if the new columns aren't there yet.
    const studioSceneCols = await db.execute(sql`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'studio_scenes'
    `);
    const colNames = (studioSceneCols as any).rows?.map((r: any) => r.column_name) ?? [];
    if (colNames.length > 0 && !colNames.includes("slug")) {
      await db.execute(sql`DROP TABLE IF EXISTS studio_scenes`);
      ran.push("studio_scenes (dropped old shape)");
    }
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS studio_scenes (
        id serial PRIMARY KEY,
        slug text NOT NULL UNIQUE,
        author_id integer NOT NULL REFERENCES users(id),
        data text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    ran.push("studio_scenes table (current shape)");

    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_until timestamptz`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id text`);
    await db.execute(sql`ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL`);
    ran.push("users.banned_until");

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS friendships (
        id serial PRIMARY KEY,
        requester_id integer NOT NULL REFERENCES users(id),
        addressee_id integer NOT NULL REFERENCES users(id),
        status text NOT NULL DEFAULT 'pending',
        created_at timestamptz NOT NULL DEFAULT now(),
        responded_at timestamptz,
        UNIQUE(requester_id, addressee_id)
      )
    `);
    ran.push("friendships table");

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS messages (
        id serial PRIMARY KEY,
        sender_id integer NOT NULL REFERENCES users(id),
        receiver_id integer NOT NULL REFERENCES users(id),
        content text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    ran.push("messages table");

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS game_plays (
        id serial PRIMARY KEY,
        user_id integer NOT NULL REFERENCES users(id),
        game_id integer NOT NULL REFERENCES games(id),
        played_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(user_id, game_id)
      )
    `);
    ran.push("game_plays table");

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS game_reports (
        id serial PRIMARY KEY,
        game_id integer NOT NULL REFERENCES games(id),
        reporter_id integer NOT NULL REFERENCES users(id),
        reason text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    ran.push("game_reports table");

    res.json({ success: true, ran });
  } catch (err: any) {
    res.status(500).json({ success: false, ran, error: err?.message ?? String(err) });
  }
});

// GET /admin/reports — all reported games, most recent first
router.get("/admin/reports", requireAdmin, async (_req, res): Promise<void> => {
  const results = await db
    .select()
    .from(gameReportsTable)
    .innerJoin(gamesTable, eq(gameReportsTable.gameId, gamesTable.id))
    .innerJoin(usersTable, eq(gameReportsTable.reporterId, usersTable.id))
    .orderBy(desc(gameReportsTable.createdAt));

  res.json(
    results.map((r) => ({
      id: r.game_reports.id,
      reason: r.game_reports.reason,
      createdAt: r.game_reports.createdAt.toISOString(),
      reporter: { id: r.users.id, username: r.users.username },
      game: {
        id: r.games.id,
        title: r.games.title,
        coverImageUrl: r.games.coverImageUrl,
        slug: r.games.slug,
      },
    })),
  );
});

// DELETE /admin/reports/:id — dismiss a report without deleting the game
router.delete("/admin/reports/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(404).json({ error: "Not found" }); return; }
  await db.delete(gameReportsTable).where(eq(gameReportsTable.id, id));
  res.json({ success: true });
});

export default router;
