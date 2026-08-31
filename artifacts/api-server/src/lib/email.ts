import nodemailer from "nodemailer";
import { logger } from "./logger";

// Sends real emails via SMTP (configure with SMTP_HOST / SMTP_PORT / SMTP_USER /
// SMTP_PASS / SMTP_FROM env vars - e.g. a Gmail account with an "App Password").
// If SMTP isn't configured, we log the email instead of crashing, so local dev
// without SMTP set up still "works" (you just read the link from the server logs).
let transporter: nodemailer.Transporter | null | undefined;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter !== undefined) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    transporter = null;
    return transporter;
  }

  const port = Number(SMTP_PORT) || 587;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const t = getTransporter();
  if (!t) {
    logger.warn(`[email] SMTP not configured - not sending. Would have sent to ${to}: "${subject}"`);
    logger.warn(html);
    return;
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  await t.sendMail({ from, to, subject, html });
}
