import { bucketMilestone, isQuiet } from "./alerts";
import { milestoneLabel, milestonesFor } from "./categories";
import { daysUntil, formatISODate, parseISODate, todayISO } from "./dates";
import { queryAll } from "./db";
import type { AlertRow, RenewalItem } from "./types";

// What the item page shows about reminders: which rungs already went out for the
// current renewal date, what comes next, and whether the user asked for quiet.

export type ReminderState = {
  sent: AlertRow[];
  /** Why nothing more will be sent this cycle, or null when reminders are still active. */
  quiet: string | null;
  /** The next reminder: a label and the date it is due, or null when none is expected. */
  next: { label: string; date: string } | null;
};

function shiftDate(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return formatISODate(d);
}

export function reminderState(item: RenewalItem): ReminderState {
  const sent = queryAll<AlertRow>(
    `SELECT * FROM alerts WHERE item_id = ? AND renewal_date = ? AND channel IN ('email', 'outbox') ORDER BY sent_at DESC`,
    [item.id, item.renewal_date],
  );
  const today = todayISO();

  if (item.status !== "active") return { sent, quiet: "הפריט לא פעיל, אין תזכורות.", next: null };
  if (item.ack_renewal_date && item.ack_renewal_date === item.renewal_date) {
    return { sent, quiet: "אישרתם ״קיבלתי״ למחזור הזה. התזכורות יחזרו במחזור הבא.", next: null };
  }

  const days = daysUntil(item.renewal_date);
  const sentMarks = new Set(sent.map((row) => row.milestone));
  let next: ReminderState["next"] = null;

  if (days < 0) {
    if (item.auto_renew && item.cadence !== "once") {
      next = null;
    } else {
      const current = bucketMilestone(item, days) ?? -1;
      if (!sentMarks.has(current)) {
        next = { label: "תזכורת איחור", date: today };
      } else {
        // The next weekly nag: the first day of the following week past the date.
        const weeks = Math.floor(-days / 7) + 1;
        next = { label: "תזכורת איחור", date: shiftDate(item.renewal_date, weeks * 7) };
      }
    }
  } else {
    const marks = [...milestonesFor(item.category, item.cadence)]
      .filter((mark) => mark <= item.notice_days)
      .sort((a, b) => b - a);
    const current = bucketMilestone(item, days);
    if (current != null && !sentMarks.has(current)) {
      next = { label: milestoneLabel(current, days), date: today };
    } else {
      const upcoming = marks.find((mark) => mark < days && !sentMarks.has(mark) && mark !== current);
      if (upcoming != null) {
        next = { label: milestoneLabel(upcoming, upcoming), date: shiftDate(item.renewal_date, -upcoming) };
      }
    }
  }

  if (isQuiet(item, today) && item.snoozed_until && item.snoozed_until > today) {
    return { sent, quiet: `מושתק עד ${item.snoozed_until}. אחר כך התזכורות ממשיכות.`, next };
  }
  return { sent, quiet: null, next };
}
