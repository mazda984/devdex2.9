import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const gamesTable = pgTable("games", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  gameUrl: text("game_url").notNull(),
  coverImageUrl: text("cover_image_url"),
  slug: text("slug").notNull().unique(),
  category: text("category"),
  featured: boolean("featured").notNull().default(false),
  playCount: integer("play_count").notNull().default(0),
  authorId: integer("author_id").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertGameSchema = createInsertSchema(gamesTable).omit({ id: true, createdAt: true, updatedAt: true, playCount: true, featured: true });
export type InsertGame = z.infer<typeof insertGameSchema>;
export type Game = typeof gamesTable.$inferSelect;
