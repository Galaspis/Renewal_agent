import Link from "next/link";
import { lastAlertRun } from "@/lib/alerts";
import { getSetting } from "@/lib/db";
import { hoursSince } from "@/lib/dates";
import { inboundConfigured, lastInbound } from "@/lib/inbound";
import { cardClass } from "./styles";

// Top of the dashboard: what the tool last did, and a red line when something is wrong.
// The point is that a silent failure (like the read-only database of 2026-10-19) is
// visible the next time anyone opens the app.

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

export function StatusStrip() {
  const inbound = lastInbound();
  const alerts = lastAlertRun();
  const lastCheck = getSetting("last_alert_check_at");

  const problems: string[] = [];
  if (!inboundConfigured()) problems.push("קליטת מיילים כבויה: חסר מפתח החתימה של Resend בהגדרות.");
  if (inbound?.error) problems.push(`המייל האחרון לא נקלט: ${inbound.error}`);
  if (alerts?.error) problems.push(`שליחת התזכורות האחרונה נכשלה: ${alerts.error}`);
  if (lastCheck && hoursSince(lastCheck) > 36) problems.push(`לא נבדקו תזכורות כבר ${Math.floor(hoursSince(lastCheck))} שעות.`);
  if (alerts && alerts.channel === "outbox") problems.push("אין ספק דואר: תזכורות נכתבות לתיקייה בשרת במקום להישלח.");

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
    <div className="mt-6 space-y-2">
      {problems.length > 0 ? (
        <div className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          {problems.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      ) : null}
      <div className={`${cardClass} grid gap-x-6 gap-y-1 px-5 py-3 text-xs text-muted sm:grid-cols-2`}>
        <p>
          <span className="font-medium text-foreground">מייל אחרון: </span>
          {inbound ? (
            <>
              {when(inbound.scannedAt)} · {inbound.subject || "בלי נושא"} · {inboundOutcome}
            </>
          ) : (
            "עדיין לא הגיע מייל."
          )}
        </p>
        <p>
          <span className="font-medium text-foreground">תזכורות: </span>
          {alerts ? (
            <>
              נבדק {when(alerts.checkedAt)} ·{" "}
              {alerts.sent.length === 0 ? "לא היה מה לשלוח" : `נשלחו ${alerts.sent.length}`}
            </>
          ) : (
            "עדיין לא נבדקו."
          )}
          {" · "}
          <Link href="/activity" className="text-accent hover:underline">
            יומן פעילות
          </Link>
        </p>
      </div>
    </div>
  );
}
