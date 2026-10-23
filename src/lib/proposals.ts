import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { INBOX_DIR, queryAll, queryOne, run } from "./db";
import { isCategoryValue } from "./extract-renewal";
import { saveDocumentBuffer } from "./items";
import type { Proposal, ProposalFile, ProposalStatus, ProposalVerdict } from "./types";

export function listPendingProposals(): Proposal[] {
  return queryAll<Proposal>(
    `SELECT * FROM proposals WHERE status = 'pending' ORDER BY received_at DESC, created_at DESC`,
  );
}

export function countPendingProposals(): number {
  return queryOne<{ n: number }>("SELECT COUNT(*) AS n FROM proposals WHERE status = 'pending'")?.n ?? 0;
}

export function getProposal(id: string): Proposal | undefined {
  return queryOne<Proposal>("SELECT * FROM proposals WHERE id = ?", [id]);
}

export function getProposalByGmailId(gmailId: string): Proposal | undefined {
  return queryOne<Proposal>("SELECT * FROM proposals WHERE gmail_id = ?", [gmailId]);
}

export function proposalFiles(proposal: Proposal): ProposalFile[] {
  if (!proposal.files_json) return [];
  try {
    const parsed = JSON.parse(proposal.files_json) as ProposalFile[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setProposalStatus(id: string, status: ProposalStatus) {
  run("UPDATE proposals SET status = ? WHERE id = ?", [status, id]);
}

export function saveInboxFile(proposalId: string, file: { name: string; mime: string; buffer: Buffer }): ProposalFile {
  const dir = path.join(INBOX_DIR, proposalId);
  fs.mkdirSync(dir, { recursive: true });
  const safe = file.name.replace(/[^\w.\u0590-\u05FF-]+/g, "_").slice(0, 80) || "file";
  const stored = `${randomUUID()}-${safe}`;
  fs.writeFileSync(path.join(dir, stored), file.buffer);
  return { name: file.name, stored, mime: file.mime, size: file.buffer.length };
}

export async function attachProposalFiles(proposal: Proposal, itemId: string) {
  for (const file of proposalFiles(proposal)) {
    const full = inboxFilePath(proposal.id, file.stored);
    if (!fs.existsSync(full)) continue;
    await saveDocumentBuffer(itemId, {
      name: file.name,
      mime: file.mime,
      buffer: fs.readFileSync(full),
    });
  }
}

export function inboxFilePath(proposalId: string, stored: string) {
  return path.join(INBOX_DIR, proposalId, stored);
}

export type ProposalInput = {
  id?: string;
  gmailId: string;
  source: "scan" | "forward";
  fromEmail: string | null;
  fromName: string | null;
  subject: string | null;
  snippet: string | null;
  receivedAt: string | null;
  name: string | null;
  category: string;
  provider: string | null;
  renewalDate: string | null;
  amount: number | null;
  currency: string;
  verdict: ProposalVerdict;
  matchedItemId: string | null;
  notes: string | null;
  files: ProposalFile[];
  status?: ProposalStatus;
};

export function insertProposal(input: ProposalInput): Proposal {
  const id = input.id ?? randomUUID();
  const category = isCategoryValue(input.category) ? input.category : "other";
  const status = input.status ?? "pending";
  run(
    `INSERT INTO proposals (
      id, gmail_id, source, from_email, from_name, subject, snippet, received_at,
      name, category, provider, renewal_date, amount, currency, verdict, matched_item_id,
      status, notes, files_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.gmailId,
      input.source,
      input.fromEmail,
      input.fromName,
      input.subject,
      input.snippet,
      input.receivedAt,
      input.name,
      category,
      input.provider,
      input.renewalDate,
      input.amount,
      input.currency,
      input.verdict,
      input.matchedItemId,
      status,
      input.notes,
      input.files.length > 0 ? JSON.stringify(input.files) : null,
      new Date().toISOString(),
    ],
  );
  const row = getProposal(id);
  if (!row) throw new Error("שמירת הטיוטה נכשלה.");
  return row;
}
