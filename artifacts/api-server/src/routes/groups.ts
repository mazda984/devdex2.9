import { Router, type IRouter } from "express";
import { db, groupsTable, groupMembersTable, groupPostsTable, usersTable } from "@workspace/db";
import { eq, desc, sql, and } from "drizzle-orm";
import { requireAuth, getSessionUser, getSessionId } from "../lib/auth";
import { uniqueSlug } from "../lib/slugify";

const GROUP_CREATION_COST = 3;

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

function formatGroup(
  group: typeof groupsTable.$inferSelect,
  author: typeof usersTable.$inferSelect,
) {
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    slug: group.slug,
    coverImageUrl: group.coverImageUrl,
    isPublic: group.isPublic,
    authorId: group.authorId,
    memberCount: group.memberCount,
    author: safeUser(author),
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString(),
  };
}

// GET /groups
router.get("/groups", async (req, res): Promise<void> => {
  const limit = Math.min(parseInt(String(req.query.limit ?? "20")), 100);
  const offset = parseInt(String(req.query.offset ?? "0"));

  const [results, countResult] = await Promise.all([
    db
      .select()
      .from(groupsTable)
      .innerJoin(usersTable, eq(groupsTable.authorId, usersTable.id))
      .where(eq(groupsTable.isPublic, true))
      .orderBy(desc(groupsTable.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(groupsTable).where(eq(groupsTable.isPublic, true)),
  ]);

  const groups = results.map((r) => formatGroup(r.groups, r.users));
  res.json({ groups, total: Number(countResult[0]?.count ?? 0) });
});

// POST /groups
router.post("/groups", requireAuth, async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  const user = sessionId ? await getSessionUser(sessionId) : null;
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { name, description, coverImageUrl, isPublic } = req.body;
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    res.status(400).json({ error: "Name is required" });
    return;
  }

  if (user.dexbux < GROUP_CREATION_COST) {
    res.status(402).json({ error: `Grup oluşturmak için ${GROUP_CREATION_COST} DexBux gerekiyor. Yeterli bakiyen yok.` });
    return;
  }

  const slug = await uniqueSlug(name, async (s) => {
    const existing = await db.select({ id: groupsTable.id }).from(groupsTable).where(eq(groupsTable.slug, s));
    return existing.length > 0;
  });

  const [group] = await db.insert(groupsTable).values({
    name: name.trim(),
    description: description || null,
    slug,
    coverImageUrl: coverImageUrl || null,
    isPublic: isPublic !== false,
    authorId: user.id,
    memberCount: 1,
  }).returning();

  // Add owner as member
  await db.insert(groupMembersTable).values({
    groupId: group.id,
    userId: user.id,
    role: "owner",
  });

  const [chargedUser] = await db
    .update(usersTable)
    .set({ dexbux: sql`${usersTable.dexbux} - ${GROUP_CREATION_COST}` })
    .where(eq(usersTable.id, user.id))
    .returning();

  res.status(201).json(formatGroup(group, chargedUser ?? user));
});

// GET /groups/:id
router.get("/groups/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(404).json({ error: "Not found" }); return; }

  const sessionIdForGet = getSessionId(req);
  const sessionUser = sessionIdForGet ? await getSessionUser(sessionIdForGet) : null;

  const [result] = await db
    .select()
    .from(groupsTable)
    .innerJoin(usersTable, eq(groupsTable.authorId, usersTable.id))
    .where(eq(groupsTable.id, id));

  if (!result) { res.status(404).json({ error: "Group not found" }); return; }

  const membersResult = await db
    .select()
    .from(groupMembersTable)
    .innerJoin(usersTable, eq(groupMembersTable.userId, usersTable.id))
    .where(eq(groupMembersTable.groupId, id))
    .orderBy(groupMembersTable.joinedAt);

  const members = membersResult.map((m) => ({
    id: m.group_members.id,
    userId: m.group_members.userId,
    groupId: m.group_members.groupId,
    role: m.group_members.role,
    joinedAt: m.group_members.joinedAt.toISOString(),
    user: safeUser(m.users),
  }));

  let isMember = false;
  if (sessionUser) {
    isMember = members.some((m) => m.userId === sessionUser.id);
  }

  res.json({
    ...formatGroup(result.groups, result.users),
    members,
    isMember,
  });
});

// GET /groups/:id/members
router.get("/groups/:id/members", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(404).json({ error: "Not found" }); return; }

  const membersResult = await db
    .select()
    .from(groupMembersTable)
    .innerJoin(usersTable, eq(groupMembersTable.userId, usersTable.id))
    .where(eq(groupMembersTable.groupId, id))
    .orderBy(groupMembersTable.joinedAt);

  const members = membersResult.map((m) => ({
    id: m.group_members.id,
    userId: m.group_members.userId,
    groupId: m.group_members.groupId,
    role: m.group_members.role,
    joinedAt: m.group_members.joinedAt.toISOString(),
    user: safeUser(m.users),
  }));

  res.json(members);
});

// POST /groups/:id/join
router.post("/groups/:id/join", requireAuth, async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  const user = sessionId ? await getSessionUser(sessionId) : null;
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(404).json({ error: "Not found" }); return; }

  const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, id));
  if (!group) { res.status(404).json({ error: "Group not found" }); return; }

  const [existing] = await db.select().from(groupMembersTable).where(
    and(eq(groupMembersTable.groupId, id), eq(groupMembersTable.userId, user.id))
  );
  if (existing) { res.status(409).json({ error: "Already a member" }); return; }

  await db.insert(groupMembersTable).values({ groupId: id, userId: user.id, role: "member" });
  await db.update(groupsTable).set({ memberCount: sql`${groupsTable.memberCount} + 1` }).where(eq(groupsTable.id, id));

  res.json({ success: true });
});

// POST /groups/:id/leave
router.post("/groups/:id/leave", requireAuth, async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  const user = sessionId ? await getSessionUser(sessionId) : null;
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(404).json({ error: "Not found" }); return; }

  const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, id));
  if (!group) { res.status(404).json({ error: "Group not found" }); return; }

  // Owner cannot leave (must delete group)
  if (group.authorId === user.id) {
    res.status(400).json({ error: "Group owner cannot leave. Delete the group instead." });
    return;
  }

  await db.delete(groupMembersTable).where(
    and(eq(groupMembersTable.groupId, id), eq(groupMembersTable.userId, user.id))
  );
  await db.update(groupsTable).set({ memberCount: sql`greatest(${groupsTable.memberCount} - 1, 0)` }).where(eq(groupsTable.id, id));

  res.json({ success: true });
});

// GET /users/:id/groups
router.get("/users/:id/groups", async (req, res): Promise<void> => {
  const userId = parseInt(req.params.id, 10);
  if (isNaN(userId)) { res.status(404).json({ error: "Not found" }); return; }

  const results = await db
    .select()
    .from(groupMembersTable)
    .innerJoin(groupsTable, eq(groupMembersTable.groupId, groupsTable.id))
    .innerJoin(usersTable, eq(groupsTable.authorId, usersTable.id))
    .where(eq(groupMembersTable.userId, userId))
    .orderBy(desc(groupMembersTable.joinedAt));

  const groups = results.map((r) => formatGroup(r.groups, r.users));
  res.json(groups);
});

// GET /groups/:id/posts
router.get("/groups/:id/posts", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(404).json({ error: "Not found" }); return; }

  const results = await db
    .select()
    .from(groupPostsTable)
    .innerJoin(usersTable, eq(groupPostsTable.authorId, usersTable.id))
    .where(eq(groupPostsTable.groupId, id))
    .orderBy(desc(groupPostsTable.createdAt));

  res.json(
    results.map((r) => ({
      id: r.group_posts.id,
      groupId: r.group_posts.groupId,
      authorId: r.group_posts.authorId,
      content: r.group_posts.content,
      author: safeUser(r.users),
      createdAt: r.group_posts.createdAt.toISOString(),
    })),
  );
});

// POST /groups/:id/posts — members only
router.post("/groups/:id/posts", requireAuth, async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  const user = sessionId ? await getSessionUser(sessionId) : null;
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(404).json({ error: "Not found" }); return; }

  const { content } = req.body;
  if (!content || typeof content !== "string" || content.trim().length === 0) {
    res.status(400).json({ error: "Content is required" });
    return;
  }

  const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, id));
  if (!group) { res.status(404).json({ error: "Group not found" }); return; }

  const [membership] = await db.select().from(groupMembersTable).where(
    and(eq(groupMembersTable.groupId, id), eq(groupMembersTable.userId, user.id)),
  );
  if (!membership) {
    res.status(403).json({ error: "Post atabilmek için grup üyesi olmalısın" });
    return;
  }

  const [post] = await db
    .insert(groupPostsTable)
    .values({ groupId: id, authorId: user.id, content: content.trim() })
    .returning();

  res.status(201).json({
    id: post.id,
    groupId: post.groupId,
    authorId: post.authorId,
    content: post.content,
    author: safeUser(user),
    createdAt: post.createdAt.toISOString(),
  });
});

// DELETE /groups/:id/posts/:postId — post author, group owner, or site admin
router.delete("/groups/:id/posts/:postId", requireAuth, async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  const user = sessionId ? await getSessionUser(sessionId) : null;
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const groupId = parseInt(req.params.id, 10);
  const postId = parseInt(req.params.postId, 10);
  if (isNaN(groupId) || isNaN(postId)) { res.status(404).json({ error: "Not found" }); return; }

  const [post] = await db.select().from(groupPostsTable).where(eq(groupPostsTable.id, postId));
  if (!post || post.groupId !== groupId) { res.status(404).json({ error: "Post not found" }); return; }

  const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, groupId));

  const canDelete = post.authorId === user.id || group?.authorId === user.id || user.isAdmin;
  if (!canDelete) { res.status(403).json({ error: "Forbidden" }); return; }

  await db.delete(groupPostsTable).where(eq(groupPostsTable.id, postId));
  res.json({ success: true });
});

export default router;
