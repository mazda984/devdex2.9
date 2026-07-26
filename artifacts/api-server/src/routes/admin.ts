import { Router, type IRouter } from "express";
import { db, usersTable, gamesTable, gameCommentsTable, groupsTable, groupMembersTable, groupPostsTable, groupGamesTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { requireAdmin } from "../lib/auth";

const router: IRouter = Router();

// GET /admin/self-heal?secret=... — idempotent schema repair.
//
// Why this exists: sometimes the "drizzle-kit push" step during deploy gets
// skipped or fails silently, leaving the live database missing tables/columns
// that the app code already expects (e.g. games.last_played_at). When that
// happens every query touching the missing bits 500s.
//
// This endpoint (re)creates any missing tables and adds any missing columns
// to match the current schema. It never drops or alters existing data — it
// only ever CREATEs things that don't exist yet, so it's safe to hit more
// than once. It does NOT require a working login/session (which may itself
// be broken if the users/sessions tables are affected) — instead it's gated
// by a secret so only someone with the link can run it.
//
// Usage: open, in a browser, the URL:
//   https://<your-api-host>/api/admin/self-heal?secret=<ADMIN_SELF_HEAL_SECRET>
router.get("/admin/self-heal", async (req, res): Promise<void> => {
  const expected = process.env.ADMIN_SELF_HEAL_SECRET;
  if (!expected) {
    res.status(500).json({
      error: "ADMIN_SELF_HEAL_SECRET is not set on the server. Set it as an environment variable, redeploy, then reload this link.",
    });
    return;
  }

  const provided = req.query.secret;
  if (typeof provided !== "string" || provided !== expected) {
    res.status(401).json({ error: "Missing or incorrect ?secret=" });
    return;
  }

  const ran: string[] = [];
  const failed: { step: string; error: string }[] = [];

  async function step(label: string, query: ReturnType<typeof sql>) {
    try {
      await db.execute(query);
      ran.push(label);
    } catch (err) {
      failed.push({ step: label, error: err instanceof Error ? err.message : String(err) });
    }
  }

  // --- Tables (created only if missing; existing tables/data untouched) ---
  await step("create table users", sql`
    CREATE TABLE IF NOT EXISTS "users" (
      "id" serial PRIMARY KEY,
      "username" text NOT NULL UNIQUE,
      "email" text NOT NULL UNIQUE,
      "password_hash" text NOT NULL,
      "avatar_url" text,
      "dexbux" integer NOT NULL DEFAULT 0,
      "is_admin" boolean NOT NULL DEFAULT false,
      "avatar_item_id" integer,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )
  `);

  await step("create table sessions", sql`
    CREATE TABLE IF NOT EXISTS "sessions" (
      "id" text PRIMARY KEY,
      "user_id" text NOT NULL,
      "expires_at" timestamptz NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )
  `);

  await step("create table games", sql`
    CREATE TABLE IF NOT EXISTS "games" (
      "id" serial PRIMARY KEY,
      "title" text NOT NULL,
      "description" text,
      "game_url" text NOT NULL,
      "cover_image_url" text,
      "slug" text NOT NULL UNIQUE,
      "category" text,
      "featured" boolean NOT NULL DEFAULT false,
      "play_count" integer NOT NULL DEFAULT 0,
      "last_played_at" timestamptz,
      "author_id" integer NOT NULL REFERENCES "users"("id"),
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now()
    )
  `);

  await step("create table game_comments", sql`
    CREATE TABLE IF NOT EXISTS "game_comments" (
      "id" serial PRIMARY KEY,
      "game_id" integer NOT NULL REFERENCES "games"("id"),
      "author_id" integer NOT NULL REFERENCES "users"("id"),
      "content" text NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )
  `);

  await step("create table studio_scenes", sql`
    CREATE TABLE IF NOT EXISTS "studio_scenes" (
      "id" serial PRIMARY KEY,
      "slug" text NOT NULL UNIQUE,
      "author_id" integer NOT NULL REFERENCES "users"("id"),
      "data" text NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now()
    )
  `);

  await step("create table catalog_items", sql`
    CREATE TABLE IF NOT EXISTS "catalog_items" (
      "id" serial PRIMARY KEY,
      "name" text NOT NULL,
      "image_url" text NOT NULL,
      "price" integer NOT NULL,
      "creator_id" integer NOT NULL REFERENCES "users"("id"),
      "created_at" timestamptz NOT NULL DEFAULT now()
    )
  `);

  await step("create table catalog_purchases", sql`
    CREATE TABLE IF NOT EXISTS "catalog_purchases" (
      "id" serial PRIMARY KEY,
      "item_id" integer NOT NULL REFERENCES "catalog_items"("id"),
      "user_id" integer NOT NULL REFERENCES "users"("id"),
      "purchased_at" timestamptz NOT NULL DEFAULT now(),
      UNIQUE("item_id", "user_id")
    )
  `);

  await step("create table groups", sql`
    CREATE TABLE IF NOT EXISTS "groups" (
      "id" serial PRIMARY KEY,
      "name" text NOT NULL,
      "description" text,
      "slug" text NOT NULL UNIQUE,
      "cover_image_url" text,
      "is_public" boolean NOT NULL DEFAULT true,
      "author_id" integer NOT NULL REFERENCES "users"("id"),
      "member_count" integer NOT NULL DEFAULT 1,
      "created_at" timestamp NOT NULL DEFAULT now(),
      "updated_at" timestamp NOT NULL DEFAULT now()
    )
  `);

  await step("create table group_members", sql`
    CREATE TABLE IF NOT EXISTS "group_members" (
      "id" serial PRIMARY KEY,
      "group_id" integer NOT NULL REFERENCES "groups"("id"),
      "user_id" integer NOT NULL REFERENCES "users"("id"),
      "role" text NOT NULL DEFAULT 'member',
      "joined_at" timestamp NOT NULL DEFAULT now()
    )
  `);

  await step("create table group_posts", sql`
    CREATE TABLE IF NOT EXISTS "group_posts" (
      "id" serial PRIMARY KEY,
      "group_id" integer NOT NULL REFERENCES "groups"("id"),
      "author_id" integer NOT NULL REFERENCES "users"("id"),
      "content" text NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )
  `);

  await step("create table group_games", sql`
    CREATE TABLE IF NOT EXISTS "group_games" (
      "id" serial PRIMARY KEY,
      "group_id" integer NOT NULL REFERENCES "groups"("id"),
      "game_id" integer NOT NULL REFERENCES "games"("id"),
      "added_by" integer NOT NULL REFERENCES "users"("id"),
      "added_at" timestamptz NOT NULL DEFAULT now(),
      UNIQUE("group_id", "game_id")
    )
  `);

  // --- Columns (added only if missing, on tables that may already exist
  // from before this feature was added) ---
  await step("users.avatar_item_id", sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_item_id" integer`);
  await step("users.dexbux", sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "dexbux" integer NOT NULL DEFAULT 0`);
  await step("users.is_admin", sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_admin" boolean NOT NULL DEFAULT false`);
  await step("games.category", sql`ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "category" text`);
  await step("games.featured", sql`ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "featured" boolean NOT NULL DEFAULT false`);
  await step("games.play_count", sql`ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "play_count" integer NOT NULL DEFAULT 0`);
  await step("games.last_played_at", sql`ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "last_played_at" timestamptz`);
  await step("groups.member_count", sql`ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "member_count" integer NOT NULL DEFAULT 1`);
  await step("groups.is_public", sql`ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "is_public" boolean NOT NULL DEFAULT true`);

  res.status(failed.length > 0 ? 207 : 200).json({
    success: failed.length === 0,
    message: failed.length === 0
      ? "Database schema is now in sync with the app. Reload the site — the 500s should be gone."
      : "Some steps failed — see 'failed' below. Steps that succeeded are safe to leave as-is; re-running this link is harmless.",
    ran,
    failed,
  });
});

function safeUser(user: typeof usersTable.$inferSelect) {
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

// GET /admin/users — list every user (admin only)
router.get("/admin/users", requireAdmin, async (_req, res): Promise<void> => {
  const results = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
  res.json(results.map(safeUser));
});

// PATCH /admin/users/:id — grant/revoke admin, or set a user's DexBux balance
router.patch("/admin/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(404).json({ error: "Not found" }); return; }

  const { isAdmin, dexbux } = req.body as { isAdmin?: boolean; dexbux?: number };
  const patch: Partial<{ isAdmin: boolean; dexbux: number }> = {};

  if (typeof isAdmin === "boolean") patch.isAdmin = isAdmin;
  if (typeof dexbux === "number" && Number.isInteger(dexbux) && dexbux >= 0) patch.dexbux = dexbux;

  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: "Nothing to update — provide isAdmin and/or dexbux" });
    return;
  }

  const [updated] = await db.update(usersTable).set(patch).where(eq(usersTable.id, id)).returning();
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

export default router;
