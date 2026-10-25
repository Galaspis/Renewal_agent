import Link from "next/link";
import { markRenewed } from "@/app/actions";
import { daysUntil, displayDate } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import type { RenewalItem } from "@/lib/types";
import { CategoryGlyph, IconTick } from "./Icons";
import { btnPrimary, cardClass } from "./styles";

// One row per renewal. The name is the only loud thing; the date and its status share
// one quiet line; the amount sits small at the end. The whole card opens the item.
// Only an item that needs you gets a red edge and the orange "חידשתי".

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
  const status = statusWords(item);
  const active = item.status === "active";
  const needsYou = active && (item.attention === 1 || status.tone === "danger");
  const statusText = item.attention && status.tone !== "danger" ? "דורש טיפול" : status.text;
  const statusClass =
    !active ? "text-muted" : needsYou ? "text-danger font-semibold" : status.tone === "soon" ? "text-accent font-semibold" : "text-muted";

  return (
    <article
      className={`${cardClass} flex flex-wrap items-center transition-[box-shadow] hover:ring-accent/40 sm:flex-nowrap ${needsYou ? "border-s-[3px] border-s-danger" : ""}`}
    >
      <Link href={`/items/${item.id}`} className="flex min-w-0 flex-1 items-center gap-4 p-4 sm:px-5" aria-label={item.name}>
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
          <CategoryGlyph category={item.category} subcategory={item.subcategory} className="size-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[17px] font-semibold leading-6 text-navy">{item.name}</span>
          <span className="mt-0.5 block truncate text-sm text-muted">
            <span className="numeric">{displayDate(item.renewal_date)}</span>
            {active ? (
              <>
                <span className="mx-1.5">·</span>
                <span className={statusClass}>{statusText}</span>
              </>
            ) : null}
            {item.provider ? (
              <>
                <span className="mx-1.5">·</span>
                {item.provider}
              </>
            ) : null}
          </span>
        </span>
        <span className="numeric hidden w-28 shrink-0 text-start text-sm text-muted sm:block">
          {item.amount != null ? formatMoney(item.amount, item.currency) : ""}
        </span>
      </Link>
      {needsYou ? (
        <form action={markRenewed.bind(null, item.id)} className="basis-full px-4 pb-4 sm:basis-auto sm:shrink-0 sm:p-0 sm:pe-5">
          <button type="submit" className={btnPrimary}>
            <IconTick className="size-4" />
            {item.cadence === "once" ? "בוצע" : "חידשתי"}
          </button>
        </form>
      ) : null}
    </article>
  );
}

export function ItemList({ items }: { items: RenewalItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {items.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  );
}
