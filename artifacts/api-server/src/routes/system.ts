import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { sql, eq, or } from "drizzle-orm";
import { hashPassword } from "../lib/auth";

const router: IRouter = Router();

// GET /system/migrate — emergency, NO-AUTH schema fixup.
// Only ever runs safe, idempotent ADD COLUMN IF NOT EXISTS / CREATE TABLE IF
// NOT EXISTS statements (never drops or deletes real data), so it's safe to
// leave reachable without login — this exists specifically for the case
// where a missing column breaks login/auth itself, creating a chicken-and-egg
// problem where the normal admin-only /admin/migrate can't be reached.
router.get("/system/migrate", async (_req, res): Promise<void> => {
  const ran: string[] = [];
  try {
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS dexbux integer NOT NULL DEFAULT 0`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_item_id integer`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_until timestamptz`);
    ran.push("users columns");

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

    res.json({ success: true, ran });
  } catch (err: any) {
    res.status(500).json({ success: false, ran, error: err?.message ?? String(err) });
  }
});

// Only these accounts can use the emergency reset below — this keeps the
// no-login-required endpoint from being usable against anyone else's account.
const RESETTABLE_EMAILS = ["superkidsupki@gmail.com", "cretcod@gmail.com"];

// POST /system/reset-password — emergency password reset for the owner
// accounts only. Body: { email, newPassword }
router.post("/system/reset-password", async (req, res): Promise<void> => {
  const { email, newPassword } = req.body as { email?: string; newPassword?: string };

  if (!email || !RESETTABLE_EMAILS.includes(email.toLowerCase())) {
    res.status(403).json({ error: "Bu email için sıfırlama yapılamaz" });
    return;
  }
  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ error: "Şifre en az 6 karakter olmalı" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(or(eq(usersTable.email, email.toLowerCase()), eq(usersTable.username, email)));
  if (!user) {
    res.status(404).json({ error: "Bu email ile bir hesap bulunamadı" });
    return;
  }

  const passwordHash = await hashPassword(newPassword);
  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, user.id));

  res.json({ success: true });
});

export default router;
