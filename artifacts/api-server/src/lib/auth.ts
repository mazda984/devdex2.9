import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db, sessionsTable, usersTable } from "@workspace/db";
import { eq, lt } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";

const SESSION_COOKIE = "devdex_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateSessionId(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function createSession(userId: number, res: Response): Promise<string> {
  const sessionId = generateSessionId();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.insert(sessionsTable).values({
    id: sessionId,
    userId: String(userId),
    expiresAt,
  });

  const isProd = process.env.NODE_ENV === "production";

  res.cookie(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    expires: expiresAt,
    path: "/",
  });

  return sessionId;
}

export async function destroySession(sessionId: string, res: Response): Promise<void> {
  await db.delete(sessionsTable).where(eq(sessionsTable.id, sessionId));
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

export async function getSessionUser(sessionId: string) {
  const now = new Date();
  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, sessionId));

  if (!session || session.expiresAt < now) {
    if (session) {
      await db.delete(sessionsTable).where(eq(sessionsTable.id, sessionId));
    }
    return null;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, parseInt(session.userId, 10)));

  return user ?? null;
}

export function getSessionId(req: Request): string | null {
  const cookies = req.cookies as Record<string, string>;
  return cookies?.[SESSION_COOKIE] ?? null;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
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

  (req as Request & { user: typeof user }).user = user;
  next();
}

// Clean up expired sessions periodically
async function cleanExpiredSessions(): Promise<void> {
  try {
    await db.delete(sessionsTable).where(lt(sessionsTable.expiresAt, new Date()));
  } catch {
    // ignore
  }
}

setInterval(() => { cleanExpiredSessions(); }, 60 * 60 * 1000); // every hour
