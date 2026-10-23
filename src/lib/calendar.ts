import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { CATEGORY_LABELS } from "./categories";
import { addCadence, formatISODate, parseISODate } from "./dates";
import { getSetting, setSetting } from "./db";
import { formatMoney } from "./format";
import { listActiveItems } from "./items";
import type { RenewalItem } from "./types";

// Calendar view and an iCalendar feed that Google/Apple/Outlook can subscribe to.
// The feed is public-by-URL and guarded only by a long random token, like Google's own
// "secret address" for private calendars.

export type Occurrence = { date: string; item: RenewalItem };

export function calendarToken(): string {
  let token = getSetting("calendar_token");
  if (!token) {
    token = randomBytes(24).toString("hex");
    setSetting("calendar_token", token);
  }
  return token;
}

export function rotateCalendarToken(): string {
  const token = randomBytes(24).toString("hex");
  setSetting("calendar_token", token);
  return token;
}

/** Public base URL of this deployment, for links in the feed and the settings page. */
export async function appBaseUrl(): Promise<string> {
  const env = (process.env.APP_URL || "").replace(/\/$/, "");
  if (env && !/localhost|127\.0\.0\.1/.test(env)) return env;
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Every renewal date of each active item that falls inside [from, to], recurring items included. */
export function occurrencesBetween(from: string, to: string, items = listActiveItems()): Occurrence[] {
  const out: Occurrence[] = [];
  for (const item of items) {
    let date: string | null = item.renewal_date;
    // An overdue item shows on its (past) renewal date only if that date is in range.
    for (let guard = 0; date && date <= to && guard < 200; guard += 1) {
      if (date >= from) out.push({ date, item });
      date = addCadence(date, item.cadence, item.cadence_months);
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.item.name.localeCompare(b.item.name, "he"));
}

function icsEscape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function icsLine(name: string, value: string): string {
  // RFC 5545 folding: keep lines short; continuation lines start with a space.
  const full = `${name}:${value}`;
  const chunks: string[] = [];
  for (let i = 0; i < full.length; i += 70) chunks.push(full.slice(i, i + 70));
  return chunks.join("\r\n ");
}

function compactDate(iso: string): string {
  return iso.replace(/-/g, "");
}

function rrule(item: RenewalItem): string | null {
  if (item.cadence === "yearly") return "FREQ=YEARLY";
  if (item.cadence === "monthly") return "FREQ=MONTHLY";
  if (item.cadence === "custom") return `FREQ=MONTHLY;INTERVAL=${item.cadence_months && item.cadence_months > 0 ? item.cadence_months : 12}`;
  return null;
}

export function buildIcs(baseUrl: string, items = listActiveItems()): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//renewals//he",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    icsLine("X-WR-CALNAME", "חידושים ומנויים"),
    "X-WR-TIMEZONE:Asia/Jerusalem",
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    "X-PUBLISHED-TTL:PT6H",
  ];

  for (const item of items) {
    const start = parseISODate(item.renewal_date);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const description = [
      item.provider ? `ספק: ${item.provider}` : null,
      `קטגוריה: ${CATEGORY_LABELS[item.category]}`,
      item.amount != null ? `מחיר: ${formatMoney(item.amount, item.currency)}` : null,
      item.auto_renew ? "מתחדש אוטומטית" : "לא מתחדש אוטומטית",
      item.notes,
      `${baseUrl}/items/${item.id}`,
    ]
      .filter((line): line is string => Boolean(line))
      .join("\n");
    const rule = rrule(item);

    lines.push(
      "BEGIN:VEVENT",
      `UID:${item.id}@renewals`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compactDate(item.renewal_date)}`,
      `DTEND;VALUE=DATE:${compactDate(formatISODate(end))}`,
      ...(rule ? [`RRULE:${rule}`] : []),
      icsLine("SUMMARY", icsEscape(`חידוש: ${item.name}`)),
      icsLine("DESCRIPTION", icsEscape(description)),
      `URL:${baseUrl}/items/${item.id}`,
      "TRANSP:TRANSPARENT",
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      icsLine("DESCRIPTION", icsEscape(`${item.name} מתחדש בעוד שבוע`)),
      "TRIGGER:-P7D",
      "END:VALARM",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}
