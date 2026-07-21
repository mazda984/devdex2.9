import { Router, type IRouter } from "express";
import { db, usersTable, gamesTable, groupsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "../lib/auth";

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

  await db.delete(gamesTable).where(eq(gamesTable.id, id));
  res.json({ success: true });
});

// DELETE /admin/groups/:id — admin override, delete any group regardless of owner
router.delete("/admin/groups/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(404).json({ error: "Not found" }); return; }

  await db.delete(groupsTable).where(eq(groupsTable.id, id));
  res.json({ success: true });
});

export default router;
