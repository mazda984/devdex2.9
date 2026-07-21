import { pgTable, serial, text, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

// An avatar item anyone can create (for a fixed DexBux cost, enforced in
// application code) and list for other users to buy.
export const catalogItemsTable = pgTable("catalog_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  imageUrl: text("image_url").notNull(),
  price: integer("price").notNull(), // DexBux cost to buy this item from its creator
  creatorId: integer("creator_id").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Ownership record: which users own which catalog items (their "inventory").
export const catalogPurchasesTable = pgTable(
  "catalog_purchases",
  {
    id: serial("id").primaryKey(),
    itemId: integer("item_id").notNull().references(() => catalogItemsTable.id),
    userId: integer("user_id").notNull().references(() => usersTable.id),
    purchasedAt: timestamp("purchased_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.itemId, table.userId)],
);

export type CatalogItem = typeof catalogItemsTable.$inferSelect;
export type CatalogPurchase = typeof catalogPurchasesTable.$inferSelect;
