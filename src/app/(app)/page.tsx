import { setItemEnded } from "@/app/actions";
import { runAlertCheck } from "@/lib/alerts";
import { requireSession } from "@/lib/auth";
import { getSetting } from "@/lib/db";
import { daysUntil, displayDate } from "@/lib/dates";
import { listActiveItems, rollForwardAutoRenewals } from "@/lib/items";
import type { RenewalItem } from "@/lib/types";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { ItemCard } from "@/components/ItemCard";
import { DraftsCard, Sidebar } from "@/components/Sidebar";
import { StatusCard, StatusProblems } from "@/components/StatusStrip";
import { countPendingProposals } from "@/lib/proposals";
import { btnSecondary } from "@/components/styles";

export const dynamic = "force-dynamic";

/** The blue band from the approved layout: title, one line of counts, the three nearest dates. */
function SummaryBand({ items, attention, overdue }: { items: RenewalItem[]; attention: number; overdue: number }) {
  const soon = items.filter((item) => {
    const d = daysUntil(item.renewal_date);
    return d >= 0 && d <= 30 && !item.attention;
  }).length;
  const needs = attention + overdue;
  const parts = [needs > 0 ? `${needs} דורש טיפול` : null, soon > 0 ? `${soon} בקרוב` : null].filter(Boolean);
  const nearest = [...items].sort((a, b) => a.renewal_date.localeCompare(b.renewal_date)).slice(0, 3);

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
    <section className="bg-accent text-white">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-7 sm:py-9 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <h1 className="text-[28px] font-extrabold leading-tight sm:text-4xl">החידושים שלך</h1>
          <p className="mt-1.5 text-base text-white/85 sm:text-lg">
            {parts.length > 0 ? parts.join(" · ") : "הכל במעקב, אין מה לטפל בו עכשיו."}
          </p>
        </div>
        {nearest.length > 0 ? (
          <ul className="grid min-w-0 gap-2 text-[15px] lg:border-s lg:border-white/30 lg:ps-8">
            {nearest.map((item) => (
              <li key={item.id} className="grid min-w-0 grid-cols-[12px_auto_auto_minmax(0,1fr)] items-center gap-x-3">
                <span className={`size-3 rounded-full ${dot(item)}`} />
                <span className="whitespace-nowrap text-white/85">{label(item)}</span>
                <span className="numeric whitespace-nowrap font-semibold">{displayDate(item.renewal_date)}</span>
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
            <div className="mt-2 flex flex-wrap items-center gap-2 px-2 text-sm text-muted">
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
    <>
      {/* The band spans the page; the layout's padding is undone for it and restored below. */}
      <div className="-mx-4 -mt-6 md:-mt-8">
        <SummaryBand items={items} attention={attention.length} overdue={overdue.length} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
        <div className="min-w-0 space-y-6">
          <StatusProblems />
          {pendingDrafts > 0 ? (
            <div className="lg:hidden">
              <DraftsCard />
            </div>
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
            groups.map((group) => (
              <section key={group.title}>
                <h2 className="section-title mb-3">
                  {group.title} <span className="count">({group.items.length})</span>
                </h2>
                <GroupList items={group.items} />
              </section>
            ))
          )}
        </div>

        <div className="hidden lg:block">
          <Sidebar />
        </div>
        <div className="lg:hidden">
          <StatusCard />
        </div>
      </div>
    </>
  );
}
