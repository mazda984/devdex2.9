import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  googleId: text("google_id"),
  avatarUrl: text("avatar_url"),
  // DexBux: the site's virtual currency.
  dexbux: integer("dexbux").notNull().default(0),
  isAdmin: boolean("is_admin").notNull().default(false),
  bannedUntil: timestamp("banned_until", { withTimezone: true }),
  // References catalogItemsTable.id, but left as a plain column (no FK) to
  // avoid a circular import between users.ts and catalog.ts.
  avatarItemId: integer("avatar_item_id"),
  // Mirrors the equipped catalog item's itemType ("hat" | "shirt") so the
  // client knows how to render it without an extra lookup. Defaults to
  // "hat" to match old rows / items created before this column existed.
  avatarItemType: text("avatar_item_type").notNull().default("hat"),
  // Lightweight "now playing" presence for the Friends list Join feature.
  // References gamesTable.id (no FK, same reasoning as avatarItemId above).
  // currentActivityAt is refreshed by a heartbeat while the game overlay is
  // open; a friend only counts as "online/playing" if this is recent (see
  // the ONLINE_THRESHOLD_MS check in routes/social.ts).
  currentGameId: integer("current_game_id"),
  currentActivityAt: timestamp("current_activity_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
