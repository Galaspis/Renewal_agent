import Link from "next/link";
import { ItemList } from "@/components/ItemCard";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { requireSession } from "@/lib/auth";
import { CATEGORY_LABELS } from "@/lib/categories";
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

  const pill = (on: boolean) =>
    `inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 text-sm transition-colors ${
      on ? "bg-accent text-white" : "bg-card text-muted shadow-[0_2px_8px_rgba(15,23,42,0.06)] hover:text-foreground"
    }`;

  return (
    <div>
      <PageHeader
        title="הכל"
        description={`${active.length} פעילים · ${rest.length} מושהים או שהסתיימו`}
      />

      {all.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/items" className={pill(selected == null)}>
            הכל
            <span className="text-xs opacity-80">{all.length}</span>
          </Link>
          {CATEGORIES.filter((value) => counts.has(value)).map((value) => (
            <Link key={value} href={`/items?category=${value}`} className={pill(selected === value)}>
              {CATEGORY_LABELS[value]}
              <span className="text-xs opacity-80">{counts.get(value)}</span>
            </Link>
          ))}
        </div>
      ) : null}

      {all.length === 0 ? (
        <EmptyState
          title="אין מנויים עדיין"
          body="אחרי שתוסיפו את המנוי הראשון, הוא יופיע כאן תמיד — גם אם הוא רחוק."
          actionHref="/items/new"
          actionLabel="הוסף מנוי"
        />
      ) : (
        <div className="mt-6 space-y-8">
          {active.length > 0 ? <ItemList items={active} /> : null}
          {rest.length > 0 ? (
            <section>
              <h2 className="mb-3 text-sm font-medium text-foreground">מושהים או שהסתיימו</h2>
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
