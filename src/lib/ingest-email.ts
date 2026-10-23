import { randomUUID } from "node:crypto";
import { simpleParser } from "mailparser";
import { extractWithAi } from "./ai-extract";
import { NOTICE_DEFAULTS } from "./categories";
import { getSetting } from "./db";
import { extractAmount, guessName, pickRenewalDate, renewalSignals } from "./extract-renewal";
import { createItemRecord, getItem, patchItemRenewal } from "./items";
import { matchExistingItem } from "./match-item";
import { attachProposalFiles, getProposalByGmailId, insertProposal, saveInboxFile } from "./proposals";
import type { IngestOutcome } from "./receipts";
import type { ProposalFile } from "./types";

// Turns one forwarded email (raw MIME) into an item update, a new item, or a draft.
// Everything that reaches here was sent to the tool's own address on purpose, so it is
// never ignored: at worst it becomes a draft in טיוטות.

export type IngestResult = {
  scannedAt: string;
  looked: number;
  created: number;
  applied: number;
  already: number;
  ignored: number;
  error?: string;
};

export function emptyResult(): IngestResult {
  return { scannedAt: new Date().toISOString(), looked: 0, created: 0, applied: 0, already: 0, ignored: 0 };
}

export function autoApplyEnabled() {
  return getSetting("auto_apply") !== "0";
}

async function pdfText(buffer: Buffer): Promise<string> {
  try {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const result = await extractText(pdf, { mergePages: true });
    return Array.isArray(result.text) ? result.text.join("\n") : String(result.text ?? "");
  } catch {
    return "";
  }
}

function stripHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isPdf(mime: string, name: string) {
  return /pdf/i.test(mime) || name.toLowerCase().endsWith(".pdf");
}

/** Returns what became of the email, so the caller can send a receipt. */
export async function ingestRawEmail(source: Buffer, fallbackId: string, result: IngestResult): Promise<IngestOutcome> {
  const parsed = await simpleParser(source);
  const messageId = parsed.messageId || fallbackId;
  const seen = getProposalByGmailId(messageId);
  if (seen) {
    result.already += 1;
    return { kind: "duplicate", proposal: seen };
  }

  const subject = parsed.subject || "";
  const from = parsed.from?.value?.[0];
  const fromEmail = from?.address || null;
  const fromName = from?.name || null;
  const body = [parsed.text, parsed.html ? stripHtml(parsed.html) : ""].filter(Boolean).join("\n");
  const attachments = (parsed.attachments ?? []).filter((part) => {
    const mime = part.contentType || "";
    return isPdf(mime, part.filename || "") || /^image\//.test(mime);
  });

  let pdfTextBlob = "";
  for (const part of attachments) {
    if (isPdf(part.contentType || "", part.filename || "")) {
      pdfTextBlob += `\n${await pdfText(part.content)}`;
    }
  }

  const blob = `${subject}\n${fromName ?? ""} ${fromEmail ?? ""}\n${body}\n${pdfTextBlob}`;
  const hasPdf = attachments.some((part) => isPdf(part.contentType || "", part.filename || ""));
  const signals = renewalSignals(blob, hasPdf);

  const ai = await extractWithAi({
    subject,
    from: `${fromName ?? ""} <${fromEmail ?? ""}>`,
    body,
    pdfText: pdfTextBlob,
    forwarded: true,
  });

  const category = ai?.category ?? signals.category;
  const provider =
    ai?.provider ||
    signals.provider ||
    (fromName && !/gmail|google|mailer|noreply|no-reply/i.test(fromName) ? fromName : null);
  const name = ai?.name || guessName(subject, provider, category);
  const renewalDate = ai?.renewal_date || pickRenewalDate(blob, parsed.date?.toISOString());
  const amount = ai?.amount ?? extractAmount(blob);
  const currency = ai?.currency || "ILS";
  const matched = matchExistingItem({ name, provider });

  const id = randomUUID();
  const files: ProposalFile[] = [];
  for (const part of attachments.slice(0, 5)) {
    if (part.content.length > 10 * 1024 * 1024) continue;
    files.push(
      saveInboxFile(id, {
        name: part.filename || "attachment",
        mime: part.contentType || "application/octet-stream",
        buffer: Buffer.isBuffer(part.content) ? part.content : Buffer.from(part.content),
      }),
    );
  }

  const notes = ai?.notes || "עודכן מהמייל.";
  const base = {
    id,
    gmailId: messageId,
    source: "forward" as const,
    fromEmail,
    fromName,
    subject,
    snippet: body.slice(0, 280),
    receivedAt: parsed.date?.toISOString() || null,
    name,
    category,
    provider,
    renewalDate,
    amount,
    currency,
    notes,
    files,
  };

  const canApply = autoApplyEnabled() && Boolean(name && renewalDate);

  if (canApply && matched) {
    const previous = {
      renewal_date: matched.renewal_date,
      amount: matched.amount,
      currency: matched.currency,
      provider: matched.provider,
      notes: matched.notes,
    };
    patchItemRenewal(matched.id, { renewal_date: renewalDate, amount, currency, provider, notes });
    const row = insertProposal({ ...base, verdict: "exists", matchedItemId: matched.id, status: "added" });
    await attachProposalFiles(row, matched.id);
    result.applied += 1;
    return { kind: "updated", item: getItem(matched.id) ?? matched, previous, proposal: row };
  }

  if (canApply) {
    const item = createItemRecord({
      name,
      category,
      provider,
      renewal_date: renewalDate!,
      cadence: "yearly",
      cadence_months: null,
      auto_renew: false,
      amount,
      currency,
      notice_days: NOTICE_DEFAULTS[category],
      notes,
    });
    const row = insertProposal({ ...base, verdict: "add", matchedItemId: item.id, status: "added" });
    await attachProposalFiles(row, item.id);
    result.applied += 1;
    return { kind: "added", item, proposal: row };
  }

  // Unsure (no name or no date): leave it for a human in טיוטות.
  const row = insertProposal({ ...base, verdict: matched ? "exists" : "add", matchedItemId: matched?.id ?? null });
  result.created += 1;
  const reason = !autoApplyEnabled()
    ? "ההוספה האוטומטית כבויה בהגדרות"
    : !name && !renewalDate
      ? "לא נמצאו שם ותאריך חידוש"
      : !name
        ? "לא נמצא שם למנוי"
        : "לא נמצא תאריך חידוש";
  return { kind: "draft", proposal: row, reason, matched };
}
