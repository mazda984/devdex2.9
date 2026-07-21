import { Router, type IRouter } from "express";
import { db, catalogItemsTable, catalogPurchasesTable, usersTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth, getSessionUser, getSessionId } from "../lib/auth";

const router: IRouter = Router();

// Fixed DexBux cost to create a new avatar item and list it in the catalog.
const CATALOG_ITEM_CREATION_COST = 5;

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

function formatItem(item: typeof catalogItemsTable.$inferSelect, creator: typeof usersTable.$inferSelect) {
  return {
    id: item.id,
    name: item.name,
    imageUrl: item.imageUrl,
    price: item.price,
    creatorId: item.creatorId,
    creator: safeUser(creator),
    createdAt: item.createdAt.toISOString(),
  };
}

// GET /catalog — list all avatar items
router.get("/catalog", async (_req, res): Promise<void> => {
  const results = await db
    .select()
    .from(catalogItemsTable)
    .innerJoin(usersTable, eq(catalogItemsTable.creatorId, usersTable.id))
    .orderBy(desc(catalogItemsTable.createdAt));

  res.json(results.map((r) => formatItem(r.catalog_items, r.users)));
});

// GET /catalog/mine — items the current user owns (their inventory)
router.get("/catalog/mine", requireAuth, async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  const user = sessionId ? await getSessionUser(sessionId) : null;
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const results = await db
    .select()
    .from(catalogPurchasesTable)
    .innerJoin(catalogItemsTable, eq(catalogPurchasesTable.itemId, catalogItemsTable.id))
    .innerJoin(usersTable, eq(catalogItemsTable.creatorId, usersTable.id))
    .where(eq(catalogPurchasesTable.userId, user.id))
    .orderBy(desc(catalogPurchasesTable.purchasedAt));

  res.json(results.map((r) => formatItem(r.catalog_items, r.users)));
});

// POST /catalog — create a new avatar item (costs CATALOG_ITEM_CREATION_COST DexBux)
router.post("/catalog", requireAuth, async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  const user = sessionId ? await getSessionUser(sessionId) : null;
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { name, imageUrl, price } = req.body;
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    res.status(400).json({ error: "Name is required" });
    return;
  }
  if (!imageUrl || typeof imageUrl !== "string") {
    res.status(400).json({ error: "imageUrl is required" });
    return;
  }
  const resalePrice = Number(price);
  if (!Number.isInteger(resalePrice) || resalePrice < 0) {
    res.status(400).json({ error: "price must be a non-negative integer" });
    return;
  }

  if (user.dexbux < CATALOG_ITEM_CREATION_COST) {
    res.status(402).json({
      error: `Katalog öğesi oluşturmak için ${CATALOG_ITEM_CREATION_COST} DexBux gerekiyor. Yeterli bakiyen yok.`,
    });
    return;
  }

  const [item] = await db
    .insert(catalogItemsTable)
    .values({ name: name.trim(), imageUrl, price: resalePrice, creatorId: user.id })
    .returning();

  const [chargedUser] = await db
    .update(usersTable)
    .set({ dexbux: user.dexbux - CATALOG_ITEM_CREATION_COST })
    .where(eq(usersTable.id, user.id))
    .returning();

  // The creator automatically owns their own item (so they can equip it).
  await db.insert(catalogPurchasesTable).values({ itemId: item.id, userId: user.id });

  res.status(201).json(formatItem(item, chargedUser ?? user));
});

// POST /catalog/:id/buy — buy an item from its creator
router.post("/catalog/:id/buy", requireAuth, async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  const user = sessionId ? await getSessionUser(sessionId) : null;
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(404).json({ error: "Not found" }); return; }

  const [item] = await db.select().from(catalogItemsTable).where(eq(catalogItemsTable.id, id));
  if (!item) { res.status(404).json({ error: "Item not found" }); return; }

  if (item.creatorId === user.id) {
    res.status(400).json({ error: "You already own an item you created" });
    return;
  }

  const [existingPurchase] = await db
    .select()
    .from(catalogPurchasesTable)
    .where(and(eq(catalogPurchasesTable.itemId, id), eq(catalogPurchasesTable.userId, user.id)));
  if (existingPurchase) {
    res.status(409).json({ error: "You already own this item" });
    return;
  }

  if (user.dexbux < item.price) {
    res.status(402).json({ error: "Yeterli DexBux'un yok" });
    return;
  }

  await db
    .update(usersTable)
    .set({ dexbux: user.dexbux - item.price })
    .where(eq(usersTable.id, user.id));

  const [seller] = await db.select().from(usersTable).where(eq(usersTable.id, item.creatorId));
  if (seller) {
    await db
      .update(usersTable)
      .set({ dexbux: seller.dexbux + item.price })
      .where(eq(usersTable.id, seller.id));
  }

  await db.insert(catalogPurchasesTable).values({ itemId: id, userId: user.id });

  const [updatedBuyer] = await db.select().from(usersTable).where(eq(usersTable.id, user.id));

  res.json({ success: true, user: safeUser(updatedBuyer ?? user) });
});

// POST /catalog/:id/equip — set an owned item as your avatar
router.post("/catalog/:id/equip", requireAuth, async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  const user = sessionId ? await getSessionUser(sessionId) : null;
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(404).json({ error: "Not found" }); return; }

  const [owned] = await db
    .select()
    .from(catalogPurchasesTable)
    .where(and(eq(catalogPurchasesTable.itemId, id), eq(catalogPurchasesTable.userId, user.id)));
  if (!owned) {
    res.status(403).json({ error: "Bu öğeye sahip değilsin" });
    return;
  }

  const [item] = await db.select().from(catalogItemsTable).where(eq(catalogItemsTable.id, id));
  if (!item) { res.status(404).json({ error: "Item not found" }); return; }

  const [updatedUser] = await db
    .update(usersTable)
    .set({ avatarItemId: item.id, avatarUrl: item.imageUrl })
    .where(eq(usersTable.id, user.id))
    .returning();

  res.json({ user: safeUser(updatedUser ?? user) });
});

export default router;
