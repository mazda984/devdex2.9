import { Router, type IRouter } from "express";
import { db, friendshipsTable, messagesTable, usersTable, gamesTable } from "@workspace/db";
import { eq, and, or, desc, inArray } from "drizzle-orm";
import { requireAuth, getSessionUser, getSessionId } from "../lib/auth";

const router: IRouter = Router();

// A friend only shows as "online / playing" if their last heartbeat (see
// POST /presence/heartbeat below) is more recent than this. The game overlay
// pings every ~20s while open, so 45s comfortably covers normal network jitter
// while still going stale quickly if the tab is closed/crashes.
const ONLINE_THRESHOLD_MS = 45_000;

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

async function areFriends(userA: number, userB: number): Promise<boolean> {
  const [row] = await db
    .select()
    .from(friendshipsTable)
    .where(
      and(
        eq(friendshipsTable.status, "accepted"),
        or(
          and(eq(friendshipsTable.requesterId, userA), eq(friendshipsTable.addresseeId, userB)),
          and(eq(friendshipsTable.requesterId, userB), eq(friendshipsTable.addresseeId, userA)),
        ),
      ),
    );
  return !!row;
}

// GET /friends/status/:userId — relationship between me and :userId
router.get("/friends/status/:userId", requireAuth, async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  const me = sessionId ? await getSessionUser(sessionId) : null;
  if (!me) { res.status(401).json({ error: "Unauthorized" }); return; }

  const otherId = parseInt(String(req.params.userId), 10);
  if (isNaN(otherId)) { res.status(404).json({ error: "Not found" }); return; }

  if (otherId === me.id) { res.json({ status: "self" }); return; }

  const [row] = await db
    .select()
    .from(friendshipsTable)
    .where(
      or(
        and(eq(friendshipsTable.requesterId, me.id), eq(friendshipsTable.addresseeId, otherId)),
        and(eq(friendshipsTable.requesterId, otherId), eq(friendshipsTable.addresseeId, me.id)),
      ),
    );

  if (!row) { res.json({ status: "none" }); return; }
  if (row.status === "accepted") { res.json({ status: "friends", friendshipId: row.id }); return; }
  if (row.status === "pending" && row.requesterId === me.id) { res.json({ status: "pending_sent", friendshipId: row.id }); return; }
  if (row.status === "pending" && row.addresseeId === me.id) { res.json({ status: "pending_received", friendshipId: row.id }); return; }
  res.json({ status: "none" });
});

// POST /friends/request — send a friend request
router.post("/friends/request", requireAuth, async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  const me = sessionId ? await getSessionUser(sessionId) : null;
  if (!me) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { userId } = req.body as { userId?: number };
  if (typeof userId !== "number" || userId === me.id) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!target) { res.status(404).json({ error: "User not found" }); return; }

  const [existing] = await db
    .select()
    .from(friendshipsTable)
    .where(
      or(
        and(eq(friendshipsTable.requesterId, me.id), eq(friendshipsTable.addresseeId, userId)),
        and(eq(friendshipsTable.requesterId, userId), eq(friendshipsTable.addresseeId, me.id)),
      ),
    );
  if (existing) {
    res.status(409).json({ error: "Zaten bir istek/arkadaşlık var" });
    return;
  }

  const [friendship] = await db
    .insert(friendshipsTable)
    .values({ requesterId: me.id, addresseeId: userId, status: "pending" })
    .returning();

  res.status(201).json({ id: friendship.id, status: "pending_sent" });
});

// GET /friends/requests — incoming pending requests
router.get("/friends/requests", requireAuth, async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  const me = sessionId ? await getSessionUser(sessionId) : null;
  if (!me) { res.status(401).json({ error: "Unauthorized" }); return; }

  const results = await db
    .select()
    .from(friendshipsTable)
    .innerJoin(usersTable, eq(friendshipsTable.requesterId, usersTable.id))
    .where(and(eq(friendshipsTable.addresseeId, me.id), eq(friendshipsTable.status, "pending")))
    .orderBy(desc(friendshipsTable.createdAt));

  res.json(
    results.map((r: any) => ({
      friendshipId: r.friendships.id,
      from: safeUser(r.users),
      createdAt: r.friendships.createdAt.toISOString(),
    })),
  );
});

// POST /friends/:id/accept
router.post("/friends/:id/accept", requireAuth, async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  const me = sessionId ? await getSessionUser(sessionId) : null;
  if (!me) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(String(req.params.id), 10);
  const [friendship] = await db.select().from(friendshipsTable).where(eq(friendshipsTable.id, id));
  if (!friendship || friendship.addresseeId !== me.id) { res.status(404).json({ error: "Not found" }); return; }

  const [updated] = await db
    .update(friendshipsTable)
    .set({ status: "accepted", respondedAt: new Date() })
    .where(eq(friendshipsTable.id, id))
    .returning();

  res.json({ id: updated.id, status: "friends" });
});

// POST /friends/:id/decline
router.post("/friends/:id/decline", requireAuth, async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  const me = sessionId ? await getSessionUser(sessionId) : null;
  if (!me) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(String(req.params.id), 10);
  const [friendship] = await db.select().from(friendshipsTable).where(eq(friendshipsTable.id, id));
  if (!friendship || friendship.addresseeId !== me.id) { res.status(404).json({ error: "Not found" }); return; }

  await db.delete(friendshipsTable).where(eq(friendshipsTable.id, id));
  res.json({ success: true });
});

// DELETE /friends/:id — unfriend (or cancel a sent request)
router.delete("/friends/:id", requireAuth, async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  const me = sessionId ? await getSessionUser(sessionId) : null;
  if (!me) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(String(req.params.id), 10);
  const [friendship] = await db.select().from(friendshipsTable).where(eq(friendshipsTable.id, id));
  if (!friendship || (friendship.requesterId !== me.id && friendship.addresseeId !== me.id)) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  await db.delete(friendshipsTable).where(eq(friendshipsTable.id, id));
  res.json({ success: true });
});

// GET /friends/mine — my accepted friends, with "now playing" presence info
// so the Home page can show a Join button for friends currently in a game.
router.get("/friends/mine", requireAuth, async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  const me = sessionId ? await getSessionUser(sessionId) : null;
  if (!me) { res.status(401).json({ error: "Unauthorized" }); return; }

  const results = await db
    .select()
    .from(friendshipsTable)
    .where(
      and(
        eq(friendshipsTable.status, "accepted"),
        or(eq(friendshipsTable.requesterId, me.id), eq(friendshipsTable.addresseeId, me.id)),
      ),
    );

  const friendIds = results.map((r: any) => (r.requesterId === me.id ? r.addresseeId : r.requesterId));
  if (friendIds.length === 0) { res.json([]); return; }

  const friends = await db.select().from(usersTable);
  const friendSet = new Set(friendIds);
  const friendUsers = friends.filter((u: any) => friendSet.has(u.id));

  const gameIds = [...new Set(friendUsers.map((u: any) => u.currentGameId).filter((id: any): id is number => !!id))];
  const games = gameIds.length > 0
    ? await db.select().from(gamesTable).where(inArray(gamesTable.id, gameIds as number[]))
    : [];
  const gameById = new Map<number, typeof gamesTable.$inferSelect>(games.map((g: any) => [g.id, g]));

  const now = Date.now();
  res.json(
    friendUsers.map((u: any) => {
      const isRecentlyActive = u.currentActivityAt && now - new Date(u.currentActivityAt).getTime() < ONLINE_THRESHOLD_MS;
      const game = isRecentlyActive && u.currentGameId ? gameById.get(u.currentGameId) : null;
      return {
        ...safeUser(u),
        online: !!isRecentlyActive,
        currentGameId: game ? game.id : null,
        currentGameTitle: game ? game.title : null,
      };
    }),
  );
});

// POST /presence/heartbeat — "I'm currently playing game :gameId". Called every
// ~20s from the game overlay while it's open (see GameDetail.tsx).
router.post("/presence/heartbeat", requireAuth, async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  const me = sessionId ? await getSessionUser(sessionId) : null;
  if (!me) { res.status(401).json({ error: "Unauthorized" }); return; }

  const gameId = parseInt(String(req.body?.gameId), 10);
  if (!Number.isInteger(gameId)) { res.status(400).json({ error: "gameId is required" }); return; }

  await db
    .update(usersTable)
    .set({ currentGameId: gameId, currentActivityAt: new Date() })
    .where(eq(usersTable.id, me.id));
  res.json({ ok: true });
});

// POST /presence/stop — called when the game overlay closes, so friends stop
// seeing you as "playing" immediately instead of waiting for the heartbeat
// to go stale.
router.post("/presence/stop", requireAuth, async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  const me = sessionId ? await getSessionUser(sessionId) : null;
  if (!me) { res.status(401).json({ error: "Unauthorized" }); return; }

  await db
    .update(usersTable)
    .set({ currentGameId: null, currentActivityAt: null })
    .where(eq(usersTable.id, me.id));
  res.json({ ok: true });
});

// GET /messages/:userId — conversation with a friend
router.get("/messages/:userId", requireAuth, async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  const me = sessionId ? await getSessionUser(sessionId) : null;
  if (!me) { res.status(401).json({ error: "Unauthorized" }); return; }

  const otherId = parseInt(String(req.params.userId), 10);
  if (isNaN(otherId)) { res.status(404).json({ error: "Not found" }); return; }

  if (!(await areFriends(me.id, otherId))) {
    res.status(403).json({ error: "Sadece arkadaşlarınla mesajlaşabilirsin" });
    return;
  }

  const results = await db
    .select()
    .from(messagesTable)
    .where(
      or(
        and(eq(messagesTable.senderId, me.id), eq(messagesTable.receiverId, otherId)),
        and(eq(messagesTable.senderId, otherId), eq(messagesTable.receiverId, me.id)),
      ),
    )
    .orderBy(messagesTable.createdAt);

  res.json(
    results.map((m: any) => ({
      id: m.id,
      senderId: m.senderId,
      receiverId: m.receiverId,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    })),
  );
});

// POST /messages/:userId — send a message (friends only)
router.post("/messages/:userId", requireAuth, async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  const me = sessionId ? await getSessionUser(sessionId) : null;
  if (!me) { res.status(401).json({ error: "Unauthorized" }); return; }

  const otherId = parseInt(String(req.params.userId), 10);
  const { content } = req.body as { content?: string };
  if (isNaN(otherId) || !content || content.trim().length === 0) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  if (!(await areFriends(me.id, otherId))) {
    res.status(403).json({ error: "Sadece arkadaşlarınla mesajlaşabilirsin" });
    return;
  }

  const [message] = await db
    .insert(messagesTable)
    .values({ senderId: me.id, receiverId: otherId, content: content.trim() })
    .returning();

  res.status(201).json({
    id: message.id,
    senderId: message.senderId,
    receiverId: message.receiverId,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  });
});

// GET /messages — inbox: list of friends I've exchanged messages with, most recent first
router.get("/messages", requireAuth, async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  const me = sessionId ? await getSessionUser(sessionId) : null;
  if (!me) { res.status(401).json({ error: "Unauthorized" }); return; }

  const results = await db
    .select()
    .from(messagesTable)
    .where(or(eq(messagesTable.senderId, me.id), eq(messagesTable.receiverId, me.id)))
    .orderBy(desc(messagesTable.createdAt));

  const seen = new Map<number, { otherId: number; lastMessage: string; createdAt: string }>();
  for (const m of results) {
    const otherId = m.senderId === me.id ? m.receiverId : m.senderId;
    if (!seen.has(otherId)) {
      seen.set(otherId, { otherId, lastMessage: m.content, createdAt: m.createdAt.toISOString() });
    }
  }

  const otherIds = Array.from(seen.keys());
  const users = otherIds.length > 0 ? await db.select().from(usersTable) : [];
  const userMap = new Map(users.map((u: any) => [u.id, u]));

  res.json(
    Array.from(seen.values())
      .filter((c: any) => userMap.has(c.otherId))
      .map((c: any) => ({
        user: safeUser(userMap.get(c.otherId)!),
        lastMessage: c.lastMessage,
        createdAt: c.createdAt,
      })),
  );
});

export default router;
