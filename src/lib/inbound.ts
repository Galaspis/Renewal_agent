import { createHmac, timingSafeEqual } from "node:crypto";
import { getSetting, setSetting } from "./db";
import { logActivity } from "./activity";
import { emptyResult, ingestRawEmail, type IngestResult } from "./ingest-email";
import { sendReceipt, type IngestOutcome } from "./receipts";

// Direct inbound mail: Resend receives mail for the tool's own address and calls
// /api/inbound. We verify the signature, download the original message, and extract.

export type InboundResult = IngestResult & { from?: string; subject?: string };

export function inboundAddress(): string {
  return (getSetting("inbound_address") || process.env.INBOUND_ADDRESS || "").trim();
}

export function inboundSecret(): string {
  return (getSetting("inbound_webhook_secret") || process.env.RESEND_WEBHOOK_SECRET || "").trim();
}

export function inboundConfigured(): boolean {
  return Boolean(inboundSecret() && process.env.RESEND_API_KEY);
}

export function lastInbound(): InboundResult | null {
  const raw = getSetting("last_inbound");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as InboundResult;
  } catch {
    return null;
  }
}

/** Standard Webhooks / Svix signature check. Returns false on any mismatch. */
export function verifySignature(
  payload: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  secret = inboundSecret(),
): boolean {
  if (!secret || !headers.id || !headers.timestamp || !headers.signature) return false;
  const ts = Number(headers.timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 5 * 60) return false;

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key)
    .update(`${headers.id}.${headers.timestamp}.${payload}`)
    .digest();

  return headers.signature.split(/\s+/).some((entry) => {
    const [version, sig] = entry.split(",", 2);
    if (version !== "v1" || !sig) return false;
    const given = Buffer.from(sig, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

type ReceivedEmail = {
  id: string;
  from?: string;
  subject?: string;
  message_id?: string;
  raw?: { download_url?: string };
};

export async function processReceivedEmail(emailId: string): Promise<InboundResult> {
  const result: InboundResult = { ...emptyResult(), looked: 1 };
  let outcome: IngestOutcome | null = null;
  try {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY חסר.");

    const meta = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!meta.ok) throw new Error(`Resend ${meta.status}`);
    const email = (await meta.json()) as ReceivedEmail;
    result.from = email.from;
    result.subject = email.subject;

    const url = email.raw?.download_url;
    if (!url) throw new Error("אין קובץ מקור למייל.");
    const rawRes = await fetch(url);
    if (!rawRes.ok) throw new Error(`הורדת המייל נכשלה (${rawRes.status}).`);
    const source = Buffer.from(await rawRes.arrayBuffer());

    outcome = await ingestRawEmail(source, `resend-${emailId}`, result);
  } catch (err) {
    result.error = err instanceof Error ? err.message : "עיבוד המייל נכשל.";
    outcome = { kind: "failed", error: result.error, emailId, subject: result.subject, from: result.from };
  }
  setSetting("last_inbound", JSON.stringify(result));

  const done: IngestOutcome = outcome ?? { kind: "failed", error: "עיבוד המייל נכשל.", emailId };
  logActivity("inbound", describeOutcome(done, result), {
    itemId: "item" in done ? done.item.id : undefined,
    proposalId: "proposal" in done ? done.proposal.id : undefined,
  });
  // The receipt: tell the family what happened, with buttons to fix it.
  await sendReceipt(done);
  return result;
}

function describeOutcome(outcome: IngestOutcome, result: InboundResult): string {
  const subject = result.subject ? `״${result.subject}״` : "מייל";
  switch (outcome.kind) {
    case "added":
      return `${subject} נוסף כ־״${outcome.item.name}״`;
    case "updated":
      return `${subject} עדכן את ״${outcome.item.name}״`;
    case "draft":
      return `${subject} נשמר כטיוטה: ${outcome.reason}`;
    case "duplicate":
      return `${subject} כבר התקבל בעבר`;
    case "failed":
      return `${subject} נכשל: ${outcome.error}`;
  }
}
