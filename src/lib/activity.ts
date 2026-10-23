import { randomUUID } from "node:crypto";
import { queryAll, run } from "./db";

// A short, human-readable log of what the tool did: email received and what became of
// it, reminder sent, button pressed. Shown later in the app; written from everywhere.

export type ActivityKind = "inbound" | "receipt" | "alert" | "action";

export type ActivityRow = {
  id: string;
  at: string;
  kind: ActivityKind;
  item_id: string | null;
  proposal_id: string | null;
  detail: string | null;
};

export function logActivity(
  kind: ActivityKind,
  detail: string,
  refs: { itemId?: string | null; proposalId?: string | null } = {},
) {
  try {
    run(`INSERT INTO activity (id, at, kind, item_id, proposal_id, detail) VALUES (?, ?, ?, ?, ?, ?)`, [
      randomUUID(),
      new Date().toISOString(),
      kind,
      refs.itemId ?? null,
      refs.proposalId ?? null,
      detail.slice(0, 500),
    ]);
  } catch {
    // The log must never break the thing it describes.
  }
}

export function listActivity(limit = 100): ActivityRow[] {
  return queryAll<ActivityRow>(`SELECT * FROM activity ORDER BY at DESC LIMIT ?`, [limit]);
}
