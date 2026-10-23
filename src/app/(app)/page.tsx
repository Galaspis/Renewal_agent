import { setItemEnded } from "@/app/actions";
import { runAlertCheck } from "@/lib/alerts";
import { requireSession } from "@/lib/auth";
import { getSetting } from "@/lib/db";
import { daysUntil, displayDate } from "@/lib/dates";
import { listActiveItems, rollForwardAutoRenewals } from "@/lib/items";
import { countPendingProposals } from "@/lib/proposals";
import type { RenewalItem } from "@/lib/types";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { ItemCard } from "@/components/ItemCard";
import { StatusStrip } from "@/components/StatusStrip";
import { btnSecondary, cardClass } from "@/components/styles";

export const dynamic = "force-dynamic";

/** The blue band from the approved layout: title, one line of counts, the three nearest dates. */
function SummaryBand({ items, attention, overdue }: { items: RenewalItem[]; attention: number; overdue: number }) {
  const soon = items.filter((item) => {
    const d = daysUntil(item.renewal_date);
    return d >= 0 && d <= 30;
  }).length;
  const needs = attention + overdue;
  const parts = [
    needs > 0 ? `${needs} דורש טיפול` : null,
    soon > 0 ? `${soon} בקרוב` : null,
  ].filter(Boolean);
  const nearest = [...items]
    .sort((a, b) => a.renewal_date.localeCompare(b.renewal_date))
    .slice(0, 3);

  const dot = (item: RenewalItem) => {
    const d = daysUntil(item.renewal_date);
    if (item.attention || d < 0) return "bg-primary";
    if (d <= 7) return "bg-[#8fb4ff]";
    return "bg-white";
  };
  const label = (item: RenewalItem) => {
    const d = daysUntil(item.renewal_date);
    if (item.attention || d < 0) return "דורש טיפול";
    if (d === 0) return "היום";
    if (d === 1) return "מחר";
    return `בעוד ${d} ימים`;
  };

  return (
    <section className="mt-5 rounded-2xl bg-accent px-5 py-5 text-white sm:px-7 sm:py-6">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">החידושים שלך</h1>
          <p className="mt-1 text-sm text-white/85 sm:text-base">
            {parts.length > 0 ? parts.join(" · ") : "הכל במעקב, אין מה לטפל בו עכשיו."}
          </p>
        </div>
        {nearest.length > 0 ? (
          <ul className="grid gap-1.5 text-sm sm:border-s sm:border-white/30 sm:ps-6">
            {nearest.map((item) => (
              <li key={item.id} className="flex items-center gap-3">
                <span className={`size-3 shrink-0 rounded-full ${dot(item)}`} />
                <span className="w-24 text-white/85">{label(item)}</span>
                <span className="numeric font-medium">{displayDate(item.renewal_date)}</span>
                <Link href={`/items/${item.id}`} className="truncate text-white/85 hover:text-white hover:underline">
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

/** Any overdue item, in whichever group it sits, gets its second answer under the card. */
function GroupList({ items }: { items: RenewalItem[] }) {
  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <div key={item.id}>
          <ItemCard item={item} />
          {daysUntil(item.renewal_date) < 0 ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 px-2 text-xs text-muted">
              <span>באיחור. אם ביטלתם את המנוי:</span>
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
      <SummaryBand items={items} attention={attention.length} overdue={overdue.length} />

      <StatusStrip />

      {pendingDrafts > 0 ? (
        <Link
          href="/inbox"
          className={`${cardClass} mt-3 flex items-center justify-between border-s-4 border-s-primary px-5 py-4 text-sm hover:border-accent`}
        >
          <span>
            <span className="me-2 inline-flex min-w-6 items-center justify-center rounded-full bg-danger px-2 text-xs font-bold leading-6 text-white">
              {pendingDrafts}
            </span>
            {pendingDrafts === 1 ? "טיוטה אחת ממתינה להחלטה" : "טיוטות ממתינות להחלטה"}
          </span>
          <span className="font-bold text-accent">לפתיחה</span>
        </Link>
      ) : null}

      {items.length === 0 ? (
        <EmptyState
          title="עוד אין חידושים"
          body="הוסיפו ידנית, או העבירו מייל (פוליסה, חשבונית, הודעת חידוש) לכתובת שמופיעה בהגדרות."
          actionHref="/items/new"
          actionLabel="הוספת חידוש"
        />
      ) : groups.length === 0 ? (
        <EmptyState
          title="הכל שקט ל־90 יום"
          body="אין חידושים בטווח הקרוב. השאר מופיע במסך ״כל החידושים״."
          actionHref="/items"
          actionLabel="לכל החידושים"
        />
      ) : (
        <div className="mt-8 space-y-7">
          {groups.map((group) => (
            <section key={group.title}>
              <h2 className="mb-3 text-base font-bold text-navy">
                {group.title} <span className="text-muted">({group.items.length})</span>
              </h2>
              <GroupList items={group.items} />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
