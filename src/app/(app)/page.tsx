import { runAlertCheck } from "@/lib/alerts";
import { requireSession } from "@/lib/auth";
import { getSetting } from "@/lib/db";
import { daysUntil, displayDate } from "@/lib/dates";
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

/** The one sentence that is today's decision. */
function todaySentence(items: RenewalItem[], waiting: number): string {
  if (items.length === 0) return "עוד אין חידושים במעקב.";
  if (waiting === 1) return "חידוש אחד מחכה לתשובה שלך.";
  if (waiting > 1) return `${waiting} חידושים מחכים לתשובה שלך.`;
  const next = [...items].filter((i) => daysUntil(i.renewal_date) >= 0).sort((a, b) => a.renewal_date.localeCompare(b.renewal_date))[0];
  return next ? `הכל מסודר. הקרוב: ${next.name}, ${displayDate(next.renewal_date)}.` : "הכל מסודר.";
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
  const waiting = items.filter((item) => item.attention || daysUntil(item.renewal_date) < 0);
  const rest = items.filter((item) => !waiting.includes(item));
  const inRange = (from: number, to: number) =>
    rest.filter((item) => {
      const days = daysUntil(item.renewal_date);
      return days >= from && days <= to;
    });

  const groups = [
    { title: "מחכים לך", items: waiting },
    { title: "השבוע", items: inRange(0, 7) },
    { title: "החודש", items: inRange(8, 31) },
    { title: "בהמשך", items: inRange(32, 90) },
  ].filter((group) => group.items.length > 0);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-accent px-6 py-7 text-white sm:px-8 sm:py-9">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-bold leading-tight sm:text-[32px]">החידושים שלך</h1>
            <p className="mt-2 text-base text-white/85 sm:text-[17px]">{todaySentence(items, waiting.length)}</p>
          </div>
          <Link href="/items/new" className={`${btnPrimary} md:hidden`}>
            <IconAdd className="size-4" />
            הוספת חידוש
          </Link>
        </div>
      </section>

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
              body="אין חידושים בטווח הקרוב. השאר מופיע ברשימת החידושים."
              actionHref="/items"
              actionLabel="לכל החידושים"
            />
          ) : (
            groups.map((group) => (
              <section key={group.title}>
                <h2 className="mb-3 text-[15px] font-semibold text-navy">
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
