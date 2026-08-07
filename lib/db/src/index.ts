import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

// --------------------------------------------------------------------------
// Self-healing migration for columns added after the initial deploy.
// Running `drizzle-kit push` by hand against production is easy to forget,
// so instead of erroring with "column does not exist" whenever the schema
// gets ahead of the live database, we make sure these specific columns
// exist as soon as the pool is created. This is intentionally narrow (just
// ALTER TABLE ... ADD COLUMN IF NOT EXISTS for the columns this app adds
// over time) rather than a general migration runner.
// --------------------------------------------------------------------------
async function ensureSchemaIsUpToDate() {
  try {
    await pool.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "avatar_item_type" text NOT NULL DEFAULT 'hat';
    `);
    await pool.query(`
      ALTER TABLE "catalog_items"
        ADD COLUMN IF NOT EXISTS "item_type" text NOT NULL DEFAULT 'hat';
    `);
  } catch (err) {
    // Don't crash the whole process over this — if the tables themselves
    // don't exist yet (fresh database), the normal app queries below will
    // surface a clearer error anyway.
    console.error("[db] Failed to auto-migrate missing columns:", err);
  }
}

// Fire immediately when this module is first imported (i.e. on server boot),
// before any request handlers run.
export const schemaReady = ensureSchemaIsUpToDate();

export * from "./schema";
