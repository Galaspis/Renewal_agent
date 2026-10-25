import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { addCadence, todayISO } from "./dates";
import { queryAll, queryOne, run, UPLOAD_DIR } from "./db";
import type { Cadence, Category, DocumentRow, InsuranceType, ItemStatus, RenewalItem } from "./types";

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const EXT: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/heic": ".heic",
  "image/heif": ".heif",
};

export type ItemInput = {
  name: string;
  category: Category;
  provider: string | null;
  renewal_date: string;
  cadence: Cadence;
  cadence_months: number | null;
  auto_renew: boolean;
  amount: number | null;
  currency: string;
  notice_days: number;
  notes: string | null;
  subcategory?: InsuranceType | null;
  policy_number?: string | null;
  insured?: string | null;
  start_date?: string | null;
  attention?: boolean;
};

export function listItems(): RenewalItem[] {
  return queryAll<RenewalItem>(
    `SELECT * FROM items ORDER BY
      CASE status WHEN 'active' THEN 0 WHEN 'paused' THEN 1 ELSE 2 END,
      renewal_date ASC, name ASC`,
  );
}

export function listActiveItems(): RenewalItem[] {
  return queryAll<RenewalItem>(
    `SELECT * FROM items WHERE status = 'active' ORDER BY renewal_date ASC, name ASC`,
  );
}

export function getItem(id: string): RenewalItem | undefined {
  return queryOne<RenewalItem>("SELECT * FROM items WHERE id = ?", [id]);
}

export function createItemRecord(input: ItemInput): RenewalItem {
  const now = new Date().toISOString();
  const id = randomUUID();
  run(
    `INSERT INTO items (
      id, name, category, provider, renewal_date, cadence, cadence_months,
      auto_renew, amount, currency, notice_days, notes, status, created_at, updated_at,
      subcategory, policy_number, insured, start_date, attention
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.name,
      input.category,
      input.provider,
      input.renewal_date,
      input.cadence,
      input.cadence_months,
      input.auto_renew ? 1 : 0,
      input.amount,
      input.currency,
      input.notice_days,
      input.notes,
      now,
      now,
      input.category === "insurance" ? (input.subcategory ?? null) : null,
      input.policy_number ?? null,
      input.insured ?? null,
      input.start_date ?? null,
      input.attention ? 1 : 0,
    ],
  );
  const item = getItem(id);
  if (!item) throw new Error("יצירת הפריט נכשלה.");
  return item;
}

export function updateItemRecord(id: string, input: ItemInput) {
  run(
    `UPDATE items SET
      name = ?, category = ?, provider = ?, renewal_date = ?, cadence = ?,
      cadence_months = ?, auto_renew = ?, amount = ?, currency = ?, notice_days = ?,
      notes = ?, updated_at = ?,
      subcategory = ?, policy_number = ?, insured = ?, start_date = ?, attention = ?
     WHERE id = ?`,
    [
      input.name,
      input.category,
      input.provider,
      input.renewal_date,
      input.cadence,
      input.cadence_months,
      input.auto_renew ? 1 : 0,
      input.amount,
      input.currency,
      input.notice_days,
      input.notes,
      new Date().toISOString(),
      input.category === "insurance" ? (input.subcategory ?? null) : null,
      input.policy_number ?? null,
      input.insured ?? null,
      input.start_date ?? null,
      input.attention ? 1 : 0,
      id,
    ],
  );
}

/**
 * Auto-renewing items don't go "overdue": once the date passes, the next cycle starts.
 * Moves each such item forward to its first renewal date on or after today.
 * Returns how many items moved.
 */
export function rollForwardAutoRenewals(now = new Date()): number {
  const today = todayISO(now);
  const due = queryAll<RenewalItem>(
    `SELECT * FROM items
     WHERE status = 'active' AND auto_renew = 1 AND cadence != 'once' AND renewal_date < ?`,
    [today],
  );
  let moved = 0;
  for (const item of due) {
    let next: string | null = item.renewal_date;
    for (let guard = 0; next && next < today && guard < 600; guard += 1) {
      next = addCadence(next, item.cadence, item.cadence_months);
    }
    if (next && next !== item.renewal_date) {
      run("UPDATE items SET renewal_date = ?, updated_at = ? WHERE id = ?", [next, now.toISOString(), item.id]);
      moved += 1;
    }
  }
  return moved;
}

export function setItemStatus(id: string, status: ItemStatus) {
  run("UPDATE items SET status = ?, updated_at = ? WHERE id = ?", [
    status,
    new Date().toISOString(),
    id,
  ]);
}

export function patchItemRenewal(
  id: string,
  patch: {
    renewal_date?: string | null;
    amount?: number | null;
    currency?: string;
    provider?: string | null;
    notes?: string | null;
  },
) {
  const item = getItem(id);
  if (!item) return;
  run(
    `UPDATE items SET
      renewal_date = ?, amount = ?, currency = ?, provider = ?, notes = ?, status = 'active', updated_at = ?
     WHERE id = ?`,
    [
      patch.renewal_date || item.renewal_date,
      patch.amount ?? item.amount,
      patch.currency || item.currency,
      patch.provider ?? item.provider,
      patch.notes ?? item.notes,
      new Date().toISOString(),
      id,
    ],
  );
}

export function setItemRenewalDate(id: string, renewalDate: string) {
  // A new renewal date is a new cycle: nothing snoozed, nothing acknowledged yet.
  run(
    "UPDATE items SET renewal_date = ?, status = 'active', snoozed_until = NULL, ack_renewal_date = NULL, updated_at = ? WHERE id = ?",
    [renewalDate, new Date().toISOString(), id],
  );
}

/** Snooze ("remind me in a week") and acknowledge ("no more reminders this cycle"). */
export function setItemQuiet(id: string, quiet: { snoozed_until?: string | null; ack_renewal_date?: string | null }) {
  const item = getItem(id);
  if (!item) return;
  run("UPDATE items SET snoozed_until = ?, ack_renewal_date = ?, updated_at = ? WHERE id = ?", [
    quiet.snoozed_until === undefined ? item.snoozed_until : quiet.snoozed_until,
    quiet.ack_renewal_date === undefined ? item.ack_renewal_date : quiet.ack_renewal_date,
    new Date().toISOString(),
    id,
  ]);
}

export function deleteItemRecord(id: string) {
  const docs = listDocuments(id);
  for (const doc of docs) {
    const filePath = path.join(UPLOAD_DIR, doc.stored_name);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  run("DELETE FROM items WHERE id = ?", [id]);
}

export function listDocuments(itemId: string): DocumentRow[] {
  return queryAll<DocumentRow>(
    "SELECT * FROM documents WHERE item_id = ? ORDER BY created_at DESC",
    [itemId],
  );
}

export function getDocument(id: string): DocumentRow | undefined {
  return queryOne<DocumentRow>("SELECT * FROM documents WHERE id = ?", [id]);
}

export async function saveDocument(itemId: string, file: File): Promise<DocumentRow> {
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("הקובץ גדול מ־10 מ״ב.");
  }
  const mime = file.type || "application/octet-stream";
  if (!ALLOWED_MIME.has(mime)) {
    throw new Error("מתקבלים רק PDF ותמונות.");
  }
  const id = randomUUID();
  const storedName = `${id}${EXT[mime] ?? ""}`;
  const dest = path.join(UPLOAD_DIR, storedName);
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(dest, buffer);
  const createdAt = new Date().toISOString();
  run(
    `INSERT INTO documents (id, item_id, original_name, stored_name, mime, size_bytes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, itemId, file.name || storedName, storedName, mime, file.size, createdAt],
  );
  const row = getDocument(id);
  if (!row) throw new Error("שמירת המסמך נכשלה.");
  return row;
}

export async function saveDocumentBuffer(
  itemId: string,
  file: { name: string; mime: string; buffer: Buffer },
): Promise<DocumentRow> {
  if (file.buffer.length > 10 * 1024 * 1024) {
    throw new Error("הקובץ גדול מ־10 מ״ב.");
  }
  const mime = file.mime || "application/octet-stream";
  if (!ALLOWED_MIME.has(mime) && mime !== "application/octet-stream") {
    throw new Error("מתקבלים רק PDF ותמונות.");
  }
  const id = randomUUID();
  const ext = EXT[mime] ?? (file.name.toLowerCase().endsWith(".pdf") ? ".pdf" : "");
  const storedName = `${id}${ext}`;
  const dest = path.join(UPLOAD_DIR, storedName);
  fs.writeFileSync(dest, file.buffer);
  const createdAt = new Date().toISOString();
  const storedMime = mime === "application/octet-stream" && ext === ".pdf" ? "application/pdf" : mime;
  if (!ALLOWED_MIME.has(storedMime)) {
    fs.unlinkSync(dest);
    throw new Error("מתקבלים רק PDF ותמונות.");
  }
  run(
    `INSERT INTO documents (id, item_id, original_name, stored_name, mime, size_bytes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, itemId, file.name || storedName, storedName, storedMime, file.buffer.length, createdAt],
  );
  const row = getDocument(id);
  if (!row) throw new Error("שמירת המסמך נכשלה.");
  return row;
}

export function deleteDocumentRecord(id: string) {
  const doc = getDocument(id);
  if (!doc) return;
  const filePath = path.join(UPLOAD_DIR, doc.stored_name);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  run("DELETE FROM documents WHERE id = ?", [id]);
}


export type RecentDocument = DocumentRow & { item_name: string };

/** The newest uploaded files across all items, for the dashboard sidebar. */
export function listRecentDocuments(limit = 4): RecentDocument[] {
  return queryAll<RecentDocument>(
    `SELECT d.*, i.name AS item_name
     FROM documents d JOIN items i ON i.id = d.item_id
     ORDER BY d.created_at DESC LIMIT ?`,
    [limit],
  );
}
