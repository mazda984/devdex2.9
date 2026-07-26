import { pgTable, serial, integer, text, timestamp, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { gamesTable } from "./games";

export const friendshipsTable = pgTable(
  "friendships",
  {
    id: serial("id").primaryKey(),
    requesterId: integer("requester_id").notNull().references(() => usersTable.id),
    addresseeId: integer("addressee_id").notNull().references(() => usersTable.id),
    status: text("status").notNull().default("pending"), // "pending" | "accepted" | "declined"
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
  },
  (table) => [unique().on(table.requesterId, table.addresseeId)],
);

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => usersTable.id),
  receiverId: integer("receiver_id").notNull().references(() => usersTable.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const gamePlaysTable = pgTable(
  "game_plays",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => usersTable.id),
    gameId: integer("game_id").notNull().references(() => gamesTable.id),
    playedAt: timestamp("played_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.userId, table.gameId)],
);
