import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

// Real, single-use, expiring tokens for the email-verified password reset flow
// (see routes/auth.ts: POST /auth/forgot-password, POST /auth/reset-password).
// We only ever store a HASH of the token (sha256), never the raw value - so
// even a full database leak can't be used to reset anyone's password, since
// the raw token (the only thing that actually works) only ever lived in the
// one-time email we sent.
export const passwordResetTokensTable = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
