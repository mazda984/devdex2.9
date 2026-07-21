import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  RegisterBody,
  LoginBody,
} from "@workspace/api-zod";
import {
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  getSessionId,
  getSessionUser,
  ensureAdminForSpecialEmail,
} from "../lib/auth";

const router: IRouter = Router();

function safeUser(user: {
  id: number;
  username: string;
  email: string;
  avatarUrl: string | null;
  dexbux: number;
  isAdmin: boolean;
  avatarItemId: number | null;
  createdAt: Date;
}) {
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

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, email, password } = parsed.data;

  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (existing) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }

  const [existingUsername] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username))
    .limit(1);

  if (existingUsername) {
    res.status(409).json({ error: "Username already taken" });
    return;
  }

  const passwordHash = await hashPassword(password);

  const [createdUser] = await db
    .insert(usersTable)
    .values({ username, email, passwordHash })
    .returning();

  const user = await ensureAdminForSpecialEmail(createdUser);

  await createSession(user.id, res);

  res.status(201).json({ user: safeUser(user) });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;

  const [foundUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (!foundUser) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await verifyPassword(password, foundUser.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const user = await ensureAdminForSpecialEmail(foundUser);

  await createSession(user.id, res);

  res.json({ user: safeUser(user) });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (sessionId) {
    await destroySession(sessionId, res);
  }
  res.json({ success: true });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const user = await getSessionUser(sessionId);
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  res.json(safeUser(user));
});

export default router;
