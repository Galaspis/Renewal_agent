import Link from "next/link";
import { lastAlertRun } from "@/lib/alerts";
import { getSetting } from "@/lib/db";
import { hoursSince } from "@/lib/dates";
import { inboundConfigured, lastInbound } from "@/lib/inbound";
import { IconAlert, IconBell, IconEmail, IconHistory } from "./Icons";
import { cardClass } from "./styles";

// What the tool last did, and a red box when something is wrong. The point is that a
// silent failure (like the read-only database of 2026-10-19) is visible the next time
// anyone opens the app.

function when(iso: string | undefined | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("he-IL", {
    timeZone: "Asia/Jerusalem",
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function systemProblems(): string[] {
  const inbound = lastInbound();
  const alerts = lastAlertRun();
  const lastCheck = getSetting("last_alert_check_at");
  const problems: string[] = [];
  if (!inboundConfigured()) problems.push("קליטת מיילים כבויה: חסר מפתח החתימה של Resend בהגדרות.");
  if (inbound?.error) problems.push(`המייל האחרון לא נקלט: ${inbound.error}`);
  if (alerts?.error) problems.push(`שליחת התזכורות האחרונה נכשלה: ${alerts.error}`);
  if (lastCheck && hoursSince(lastCheck) > 36) problems.push(`לא נבדקו תזכורות כבר ${Math.floor(hoursSince(lastCheck))} שעות.`);
  if (alerts && alerts.channel === "outbox") problems.push("אין ספק דואר: תזכורות נכתבות לתיקייה בשרת במקום להישלח.");
  return problems;
}

/** The red box. Rendered only when there is something to say. */
export function StatusProblems() {
  const problems = systemProblems();
  if (problems.length === 0) return null;
  return (
    <div className="flex gap-3 rounded-2xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger">
      <IconAlert className="mt-0.5 size-5 shrink-0" />
      <div className="space-y-0.5">
        {problems.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
    </div>
  );
}

/** The sidebar card: last email, last reminder run, link to the activity log. */
export function StatusCard() {
  const inbound = lastInbound();
  const alerts = lastAlertRun();
  const inboundOutcome = inbound
    ? inbound.error
      ? "נכשל"
      : inbound.applied
        ? "נוסף/עודכן"
        : inbound.created
          ? "טיוטה"
          : inbound.already
            ? "כבר היה"
            : "לא רלוונטי"
    : null;

  return (
    <section className={`${cardClass} p-4`}>
      <h2 className="text-sm font-bold text-navy">מה הכלי עשה לאחרונה</h2>
      <ul className="mt-3 space-y-3 text-sm">
        <li className="flex gap-3">
          <IconEmail className="mt-0.5 size-5 shrink-0 text-accent" />
          <div className="min-w-0">
            <div className="font-medium">מייל אחרון</div>
            {inbound ? (
              <div className="truncate text-muted">
                {when(inbound.scannedAt)} · {inbound.subject || "בלי נושא"} · {inboundOutcome}
              </div>
            ) : (
              <div className="text-muted">עדיין לא הגיע מייל.</div>
            )}
          </div>
        </li>
        <li className="flex gap-3">
          <IconBell className="mt-0.5 size-5 shrink-0 text-accent" />
          <div className="min-w-0">
            <div className="font-medium">תזכורות</div>
            {alerts ? (
              <div className="text-muted">
                נבדק {when(alerts.checkedAt)} · {alerts.sent.length === 0 ? "לא היה מה לשלוח" : `נשלחו ${alerts.sent.length}`}
              </div>
            ) : (
              <div className="text-muted">עדיין לא נבדקו.</div>
            )}
          </div>
        </li>
      </ul>
      <Link href="/activity" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
        <IconHistory className="size-4" />
        ליומן הפעילות
      </Link>
    </section>
  );
}
