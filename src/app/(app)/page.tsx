import type { ReactNode } from "react";
import { markRenewed, setItemEnded } from "@/app/actions";
import { runAlertCheck } from "@/lib/alerts";
import { requireSession } from "@/lib/auth";
import { getSetting } from "@/lib/db";
import { daysUntil } from "@/lib/dates";
import { listActiveItems, rollForwardAutoRenewals } from "@/lib/items";
import { countPendingProposals } from "@/lib/proposals";
import type { RenewalItem } from "@/lib/types";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { IconAlarm, IconCalendar, IconCheck, IconSparkle } from "@/components/Icons";
import { ItemCard } from "@/components/ItemCard";
import { PageHeader } from "@/components/PageHeader";
import { StatusStrip } from "@/components/StatusStrip";
import { btnSecondary, cardClass } from "@/components/styles";

export const dynamic = "force-dynamic";

function Stat({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  tone: "accent" | "ok" | "warn" | "danger";
}) {
  const tones = {
    accent: "bg-accent-soft text-accent",
    ok: "bg-ok/10 text-ok",
    warn: "bg-warn/10 text-warn",
    danger: "bg-danger/10 text-danger",
  };

  return (
    <div className={`${cardClass} flex items-center justify-between px-5 py-4`}>
      <div>
        <div className="text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
        <div className="mt-1 text-sm text-muted">{label}</div>
      </div>
      <span className={`flex size-11 items-center justify-center rounded-full ${tones[tone]}`}>{icon}</span>
    </div>
  );
}

/** Any overdue item, in whichever group it sits, gets its two quick answers under the card. */
function GroupList({ items }: { items: RenewalItem[] }) {
  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <div key={item.id}>
          <ItemCard item={item} />
          {daysUntil(item.renewal_date) < 0 ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 px-2 text-xs text-muted">
              <span>באיחור. מה קרה?</span>
              <form action={markRenewed.bind(null, item.id)}>
                <button type="submit" className={btnSecondary}>
                  {item.cadence === "once" ? "בוצע" : "חידשתי"}
                </button>
              </form>
              <form action={setItemEnded.bind(null, item.id)}>
                <button type="submit" className={btnSecondary}>
                  ביטלתי, לסיים
                </button>
              </form>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export default async function DashboardPage() {
  await requireSession();
  rollForwardAutoRenewals();
  if (getSetting("auto_check") !== "0") {
    try {
      await runAlertCheck();
    } catch {
      // Dashboard still loads if mail is down.
    }
  }
  const items = listActiveItems();
  const pendingDrafts = countPendingProposals();
  const attention = items.filter((item) => item.attention);
  const rest = items.filter((item) => !item.attention);
  const overdue = rest.filter((item) => daysUntil(item.renewal_date) < 0);
  const week = rest.filter((item) => {
    const days = daysUntil(item.renewal_date);
    return days >= 0 && days <= 7;
  });
  const month = rest.filter((item) => {
    const days = daysUntil(item.renewal_date);
    return days > 7 && days <= 31;
  });
  const later = rest.filter((item) => {
    const days = daysUntil(item.renewal_date);
    return days > 31 && days <= 90;
  });

  const groups = [
    { title: "דורש טיפול", items: attention },
    { title: "באיחור", items: overdue },
    { title: "השבוע", items: week },
    { title: "החודש", items: month },
    { title: "בהמשך", items: later },
  ].filter((group) => group.items.length > 0);

  return (
    <div>
      <PageHeader
        title="הקרובים"
        description="מה שדורש תשומת לב ב־90 הימים הקרובים"
        icon={<IconCalendar className="size-6 text-accent" />}
      />

      <StatusStrip />

      {pendingDrafts > 0 ? (
        <Link
          href="/inbox"
          className={`${cardClass} mt-3 flex items-center justify-between border border-danger/20 px-5 py-4 text-sm hover:shadow-[0_10px_28px_rgba(15,23,42,0.1)]`}
        >
          <span>
            <span className="me-2 inline-flex min-w-6 items-center justify-center rounded-full bg-danger px-2 text-xs font-semibold leading-6 text-white">
              {pendingDrafts}
            </span>
            {pendingDrafts === 1 ? "טיוטה אחת ממתינה להחלטה" : "טיוטות ממתינות להחלטה"}
          </span>
          <span className="font-medium text-accent">לפתיחה</span>
        </Link>
      ) : null}

      {items.length > 0 ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="פעילים" value={items.length} icon={<IconCheck className="size-5" />} tone="accent" />
          <Stat label="החודש" value={month.length} icon={<IconSparkle className="size-5" />} tone="ok" />
          <Stat label="השבוע" value={week.length} icon={<IconCalendar className="size-5" />} tone="warn" />
          <Stat label="באיחור" value={overdue.length} icon={<IconAlarm className="size-5" />} tone="danger" />
        </div>
      ) : null}

      {items.length === 0 ? (
        <EmptyState
          title="עוד אין מנויים"
          body="הוסיפו ידנית, או העבירו מייל (פוליסה, חשבונית, הודעת חידוש) לכתובת שמופיעה בהגדרות."
          actionHref="/items/new"
          actionLabel="הוסף מנוי"
        />
      ) : groups.length === 0 ? (
        <EmptyState
          title="הכל שקט ל־90 יום"
          body="אין מנויים בטווח הקרוב. השאר מופיע במסך ״הכל״."
          actionHref="/items"
          actionLabel="לכל הפריטים"
        />
      ) : (
        <div className="mt-8 space-y-6">
          {groups.map((group) => (
            <section key={group.title}>
              <h2 className="mb-3 text-sm font-medium text-foreground">
                {group.title} ({group.items.length})
              </h2>
              <GroupList items={group.items} />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
