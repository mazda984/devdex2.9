import { Router, type IRouter } from "express";
import { db, usersTable, passwordResetTokensTable } from "@workspace/db";
import { eq, or, and, isNull, gt } from "drizzle-orm";
import crypto from "crypto";
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
import { sendEmail } from "../lib/email";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function safeUser(user: {
  id: number;
  username: string;
  email: string;
  avatarUrl: string | null;
  dexbux: number;
  isAdmin: boolean;
  avatarItemId: number | null;
  avatarItemType: string;
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
    avatarItemType: user.avatarItemType,
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
  const id = parseInt(String(req.params.id), 10);
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
    const tokenData = (await tokenRes.json()) as { access_token?: string };
    if (!tokenRes.ok || !tokenData.access_token) {
      res.redirect(`${frontendUrl}?googleAuth=failed`);
      return;
    }

    const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = (await profileRes.json()) as {
      email?: string;
      sub?: string;
      name?: string;
      picture?: string;
    };
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

// --------------------------------------------------------------------------
// Secure, email-verified password reset.
//
// Previously (see the now-removed /api/system/reset-password and
// /api/system/emergency-login), anyone could reset one of these accounts'
// password - or even log into it directly - just by typing its email, with
// NO verification at all. That's exactly how these accounts kept getting
// stolen. This replaces it with a real flow: a random, single-use, 30-minute
// token is emailed to the account's actual registered address, and only
// someone who can read that inbox can complete the reset.
//
// Restricted (for now) to these two accounts only - not a general "forgot
// password" feature for all users yet.
// --------------------------------------------------------------------------
const RESETTABLE_EMAILS = ["superkidsupki@gmail.com", "cretcod@gmail.com"];
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

// POST /auth/forgot-password — { email }. Always responds the same way
// regardless of whether the email is eligible/registered, so this endpoint
// can't be used to check which emails exist or are reset-eligible.
router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const email = (req.body?.email as string | undefined)?.trim().toLowerCase();
  const genericResponse = () => {
    res.json({
      success: true,
      message: "Bu email adresine kayıtlı ve sıfırlama için uygun bir hesap varsa, bir doğrulama emaili gönderildi.",
    });
  };

  if (!email || !RESETTABLE_EMAILS.includes(email)) {
    genericResponse();
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) {
    genericResponse();
    return;
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  await db.insert(passwordResetTokensTable).values({
    userId: user.id,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  });

  const frontendUrl = (process.env.FRONTEND_URL || "https://mazda984.github.io/devdex2.9").replace(/\/$/, "");
  const resetLink = `${frontendUrl}/reset-password?token=${rawToken}`;

  try {
    await sendEmail(
      user.email,
      "Devdex şifre sıfırlama isteği",
      `<div style="font-family: sans-serif; max-width: 480px;">
        <h2>Şifre sıfırlama isteği</h2>
        <p>Devdex hesabın için bir şifre sıfırlama isteği alındı. Bu sen değilsen bu emaili görmezden gelebilirsin - hiçbir şey değişmeyecek.</p>
        <p>Şifreni sıfırlamak için aşağıdaki bağlantıya tıkla (30 dakika geçerli):</p>
        <p><a href="${resetLink}" style="display:inline-block;padding:10px 20px;background:#111;color:#fff;border-radius:8px;text-decoration:none;">Şifremi sıfırla</a></p>
        <p style="color:#666;font-size:12px;">Bağlantı çalışmazsa: ${resetLink}</p>
      </div>`,
    );
  } catch (err) {
    logger?.error?.({ err }, "Failed to send password reset email");
  }

  genericResponse();
});

// GET /auth/reset-password/verify?token=... — checks whether a reset token is
// still valid (exists, unused, not expired) WITHOUT consuming it, so the
// frontend can decide whether to show the "set new password" form.
router.get("/auth/reset-password/verify", async (req, res): Promise<void> => {
  const token = req.query.token as string | undefined;
  if (!token) {
    res.status(400).json({ valid: false });
    return;
  }

  const [row] = await db
    .select()
    .from(passwordResetTokensTable)
    .where(
      and(
        eq(passwordResetTokensTable.tokenHash, hashToken(token)),
        isNull(passwordResetTokensTable.usedAt),
        gt(passwordResetTokensTable.expiresAt, new Date()),
      ),
    );

  res.json({ valid: !!row });
});

// POST /auth/reset-password — { token, newPassword }. Consumes the token
// (single-use) and updates the password.
router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const token = req.body?.token as string | undefined;
  const newPassword = req.body?.newPassword as string | undefined;

  if (!token) {
    res.status(400).json({ error: "Geçersiz bağlantı." });
    return;
  }
  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ error: "Şifre en az 6 karakter olmalı." });
    return;
  }

  const [row] = await db
    .select()
    .from(passwordResetTokensTable)
    .where(
      and(
        eq(passwordResetTokensTable.tokenHash, hashToken(token)),
        isNull(passwordResetTokensTable.usedAt),
        gt(passwordResetTokensTable.expiresAt, new Date()),
      ),
    );

  if (!row) {
    res.status(400).json({ error: "Bu bağlantının süresi dolmuş ya da zaten kullanılmış. Yeniden sıfırlama isteği gönder." });
    return;
  }

  const passwordHash = await hashPassword(newPassword);
  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, row.userId));
  await db
    .update(passwordResetTokensTable)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokensTable.id, row.id));

  res.json({ success: true });
});

export default router;
