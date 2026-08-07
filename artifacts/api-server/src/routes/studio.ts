import { Router, type IRouter } from "express";
import { db, studioScenesTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, getSessionUser, getSessionId } from "../lib/auth";

const router: IRouter = Router();

const SLUG_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
function randomSlug(length = 18): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += SLUG_CHARS[Math.floor(Math.random() * SLUG_CHARS.length)];
  }
  return out;
}

function safeUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl,
    dexbux: user.dexbux,
    isAdmin: user.isAdmin,
    avatarItemId: user.avatarItemId,
    avatarItemType: user.avatarItemType,
    createdAt: user.createdAt.toISOString(),
  };
}

// POST /studio/scenes — publish the current scene as a new, free, public space
router.post("/studio/scenes", requireAuth, async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  const user = sessionId ? await getSessionUser(sessionId) : null;
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { objects } = req.body;
  if (!Array.isArray(objects)) {
    res.status(400).json({ error: "objects must be an array" });
    return;
  }

  let slug = randomSlug();
  for (let attempts = 0; attempts < 5; attempts++) {
    const [existing] = await db.select({ id: studioScenesTable.id }).from(studioScenesTable).where(eq(studioScenesTable.slug, slug));
    if (!existing) break;
    slug = randomSlug();
  }

  const [scene] = await db
    .insert(studioScenesTable)
    .values({ slug, authorId: user.id, data: JSON.stringify(objects) })
    .returning();

  res.status(201).json({
    slug: scene.slug,
    data: JSON.parse(scene.data),
    createdAt: scene.createdAt.toISOString(),
  });
});

// GET /studio/scenes/mine — the current user's published spaces
router.get("/studio/scenes/mine", requireAuth, async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  const user = sessionId ? await getSessionUser(sessionId) : null;
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const results = await db
    .select()
    .from(studioScenesTable)
    .where(eq(studioScenesTable.authorId, user.id))
    .orderBy(desc(studioScenesTable.createdAt));

  res.json(
    results.map((s) => ({
      slug: s.slug,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
  );
});

// GET /studio/scenes/:slug — public, view/play a published space
router.get("/studio/scenes/:slug", async (req, res): Promise<void> => {
  const [scene] = await db
    .select()
    .from(studioScenesTable)
    .innerJoin(usersTable, eq(studioScenesTable.authorId, usersTable.id))
    .where(eq(studioScenesTable.slug, req.params.slug));

  if (!scene) { res.status(404).json({ error: "Not found" }); return; }

  res.json({
    slug: scene.studio_scenes.slug,
    data: JSON.parse(scene.studio_scenes.data),
    author: safeUser(scene.users),
    createdAt: scene.studio_scenes.createdAt.toISOString(),
  });
});

export default router;
