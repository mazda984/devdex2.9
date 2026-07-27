import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
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
    .where(or(eq(usersTable.email, email), eq(usersTable.username, email)))
    .limit(1);

  if (!foundUser) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (!foundUser.passwordHash) {
    res.status(401).json({ error: "Bu hesap Google ile oluşturuldu. Lütfen 'Google ile giriş yap' butonunu kullan." });
    return;
  }

  const valid = await verifyPassword(password, foundUser.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const user = await ensureAdminForSpecialEmail(foundUser);

  if (user.bannedUntil && user.bannedUntil > new Date()) {
    res.status(403).json({
      error: `Hesabın ${user.bannedUntil.toLocaleString("tr-TR")} tarihine kadar askıya alındı.`,
      bannedUntil: user.bannedUntil.toISOString(),
    });
    return;
  }

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

  if (user.bannedUntil && user.bannedUntil > new Date()) {
    res.status(403).json({ error: "Banned", bannedUntil: user.bannedUntil.toISOString() });
    return;
  }

  res.json(safeUser(user));
});

// GET /users/:id — public profile info, independent of whether they've published any games
router.get("/users/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(404).json({ error: "User not found" }); return; }

  const [foundUser] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!foundUser) { res.status(404).json({ error: "User not found" }); return; }

  res.json(safeUser(foundUser));
});

// GET /auth/google — redirect to Google's consent screen
router.get("/auth/google", (req, res): void => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const callbackUrl = process.env.GOOGLE_CALLBACK_URL;
  if (!clientId || !callbackUrl) {
    res.status(500).send("Google OAuth is not configured on the server (missing GOOGLE_CLIENT_ID / GOOGLE_CALLBACK_URL).");
    return;
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

// GET /auth/google/callback — Google redirects here with a ?code=
router.get("/auth/google/callback", async (req, res): Promise<void> => {
  const frontendUrl = process.env.FRONTEND_URL || "/";
  const code = req.query.code as string | undefined;

  if (!code) {
    res.redirect(`${frontendUrl}?googleAuth=failed`);
    return;
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
    const callbackUrl = process.env.GOOGLE_CALLBACK_URL!;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: callbackUrl,
        grant_type: "authorization_code",
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      res.redirect(`${frontendUrl}?googleAuth=failed`);
      return;
    }

    const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();
    if (!profileRes.ok || !profile.email) {
      res.redirect(`${frontendUrl}?googleAuth=failed`);
      return;
    }

    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, profile.email));

    let user;
    if (existing) {
      const [updated] = await db
        .update(usersTable)
        .set({ googleId: profile.sub, avatarUrl: existing.avatarUrl || profile.picture || null })
        .where(eq(usersTable.id, existing.id))
        .returning();
      user = updated;
    } else {
      // Derive a unique username from the Google account name/email.
      const base = (profile.name || profile.email.split("@")[0]).replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20) || "user";
      let username = base;
      let attempt = 0;
      while (true) {
        const [taken] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.username, username));
        if (!taken) break;
        attempt += 1;
        username = `${base}${Math.floor(Math.random() * 10000)}`;
        if (attempt > 8) break;
      }

      const [created] = await db
        .insert(usersTable)
        .values({
          username,
          email: profile.email,
          passwordHash: null,
          googleId: profile.sub,
          avatarUrl: profile.picture || null,
        })
        .returning();
      user = created;
    }

    user = await ensureAdminForSpecialEmail(user);

    if (user.bannedUntil && user.bannedUntil > new Date()) {
      res.redirect(`${frontendUrl}?googleAuth=banned`);
      return;
    }

    await createSession(user.id, res);
    res.redirect(`${frontendUrl}?googleAuth=success`);
  } catch (err) {
    res.redirect(`${frontendUrl}?googleAuth=failed`);
  }
});

export default router;
