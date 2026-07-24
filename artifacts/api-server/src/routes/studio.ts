import { Router, type IRouter } from "express";
import { db, studioScenesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, getSessionUser, getSessionId } from "../lib/auth";

const router: IRouter = Router();

// GET /studio/scene — the current user's saved 3D Studio scene (or null)
router.get("/studio/scene", requireAuth, async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  const user = sessionId ? await getSessionUser(sessionId) : null;
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const [scene] = await db.select().from(studioScenesTable).where(eq(studioScenesTable.userId, user.id));
  if (!scene) { res.json(null); return; }

  res.json({
    data: JSON.parse(scene.data),
    updatedAt: scene.updatedAt.toISOString(),
  });
});

// PUT /studio/scene — create or overwrite the current user's saved scene
router.put("/studio/scene", requireAuth, async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  const user = sessionId ? await getSessionUser(sessionId) : null;
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { objects } = req.body;
  if (!Array.isArray(objects)) {
    res.status(400).json({ error: "objects must be an array" });
    return;
  }

  const serialized = JSON.stringify(objects);

  const [existing] = await db.select().from(studioScenesTable).where(eq(studioScenesTable.userId, user.id));

  let scene;
  if (existing) {
    [scene] = await db
      .update(studioScenesTable)
      .set({ data: serialized })
      .where(eq(studioScenesTable.userId, user.id))
      .returning();
  } else {
    [scene] = await db.insert(studioScenesTable).values({ userId: user.id, data: serialized }).returning();
  }

  res.json({
    data: JSON.parse(scene.data),
    updatedAt: scene.updatedAt.toISOString(),
  });
});

export default router;
