import { randomBytes } from "node:crypto";
import { logActivity } from "./activity";
import { addCadence, formatISODate, parseISODate, todayISO } from "./dates";
import { applyDraft } from "./apply-draft";
import { queryOne, run } from "./db";
import { deleteItemRecord, getItem, setItemStatus } from "./items";
import { mailBaseUrl } from "./mail";
import { getProposal, setProposalStatus } from "./proposals";
import type { RenewalItem } from "./types";

// One-tap buttons inside the tool's emails.
//
// Each button is a row in action_links: a 32-byte random id in the URL (/a/<id>), a
// payload saying what to do, an expiry, and used_at once pressed. Opening the link only
// shows a confirmation page; the action runs on the POST from that page. So a mail
// scanner that pre-opens links cannot trigger anything, and a link works once.

export type ActionKind =
  | "confirm" // "looks right": just acknowledges, nothing changes
  | "delete_item" // remove an item the tool created from a forward
  | "undo_update" // put back the values an item had before a forward changed them
  | "add_draft" // turn a draft into an item (or update the matched item)
  | "skip_draft" // mark a draft as not relevant
  | "retry_inbound" // process a received email again after a failure
  | "mark_renewed" // move the renewal date one cycle forward
  | "mark_ended" // the subscription was cancelled
  | "snooze_item" // "remind me in a week"
  | "ack_item"; // "got it": no more reminders for this renewal cycle

export type PreviousValues = Pick<RenewalItem, "renewal_date" | "amount" | "currency" | "provider" | "notes">;

export type ActionPayload = {
  itemId?: string;
  proposalId?: string;
  emailId?: string;
  previous?: PreviousValues;
  label?: string; // what the confirmation page calls the thing, e.g. the item name
};

type ActionRow = {
  id: string;
  action: ActionKind;
  payload: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

export type ActionLink = { id: string; action: ActionKind; payload: ActionPayload; url: string };

const DEFAULT_DAYS = 30;

export function createActionLink(action: ActionKind, payload: ActionPayload, days = DEFAULT_DAYS): ActionLink {
  const id = randomBytes(32).toString("base64url");
  const now = new Date();
  const expires = new Date(now.getTime() + days * 86_400_000);
  run(
    `INSERT INTO action_links (id, action, payload, expires_at, used_at, created_at) VALUES (?, ?, ?, ?, NULL, ?)`,
    [id, action, JSON.stringify(payload), expires.toISOString(), now.toISOString()],
  );
  return { id, action, payload, url: `${mailBaseUrl()}/a/${id}` };
}

export type LinkState =
  | { state: "ok"; link: ActionLink }
  | { state: "missing" }
  | { state: "used"; usedAt: string }
  | { state: "expired" };

export function readActionLink(id: string): LinkState {
  if (!/^[A-Za-z0-9_-]{20,}$/.test(id)) return { state: "missing" };
  const row = queryOne<ActionRow>(`SELECT * FROM action_links WHERE id = ?`, [id]);
  if (!row) return { state: "missing" };
  if (row.used_at) return { state: "used", usedAt: row.used_at };
  if (Date.parse(row.expires_at) < Date.now()) return { state: "expired" };
  let payload: ActionPayload = {};
  try {
    payload = JSON.parse(row.payload) as ActionPayload;
  } catch {
    payload = {};
  }
  return { state: "ok", link: { id: row.id, action: row.action, payload, url: `${mailBaseUrl()}/a/${row.id}` } };
}

/** Hebrew wording for the confirmation page: title, what will happen, button text. */
export function describeAction(link: ActionLink): { title: string; detail: string; button: string } {
  const what = link.payload.label ? `״${link.payload.label}״` : "הפריט";
  switch (link.action) {
    case "confirm":
      return { title: "לאשר שהפרטים נכונים?", detail: `${what} יישאר כפי שהוא ונרשם שאישרתם.`, button: "כן, נכון" };
    case "delete_item":
      return { title: `למחוק את ${what}?`, detail: "הפריט והקבצים שלו יימחקו מהלוח. אי אפשר לבטל.", button: "מחיקה" };
    case "undo_update":
      return {
        title: `לבטל את העדכון של ${what}?`,
        detail: `התאריך, המחיר והספק יחזרו למה שהיו לפני המייל${
          link.payload.previous ? ` (תאריך ${link.payload.previous.renewal_date})` : ""
        }.`,
        button: "ביטול העדכון",
      };
    case "add_draft":
      return { title: `להוסיף את ${what} ללוח?`, detail: "הטיוטה תהפוך לפריט עם הפרטים שנמצאו במייל.", button: "הוספה" };
    case "skip_draft":
      return { title: `לסמן את ${what} כלא רלוונטי?`, detail: "הטיוטה תיסגר ולא תופיע יותר.", button: "לא רלוונטי" };
    case "retry_inbound":
      return { title: "לנסות לקלוט את המייל שוב?", detail: "הכלי יוריד את המייל מחדש ויקרא אותו שוב.", button: "נסה שוב" };
    case "mark_renewed":
      return { title: `לסמן את ${what} כחודש?`, detail: "תאריך החידוש יתקדם מחזור אחד קדימה.", button: "חידשתי" };
    case "mark_ended":
      return {
        title: `לסמן את ${what} כהסתיים?`,
        detail: "הפריט יעבור ל״הסתיים״ ולא יישלחו עליו עוד תזכורות.",
        button: "ביטלתי",
      };
    case "snooze_item":
      return { title: `להשתיק את ${what} לשבוע?`, detail: "לא יישלחו תזכורות על הפריט בשבעת הימים הקרובים.", button: "הזכר לי בעוד שבוע" };
    case "ack_item":
      return {
        title: `לסיים את התזכורות על ${what}?`,
        detail: "לא יישלחו עוד תזכורות עד תאריך החידוש הזה. התזכורות יחזרו במחזור הבא.",
        button: "קיבלתי",
      };
  }
}

export type ActionOutcome = { ok: boolean; message: string; itemId?: string; proposalId?: string };

/** Runs the action behind a link and marks the link used. A link works once. */
export async function performAction(link: ActionLink): Promise<ActionOutcome> {
  const claimed = run(`UPDATE action_links SET used_at = ? WHERE id = ? AND used_at IS NULL`, [
    new Date().toISOString(),
    link.id,
  ]);
  if (claimed.changes === 0) return { ok: false, message: "הקישור הזה כבר שימש." };

  const outcome = await apply(link);
  logActivity("action", `${link.action}: ${outcome.message}`, {
    itemId: outcome.itemId ?? link.payload.itemId,
    proposalId: outcome.proposalId ?? link.payload.proposalId,
  });
  return outcome;
}

async function apply(link: ActionLink): Promise<ActionOutcome> {
  const p = link.payload;
  switch (link.action) {
    case "confirm":
      return { ok: true, message: "תודה, נרשם שהפרטים נכונים.", itemId: p.itemId, proposalId: p.proposalId };

    case "delete_item": {
      if (!p.itemId || !getItem(p.itemId)) return { ok: false, message: "הפריט כבר לא קיים." };
      deleteItemRecord(p.itemId);
      if (p.proposalId) setProposalStatus(p.proposalId, "skipped");
      return { ok: true, message: "הפריט נמחק מהלוח.", proposalId: p.proposalId };
    }

    case "undo_update": {
      const item = p.itemId ? getItem(p.itemId) : undefined;
      if (!item || !p.previous) return { ok: false, message: "אין מה לבטל: הפריט לא נמצא." };
      run(
        `UPDATE items SET renewal_date = ?, amount = ?, currency = ?, provider = ?, notes = ?, updated_at = ? WHERE id = ?`,
        [
          p.previous.renewal_date,
          p.previous.amount,
          p.previous.currency,
          p.previous.provider,
          p.previous.notes,
          new Date().toISOString(),
          item.id,
        ],
      );
      if (p.proposalId) setProposalStatus(p.proposalId, "skipped");
      return {
        ok: true,
        message: `העדכון בוטל. התאריך חזר ל־${p.previous.renewal_date}.`,
        itemId: item.id,
        proposalId: p.proposalId,
      };
    }

    case "add_draft": {
      if (!p.proposalId) return { ok: false, message: "הטיוטה לא נמצאה." };
      return applyDraft(p.proposalId);
    }

    case "skip_draft": {
      const proposal = p.proposalId ? getProposal(p.proposalId) : undefined;
      if (!proposal) return { ok: false, message: "הטיוטה לא נמצאה." };
      setProposalStatus(proposal.id, "skipped");
      return { ok: true, message: "הטיוטה סומנה כלא רלוונטית.", proposalId: proposal.id };
    }

    case "retry_inbound": {
      if (!p.emailId) return { ok: false, message: "חסר מזהה מייל." };
      const { processReceivedEmail } = await import("./inbound");
      const result = await processReceivedEmail(p.emailId);
      if (result.error) return { ok: false, message: `עדיין נכשל: ${result.error}` };
      return { ok: true, message: "המייל נקלט. אישור נשלח במייל." };
    }

    case "mark_renewed": {
      const item = p.itemId ? getItem(p.itemId) : undefined;
      if (!item) return { ok: false, message: "הפריט לא נמצא." };
      const next = addCadence(item.renewal_date, item.cadence, item.cadence_months);
      if (next) {
        // A new cycle starts clean: no snooze, nothing acknowledged yet.
        run(
          "UPDATE items SET renewal_date = ?, status = 'active', snoozed_until = NULL, ack_renewal_date = NULL, updated_at = ? WHERE id = ?",
          [next, new Date().toISOString(), item.id],
        );
        return { ok: true, message: `״${item.name}״ סומן כחודש. החידוש הבא: ${next}.`, itemId: item.id };
      }
      setItemStatus(item.id, "ended");
      return { ok: true, message: `״${item.name}״ סומן כבוצע.`, itemId: item.id };
    }

    case "mark_ended": {
      const item = p.itemId ? getItem(p.itemId) : undefined;
      if (!item) return { ok: false, message: "הפריט לא נמצא." };
      setItemStatus(item.id, "ended");
      return { ok: true, message: `״${item.name}״ סומן כהסתיים.`, itemId: item.id };
    }

    case "snooze_item": {
      const item = p.itemId ? getItem(p.itemId) : undefined;
      if (!item) return { ok: false, message: "הפריט לא נמצא." };
      const until = formatISODate(new Date(parseISODate(todayISO()).getTime() + 7 * 86_400_000));
      run("UPDATE items SET snoozed_until = ?, updated_at = ? WHERE id = ?", [until, new Date().toISOString(), item.id]);
      return { ok: true, message: `בסדר. התזכורת הבאה על ״${item.name}״ לא לפני ${until}.`, itemId: item.id };
    }

    case "ack_item": {
      const item = p.itemId ? getItem(p.itemId) : undefined;
      if (!item) return { ok: false, message: "הפריט לא נמצא." };
      run("UPDATE items SET ack_renewal_date = ?, snoozed_until = NULL, updated_at = ? WHERE id = ?", [
        item.renewal_date,
        new Date().toISOString(),
        item.id,
      ]);
      return {
        ok: true,
        message: `בסדר. אין עוד תזכורות על ״${item.name}״ עד ${item.renewal_date}.`,
        itemId: item.id,
      };
    }
  }
}
