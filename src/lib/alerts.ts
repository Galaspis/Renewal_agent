import { randomUUID } from "node:crypto";
import { createActionLink } from "./action-links";
import { logActivity } from "./activity";
import { alternativesHint, milestoneLabel, milestonesFor } from "./categories";
import { daysUntil, todayISO } from "./dates";
import { getSetting, queryOne, run, setSetting } from "./db";
import { formatMoney } from "./format";
import { listActiveItems, rollForwardAutoRenewals } from "./items";
import {
  alertRecipients,
  autoLine,
  emailButtons,
  emailShell,
  escapeHtml,
  isolate,
  sendAlertMail,
  textButtons,
  textDirection,
  type EmailButton,
} from "./mail";
import type { AlertDispatch, AlertRun, RenewalItem } from "./types";

// Reminders.
//
// Every active item gets a ladder of reminders before its renewal date (for example
// 60, 30, 14, 7, 1, 0 days before), limited by the item's own notice window. The ladder
// keeps going until the user presses a button on one of the emails; then that renewal
// cycle is "answered" (ack_renewal_date) and goes quiet. "Remind me in a week" pauses
// it (snoozed_until). Overdue items that do not renew by themselves get a nag every
// 7 days. Reminders go out once a day, after 08:00 Israel time.

const TIME_ZONE = "Asia/Jerusalem";
const SEND_HOUR = 8;
const REMINDER_LINK_DAYS = 90;

/** Date (YYYY-MM-DD) and hour in Israel, whatever the server's clock zone is. */
export function localNow(now = new Date()): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) % 24 };
}

/** Which rung of the ladder today falls on, or null when no reminder is due. */
export function bucketMilestone(item: RenewalItem, days: number): number | null {
  if (days < 0) {
    // Auto-renewing items never stay overdue: rollForwardAutoRenewals moves them on.
    if (item.auto_renew && item.cadence !== "once") return null;
    // Overdue: one nag per week. -1 covers days 1..6 late, -8 the next week, and so on.
    return -1 - 7 * Math.floor(-days / 7);
  }
  const marks = [...milestonesFor(item.category, item.cadence)]
    .filter((mark) => mark <= item.notice_days)
    .sort((a, b) => b - a);
  for (let i = 0; i < marks.length; i += 1) {
    const current = marks[i];
    const tighter = marks[i + 1] ?? Number.NEGATIVE_INFINITY;
    if (days <= current && days > tighter) return current;
  }
  return null;
}

function alreadySent(itemId: string, renewalDate: string, milestone: number): boolean {
  return Boolean(
    queryOne(
      `SELECT id FROM alerts
       WHERE item_id = ? AND renewal_date = ? AND milestone = ? AND channel IN ('email', 'outbox')`,
      [itemId, renewalDate, milestone],
    ),
  );
}

function recordSent(itemId: string, renewalDate: string, milestone: number, channel: string) {
  run(
    `INSERT OR IGNORE INTO alerts (id, item_id, renewal_date, milestone, channel, sent_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [randomUUID(), itemId, renewalDate, milestone, channel, new Date().toISOString()],
  );
}

/** True when the user already answered a reminder for this cycle, or asked for a week of quiet. */
export function isQuiet(item: RenewalItem, today = todayISO()): boolean {
  if (item.ack_renewal_date && item.ack_renewal_date === item.renewal_date) return true;
  if (item.snoozed_until && item.snoozed_until > today) return true;
  return false;
}

function pendingDispatches(): AlertDispatch[] {
  const pending: AlertDispatch[] = [];
  const today = todayISO();
  for (const item of listActiveItems()) {
    if (isQuiet(item, today)) continue;
    const days = daysUntil(item.renewal_date);
    const milestone = bucketMilestone(item, days);
    if (milestone == null) continue;
    if (alreadySent(item.id, item.renewal_date, milestone)) continue;
    pending.push({ item, milestone, days });
  }
  return pending;
}

function dashboardUrl(itemId: string): string {
  const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}/items/${itemId}`;
}

function reminderButtons(item: RenewalItem): EmailButton[] {
  const autoRenew = Boolean(item.auto_renew) && item.cadence !== "once";
  const payload = { itemId: item.id, label: item.name };
  const link = (action: Parameters<typeof createActionLink>[0]) =>
    createActionLink(action, payload, REMINDER_LINK_DAYS).url;
  const buttons: EmailButton[] = [];
  if (autoRenew) {
    buttons.push({ label: "קיבלתי, בלי תזכורות נוספות", tone: "primary", href: link("ack_item") });
  } else {
    buttons.push({ label: "חידשתי", tone: "primary", href: link("mark_renewed") });
    buttons.push({ label: "קיבלתי, בלי תזכורות נוספות", href: link("ack_item") });
  }
  buttons.push({ label: "הזכר לי בעוד שבוע", href: link("snooze_item") });
  buttons.push({ label: "ביטלתי", tone: "danger", href: link("mark_ended") });
  buttons.push({ label: "פתח בלוח", href: dashboardUrl(item.id) });
  return buttons;
}

function messageFor(dispatch: AlertDispatch) {
  const { item, milestone, days } = dispatch;
  const autoRenew = Boolean(item.auto_renew) && item.cadence !== "once";
  const when =
    autoRenew && days >= 0
      ? days === 0
        ? "מתחדש אוטומטית היום"
        : days === 1
          ? "מתחדש אוטומטית מחר"
          : `מתחדש אוטומטית בעוד ${days} ימים`
      : milestoneLabel(milestone, days);
  const price = formatMoney(item.amount, item.currency);
  const auto = autoRenew
    ? "חידוש אוטומטי: החיוב יתבצע לבד. אם לא רוצים להמשיך — לבטל לפני התאריך."
    : "אין חידוש אוטומטי.";
  const alternatives = alternativesHint(item.category);
  const subject = `${isolate(item.name)} ${when}`;
  const dir = textDirection(`${item.name} ${item.provider ?? ""}`);
  const buttons = reminderButtons(item);
  const lines = [
    item.name,
    item.provider ? `ספק: ${item.provider}` : null,
    `תאריך חידוש: ${item.renewal_date}`,
    `מחיר נוכחי: ${price}`,
    auto,
    "",
    "חלופות:",
    alternatives,
    item.notes ? `הערות: ${item.notes}` : null,
    "",
    "התזכורות ימשיכו עד שתלחצו על אחד הכפתורים:",
    textButtons(buttons),
  ].filter((line): line is string => line != null);

  return {
    subject,
    text: lines.join("\n"),
    html: emailShell(
      `${autoLine(`${item.name} ${when}`, "font-size:18px;margin:0 0 12px")}
        ${item.provider ? autoLine(item.provider) : ""}
        ${autoLine(`תאריך חידוש: ${item.renewal_date}`)}
        ${autoLine(`מחיר נוכחי: ${price}`)}
        ${autoLine(auto, "margin:0 0 12px")}
        <p dir="rtl" style="margin:0 0 8px"><strong>חלופות</strong><br>${escapeHtml(alternatives)}</p>
        ${item.notes ? autoLine(item.notes, "margin:0 0 8px") : ""}
        <p dir="rtl" style="margin:14px 0 0;font-size:14px;color:#57534e">התזכורות ימשיכו עד שתלחצו על אחד הכפתורים.</p>
        ${emailButtons(buttons)}`,
      { dir },
    ),
  };
}

/** Once per Israeli calendar day, after 08:00. `force` (the settings button) skips the clock. */
function dueNow(): boolean {
  const { date, hour } = localNow();
  if (hour < SEND_HOUR) return false;
  return getSetting("last_alert_check_day") !== date;
}

export async function runAlertCheck(options?: { force?: boolean }): Promise<AlertRun | null> {
  // Cheap and idempotent, so it runs on every call, before the daily gate.
  rollForwardAutoRenewals();
  if (!options?.force && !dueNow()) return null;

  const checkedAt = new Date().toISOString();
  const pending = pendingDispatches();
  const recipients = alertRecipients();
  const sent: AlertRun["sent"] = [];
  let channel: AlertRun["channel"] = mailConfiguredChannel(recipients);
  let error: string | undefined;

  try {
    for (const dispatch of pending) {
      const message = messageFor(dispatch);
      channel = await sendAlertMail(message);
      recordSent(dispatch.item.id, dispatch.item.renewal_date, dispatch.milestone, channel);
      logActivity("alert", `${message.subject} (${channel})`, { itemId: dispatch.item.id });
      sent.push({
        name: dispatch.item.name,
        milestone: dispatch.milestone,
        days: dispatch.days,
      });
    }
  } catch (err) {
    error = err instanceof Error ? err.message : "שליחת ההתראה נכשלה.";
  }

  const result: AlertRun = { checkedAt, sent, recipients, channel, error };
  setSetting("last_alert_check_at", checkedAt);
  setSetting("last_alert_check_day", localNow().date);
  setSetting("last_alert_run", JSON.stringify(result));
  return result;
}

function mailConfiguredChannel(recipients: string[]): AlertRun["channel"] {
  if (recipients.length > 0 && (process.env.RESEND_API_KEY || process.env.SMTP_HOST)) {
    return "email";
  }
  return "outbox";
}

export function lastAlertRun(): AlertRun | null {
  const raw = getSetting("last_alert_run");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AlertRun;
  } catch {
    return null;
  }
}
