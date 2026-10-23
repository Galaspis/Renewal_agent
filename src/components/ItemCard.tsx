import Link from "next/link";
import { markRenewed } from "@/app/actions";
import { CATEGORY_LABELS, INSURANCE_TYPE_LABELS } from "@/lib/categories";
import { daysUntil, displayDate } from "@/lib/dates";
import { formatDaysLeft, formatMoney } from "@/lib/format";
import type { RenewalItem } from "@/lib/types";
import { CategoryGlyph, IconTick } from "./Icons";
import { btnPrimary, btnSecondary, cardClass } from "./styles";

// The renewal card from the approved Karbol layout: a coloured edge (red when it needs
// you, blue otherwise), the category icon in a pale circle, the name, the date with its
// status in words, the amount, and two answers: "חידשתי" in orange and "לפרטים".

function statusClass(days: number): string {
  if (days < 0) return "bg-danger/10 text-danger";
  if (days <= 7) return "text-accent";
  return "text-accent/80";
}

export function ItemCard({ item }: { item: RenewalItem }) {
  const category =
    item.category === "insurance" && item.subcategory
      ? `ביטוח ${INSURANCE_TYPE_LABELS[item.subcategory]}`
      : CATEGORY_LABELS[item.category];
  const days = daysUntil(item.renewal_date);
  const urgent = item.attention === 1 || days < 0;
  const edge = urgent ? "border-s-danger" : "border-s-accent";
  const active = item.status === "active";

  return (
    <article className={`${cardClass} border-s-4 ${edge} px-4 py-4 sm:px-5`}>
      <div className="flex items-start gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent sm:size-16">
          <CategoryGlyph category={item.category} subcategory={item.subcategory} className="size-8" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted">
            {category}
            {item.provider ? ` · ${item.provider}` : ""}
            {item.insured ? ` · ${item.insured}` : ""}
          </div>
          <Link href={`/items/${item.id}`} className="mt-0.5 block truncate text-lg font-bold leading-7 text-navy hover:text-accent">
            {item.name}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="text-muted">
              תאריך חידוש <span className="numeric font-medium text-foreground">{displayDate(item.renewal_date)}</span>
            </span>
            {active ? (
              <span className={`rounded-md px-2 py-0.5 text-sm font-bold ${statusClass(days)}`}>
                {item.attention ? "דורש טיפול · " : ""}
                {days < 0 ? formatDaysLeft(item.renewal_date) : days === 0 ? "היום" : days === 1 ? "מחר" : `בעוד ${days} ימים`}
              </span>
            ) : null}
          </div>
        </div>
        {item.amount != null ? (
          <div className="numeric shrink-0 text-xl font-bold text-navy sm:text-2xl">{formatMoney(item.amount, item.currency)}</div>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 ps-0 sm:ps-20">
        {active ? (
          <form action={markRenewed.bind(null, item.id)}>
            <button type="submit" className={btnPrimary}>
              <IconTick className="size-4" />
              {item.cadence === "once" ? "בוצע" : "חידשתי"}
            </button>
          </form>
        ) : null}
        <Link href={`/items/${item.id}`} className={btnSecondary}>
          לפרטים
        </Link>
      </div>
    </article>
  );
}

export function ItemList({ items }: { items: RenewalItem[] }) {
  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  );
}
