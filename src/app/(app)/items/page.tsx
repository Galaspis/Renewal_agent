import Link from "next/link";
import { ItemList } from "@/components/ItemCard";
import { EmptyState } from "@/components/EmptyState";
import { IconAdd } from "@/components/Icons";
import { PageHeader } from "@/components/PageHeader";
import { btnPrimary } from "@/components/styles";
import { requireSession } from "@/lib/auth";
import { CATEGORY_LABELS } from "@/lib/categories";
import { formatMoney } from "@/lib/format";
import { annualCost } from "@/lib/insurance";
import { listItems } from "@/lib/items";
import { CATEGORIES, type Category } from "@/lib/types";

export const dynamic = "force-dynamic";

function isCategory(value: string | undefined): value is Category {
  return Boolean(value) && (CATEGORIES as readonly string[]).includes(value as string);
}

export default async function ItemsPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  await requireSession();
  const { category } = await searchParams;
  const selected = isCategory(category) ? category : null;

  const all = listItems();
  const counts = new Map<Category, number>();
  for (const item of all) counts.set(item.category, (counts.get(item.category) ?? 0) + 1);

  const items = selected ? all.filter((item) => item.category === selected) : all;
  const active = items.filter((item) => item.status === "active");
  const rest = items.filter((item) => item.status !== "active");

  // The insurance view folds into this list: the yearly total takes the place of the old page.
  const yearly = selected === "insurance" ? active.reduce((sum, item) => sum + (annualCost(item) ?? 0), 0) : null;
  const unknown = selected === "insurance" ? active.filter((item) => annualCost(item) == null).length : 0;

  const chip = (on: boolean) =>
    `inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors ${
      on ? "bg-navy text-white" : "bg-card text-muted ring-1 ring-line hover:text-navy"
    }`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="חידושים"
        description={`${active.length} פעילים${rest.length > 0 ? ` · ${rest.length} מושהים או שהסתיימו` : ""}`}
        action={
          <Link href="/items/new" className={`${btnPrimary} md:hidden`}>
            <IconAdd className="size-4" />
            הוספה
          </Link>
        }
      />

      {all.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/items" className={chip(selected == null)}>
            הכל <span className="text-xs opacity-80">{all.length}</span>
          </Link>
          {CATEGORIES.filter((value) => counts.has(value)).map((value) => (
            <Link key={value} href={`/items?category=${value}`} className={chip(selected === value)}>
              {CATEGORY_LABELS[value]} <span className="text-xs opacity-80">{counts.get(value)}</span>
            </Link>
          ))}
          {yearly != null ? (
            <span className="ms-auto text-sm text-muted">
              <span className="numeric font-semibold text-navy">{formatMoney(yearly, "ILS")}</span> לשנה
              {unknown ? ` · ${unknown} בלי מחיר` : ""}
            </span>
          ) : null}
        </div>
      ) : null}

      {all.length === 0 ? (
        <EmptyState
          title="אין חידושים עדיין"
          body="אחרי שתוסיפו את הראשון, הוא יופיע כאן תמיד, גם אם הוא רחוק."
          actionHref="/items/new"
          actionLabel="הוספת חידוש"
        />
      ) : (
        <div className="space-y-10">
          {active.length > 0 ? <ItemList items={active} /> : <p className="text-sm text-muted">אין פריטים פעילים בקטגוריה הזו.</p>}
          {rest.length > 0 ? (
            <section>
              <h2 className="mb-3 text-[15px] font-semibold text-muted">מושהים או שהסתיימו</h2>
              <div className="opacity-70">
                <ItemList items={rest} />
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
