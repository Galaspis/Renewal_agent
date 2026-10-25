import Link from "next/link";
import { markRenewed } from "@/app/actions";
import { CATEGORY_LABELS, INSURANCE_TYPE_LABELS } from "@/lib/categories";
import { daysUntil, displayDate } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import type { RenewalItem } from "@/lib/types";
import { CategoryGlyph, IconAlert, IconTick } from "./Icons";
import { btnPrimary, btnSecondary, cardClass } from "./styles";

// The renewal card from the approved Karbol layout.
// Right (start): category icon in a pale circle, category line, name, date and status in words.
// Left (end): the amount, and under it the two answers: "חידשתי" in orange and "לפרטים".
// A 4px edge in red when the item needs you (overdue or flagged), blue otherwise.

export function statusWords(item: RenewalItem): { text: string; tone: "danger" | "soon" | "calm" } {
  const days = daysUntil(item.renewal_date);
  if (days < 0) {
    const n = -days;
    return { text: n === 1 ? "באיחור של יום" : `באיחור של ${n} ימים`, tone: "danger" };
  }
  if (days === 0) return { text: "היום", tone: "soon" };
  if (days === 1) return { text: "מחר", tone: "soon" };
  if (days <= 7) return { text: `בעוד ${days} ימים`, tone: "soon" };
  return { text: `בעוד ${days} ימים`, tone: "calm" };
}

export function ItemCard({ item }: { item: RenewalItem }) {
  const category =
    item.category === "insurance" && item.subcategory
      ? `ביטוח ${INSURANCE_TYPE_LABELS[item.subcategory]}`
      : CATEGORY_LABELS[item.category];
  const status = statusWords(item);
  const urgent = item.attention === 1 || status.tone === "danger";
  const active = item.status === "active";
  const meta = [category, item.provider, item.insured].filter(Boolean).join(" · ");

  return (
    <article className={`${cardClass} overflow-hidden border-s-4 ${urgent ? "border-s-danger" : "border-s-accent"}`}>
      <div className="grid gap-4 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:p-5">
        <div className="flex min-w-0 items-center gap-4 sm:contents">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent sm:size-[68px]">
            <CategoryGlyph category={item.category} subcategory={item.subcategory} className="size-8 sm:size-9" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-[13px] text-muted">{meta}</div>
            <Link
              href={`/items/${item.id}`}
              className="mt-0.5 block truncate text-xl font-bold leading-7 text-navy hover:text-accent"
            >
              {item.name}
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px]">
              <span className="text-muted">
                תאריך חידוש <span className="numeric font-semibold text-foreground">{displayDate(item.renewal_date)}</span>
              </span>
              {active ? (
                status.tone === "danger" || item.attention ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-danger/10 px-2 py-0.5 text-sm font-bold text-danger">
                    <IconAlert className="size-4" />
                    {item.attention && status.tone !== "danger" ? "דורש טיפול" : status.text}
                  </span>
                ) : (
                  <span className={`text-sm font-bold ${status.tone === "soon" ? "text-accent" : "text-accent/80"}`}>
                    {status.text}
                  </span>
                )
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:gap-3">
          {item.amount != null ? (
            <div className="numeric text-2xl font-bold tracking-tight text-navy">{formatMoney(item.amount, item.currency)}</div>
          ) : (
            <div className="text-sm text-muted">ללא מחיר</div>
          )}
          <div className="flex gap-2">
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
        </div>
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
