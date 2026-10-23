import fs from "node:fs";
import path from "node:path";
import nodemailer from "nodemailer";
import { getSetting, OUTBOX_DIR } from "./db";

export type MailMessage = {
  subject: string;
  text: string;
  html: string;
};

/** Public address of this deployment, for links inside emails (no request context needed). */
export function mailBaseUrl(): string {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export type EmailButton = { label: string; href: string; tone?: "primary" | "quiet" | "danger" };

/** A row of buttons that render in Gmail (plain anchors with inline styles). */
export function emailButtons(buttons: EmailButton[]): string {
  // Karbol: the important action is orange with navy text; the rest white with a pale border.
  const styles = {
    primary: "background:#ff7048;color:#101d55;border:1px solid #ff7048",
    quiet: "background:#ffffff;color:#101d55;border:1px solid #d9e2f0",
    danger: "background:#ffffff;color:#d63232;border:1px solid #f1b4b4",
  };
  return `<p style="margin:18px 0 6px;line-height:1">${buttons
    .map(
      (b) =>
        `<a href="${escapeHtml(b.href)}" style="display:inline-block;margin:0 4px 8px 4px;padding:10px 16px;border-radius:8px;font-weight:700;text-decoration:none;font-size:14px;line-height:1.3;white-space:nowrap;${styles[b.tone ?? "quiet"]}">${escapeHtml(b.label)}</a>`,
    )
    .join("")}</p>`;
}

/** Shared wrapper for every email the tool sends. Direction follows the content (see textDirection). */
export function emailShell(
  inner: string,
  options: { dir?: "rtl" | "ltr"; footer?: string } = {},
): string {
  const dir = options.dir ?? "rtl";
  const align = dir === "rtl" ? "right" : "left";
  const footer = options.footer ?? "נשלח מכָּרבוֹל. הכפתורים עובדים בלי התחברות, פעם אחת, ל־30 יום.";
  // Gmail shows the message in a left-to-right page. A full-width outer block with the
  // text direction, and an inline-block inside it, keeps a Hebrew email hugging the
  // right edge instead of floating on the left with right-aligned text.
  return `<div dir="${dir}" lang="${dir === "rtl" ? "he" : "en"}" style="width:100%;text-align:${align};background:#f2f6fc;padding:16px 0">
<div style="display:inline-block;width:100%;max-width:640px;text-align:${align};font-family:Heebo,Arial,sans-serif;color:#101d55;line-height:1.55;font-size:16px">
<div dir="rtl" style="text-align:right;margin:0 0 14px"><img src="${mailBaseUrl()}/brand/logo-480.png" alt="כָּרבוֹל" width="150" style="height:auto;border:0"></div>
<div style="background:#ffffff;border:1px solid #d9e2f0;border-radius:12px;padding:20px 22px">
${inner}
</div>
<p dir="rtl" style="margin:14px 0 0;font-size:12px;color:#53617c;text-align:right">${escapeHtml(footer)}</p>
</div>
</div>`;
}

/** Plain-text version of a button row, for the text part of the email. */
export function textButtons(buttons: EmailButton[]): string {
  return buttons.map((b) => `${b.label}: ${b.href}`).join("\n");
}

export function parseAddresses(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[,;\n]+/)
    .map((part) => part.trim())
    .filter((part) => part.includes("@"));
}

export function alertRecipients(): string[] {
  const fromSettings = parseAddresses(getSetting("alert_emails"));
  if (fromSettings.length > 0) return fromSettings;
  return parseAddresses(process.env.ALERT_TO_EMAIL);
}

export const DEFAULT_SENDER_NAME = "כָּרבוֹל";

/** The display name shown in the inbox. Set in Settings; the address itself stays in .env. */
export function senderName(): string {
  return (getSetting("sender_name") || "").trim() || DEFAULT_SENDER_NAME;
}

/** The bare address from ALERT_FROM_EMAIL, with or without a "Name <...>" wrapper. */
export function senderAddress(): string {
  const raw = process.env.ALERT_FROM_EMAIL?.trim() || "renewal@localhost";
  const match = raw.match(/<([^>]+)>/);
  return (match ? match[1] : raw).trim();
}

function fromAddress(): string {
  // Quote the name so Hebrew and punctuation survive every mail client.
  const name = senderName().replaceAll('"', "'");
  return `"${name}" <${senderAddress()}>`;
}

// Direction follows the content: an item named in English reads left-to-right.
const HEBREW = /[֐-׿]/;
const LATIN = /[A-Za-z]/;

/** "rtl" when the sample has Hebrew letters or no Latin letters at all; "ltr" otherwise. */
export function textDirection(sample: string): "rtl" | "ltr" {
  if (HEBREW.test(sample)) return "rtl";
  if (LATIN.test(sample)) return "ltr";
  return "rtl";
}

/** Wraps a value in Unicode isolates so it keeps its own direction inside a subject line. */
export function isolate(value: string): string {
  return `⁨${value}⁩`;
}

/** One line of content that decides its own direction (item names, subjects, providers). */
export function autoLine(text: string, style = "margin:0 0 4px"): string {
  return `<div dir="auto" style="${style}">${escapeHtml(text)}</div>`;
}

async function sendResend(to: string[], message: MailMessage) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress(),
      to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend failed: ${res.status} ${body}`);
  }
  return true;
}

async function sendSmtp(to: string[], message: MailMessage) {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) return false;
  const port = Number(process.env.SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 12_000,
  });
  await transporter.sendMail({
    from: fromAddress(),
    to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
  return true;
}

function writeOutbox(to: string[], message: MailMessage) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(OUTBOX_DIR, `${stamp}.txt`);
  const body = [
    `To: ${to.join(", ") || "(no recipients configured)"}`,
    `Subject: ${message.subject}`,
    "",
    message.text,
  ].join("\n");
  fs.writeFileSync(file, body, "utf8");
}

export async function sendAlertMail(message: MailMessage): Promise<"email" | "outbox"> {
  const to = alertRecipients();
  if (to.length > 0) {
    if (await sendResend(to, message)) return "email";
    if (await sendSmtp(to, message)) return "email";
  }
  writeOutbox(to, message);
  return "outbox";
}

/** Same path as reminders: Resend, then SMTP, then the outbox folder. */
export const sendMail = sendAlertMail;

export function mailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST);
}
