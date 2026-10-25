import { runAlertCheck } from "@/lib/alerts";
import { requireSession } from "@/lib/auth";
import { getSetting } from "@/lib/db";
import { daysUntil } from "@/lib/dates";
import { listActiveItems, rollForwardAutoRenewals } from "@/lib/items";
import type { RenewalItem } from "@/lib/types";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { IconAdd } from "@/components/Icons";
import { ItemList } from "@/components/ItemCard";
import { DraftsCard, Sidebar } from "@/components/Sidebar";
import { StatusLine, StatusProblems } from "@/components/StatusStrip";
import { btnPrimary } from "@/components/styles";

export const dynamic = "force-dynamic";

/** The blue panel: a greeting-sized title and one sentence that says where things stand. */
function SummaryBand({ items, needs, soon }: { items: RenewalItem[]; needs: number; soon: number }) {
  const sentence =
    items.length === 0
      ? "עוד אין חידושים במעקב."
      : needs === 0 && soon === 0
        ? `${items.length} חידושים במעקב. אין מה לטפל בו עכשיו.`
        : [needs > 0 ? `${needs} ${needs === 1 ? "דורש" : "דורשים"} טיפול` : null, soon > 0 ? `${soon} בחודש הקרוב` : null]
            .filter(Boolean)
            .join(" · ");

  return (
    <section className="rounded-2xl bg-accent px-6 py-7 text-white sm:px-8 sm:py-9">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold leading-tight sm:text-[32px]">החידושים שלך</h1>
          <p className="mt-2 text-base text-white/85">{sentence}</p>
        </div>
        <Link href="/items/new" className={`${btnPrimary} md:hidden`}>
          <IconAdd className="size-4" />
          הוספת חידוש
        </Link>
      </div>
    </section>
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
    { title: "דורש טיפול", items: [...attention, ...overdue] },
    { title: "השבוע", items: week },
    { title: "החודש", items: month },
    { title: "בהמשך", items: later },
  ].filter((group) => group.items.length > 0);

  return (
    <div className="space-y-8">
      <SummaryBand items={items} needs={attention.length + overdue.length} soon={week.length + month.length} />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-12">
        <div className="min-w-0 space-y-10">
          <StatusProblems />
          <div className="lg:hidden">
            <DraftsCard />
          </div>

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
                <h2 className="mb-3 text-base font-semibold text-navy">
                  {group.title} <span className="font-normal text-muted">({group.items.length})</span>
                </h2>
                <ItemList items={group.items} />
              </section>
            ))
          )}

          <StatusLine />
        </div>

        <div className="hidden lg:block">
          <Sidebar />
        </div>
      </div>
    </div>
  );
}
