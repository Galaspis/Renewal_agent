import type { ReactNode } from "react";
import Link from "next/link";
import { CATEGORY_LABELS, INSURANCE_TYPE_LABELS } from "@/lib/categories";
import { displayDate } from "@/lib/dates";
import { formatDaysLeft, urgencyBadgeClass } from "@/lib/format";
import type { RenewalItem } from "@/lib/types";
import { CategoryGlyph, IconBuilding, IconCalendar, IconDots, IconTag } from "./Icons";
import { cardClass } from "./styles";

function Meta({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-muted">{icon}</span>
      {children}
    </span>
  );
}

export function ItemCard({ item }: { item: RenewalItem }) {
  const category =
    item.category === "insurance" && item.subcategory
      ? `ביטוח ${INSURANCE_TYPE_LABELS[item.subcategory]}`
      : CATEGORY_LABELS[item.category];
  const bits = [
    category,
    item.insured,
    item.amount != null
      ? item.amount.toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : null,
    item.provider,
  ].filter(Boolean);

  return (
    <Link
      href={`/items/${item.id}`}
      className={`${cardClass} flex items-center gap-4 px-4 py-4 transition-shadow hover:shadow-[0_10px_28px_rgba(15,23,42,0.1)]`}
    >
      <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
        <CategoryGlyph category={item.category} className="size-7" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-base font-semibold">{item.name}</div>
        <div className="mt-0.5 truncate text-sm text-muted">{bits.join(" · ")}</div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <Meta icon={<IconCalendar className="size-3.5" />}>{displayDate(item.renewal_date)}</Meta>
          {item.amount != null ? (
            <Meta icon={<span className="text-[11px] font-semibold">₪</span>}>
              {item.amount.toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Meta>
          ) : null}
          <Meta icon={<IconTag className="size-3.5" />}>{category}</Meta>
          {item.provider ? (
            <Meta icon={<IconBuilding className="size-3.5" />}>{item.provider}</Meta>
          ) : null}
        </div>
      </div>
      {item.attention ? (
        <span className="inline-flex shrink-0 items-center rounded-full bg-danger/10 px-3 py-1 text-xs font-medium text-danger">
          דורש טיפול
        </span>
      ) : (
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${urgencyBadgeClass(item.renewal_date)}`}
        >
          <IconCalendar className="size-3.5" />
          {formatDaysLeft(item.renewal_date)}
        </span>
      )}
      <span className="hidden shrink-0 text-muted sm:inline-flex">
        <IconDots className="size-5" />
      </span>
    </Link>
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
