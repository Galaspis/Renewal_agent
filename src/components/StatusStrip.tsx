import Link from "next/link";
import { lastAlertRun } from "@/lib/alerts";
import { getSetting } from "@/lib/db";
import { hoursSince } from "@/lib/dates";
import { inboundConfigured, lastInbound } from "@/lib/inbound";
import { IconAlert } from "./Icons";

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
    <div className="flex gap-3 rounded-2xl bg-danger/5 px-4 py-3 text-sm text-danger ring-1 ring-danger/20">
      <IconAlert className="mt-0.5 size-5 shrink-0" />
      <div className="space-y-0.5">
        {problems.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
    </div>
  );
}

/** One quiet line: last email, last reminder run, link to the log. */
export function StatusLine() {
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
  const parts = [
    inbound ? `מייל אחרון ${when(inbound.scannedAt)} (${inboundOutcome})` : "עדיין לא הגיע מייל",
    alerts
      ? `תזכורות נבדקו ${when(alerts.checkedAt)}${alerts.sent.length > 0 ? `, נשלחו ${alerts.sent.length}` : ""}`
      : "תזכורות עדיין לא נבדקו",
  ];
  return (
    <p className="text-[13px] leading-6 text-muted">
      {parts.join(" · ")}
      {" · "}
      <Link href="/activity" className="text-accent hover:underline">
        יומן פעילות
      </Link>
    </p>
  );
}
