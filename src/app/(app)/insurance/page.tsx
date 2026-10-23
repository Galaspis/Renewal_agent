import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { CategoryGlyph } from "@/components/Icons";
import { PageHeader } from "@/components/PageHeader";
import { btnPrimary, cardClass } from "@/components/styles";
import { requireSession } from "@/lib/auth";
import { INSURANCE_TYPE_LABELS, STATUS_LABELS } from "@/lib/categories";
import { daysUntil, displayDate } from "@/lib/dates";
import { formatDaysLeft, formatMoney, urgencyBadgeClass } from "@/lib/format";
import { annualCost, groupByType, listInsurance, periodProgress } from "@/lib/insurance";
import type { RenewalItem } from "@/lib/types";

export const dynamic = "force-dynamic";

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className={`${cardClass} p-4`}>
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums tracking-tight">{value}</div>
      {sub ? <div className="mt-0.5 text-xs text-muted">{sub}</div> : null}
    </div>
  );
}

function PolicyRow({ item }: { item: RenewalItem }) {
  const progress = periodProgress(item);
  const days = daysUntil(item.renewal_date);
  const yearly = annualCost(item);
  const bar = days < 0 ? "bg-danger" : days <= 60 ? "bg-warn" : "bg-accent";
  return (
    <Link
      href={`/items/${item.id}`}
      className={`${cardClass} block px-4 py-4 transition-shadow hover:shadow-[0_10px_28px_rgba(15,23,42,0.1)] ${
        item.status !== "active" ? "opacity-70" : ""
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-base font-semibold">{item.name}</div>
          <div className="mt-0.5 truncate text-sm text-muted">
            {[item.provider, item.insured, item.policy_number].filter(Boolean).join(" · ")}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {item.status !== "active" ? (
            <span className="rounded-full bg-line/60 px-3 py-1 text-xs text-muted">{STATUS_LABELS[item.status]}</span>
          ) : null}
          {item.attention ? (
            <span className="rounded-full bg-danger/10 px-3 py-1 text-xs font-medium text-danger">דורש טיפול</span>
          ) : (
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${urgencyBadgeClass(item.renewal_date)}`}>
              {formatDaysLeft(item.renewal_date)}
            </span>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span>
          {item.start_date ? `${displayDate(item.start_date)} – ` : "עד "}
          {displayDate(item.renewal_date)}
        </span>
        <span className="font-medium text-foreground">
          {yearly != null ? `${formatMoney(yearly, item.currency)} לשנה` : "מחיר לא ידוע"}
        </span>
      </div>
      {progress != null ? (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line/60">
          <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.max(2, progress)}%` }} />
        </div>
      ) : null}
    </Link>
  );
}

export default async function InsurancePage() {
  await requireSession();
  const all = listInsurance();
  const active = all.filter((item) => item.status === "active");
  const yearly = active.reduce((sum, item) => sum + (annualCost(item) ?? 0), 0);
  const unknown = active.filter((item) => annualCost(item) == null).length;
  const attention = active.filter((item) => item.attention);
  const next = active
    .filter((item) => daysUntil(item.renewal_date) >= 0)
    .sort((a, b) => a.renewal_date.localeCompare(b.renewal_date))[0];
  const groups = groupByType(all);

  return (
    <div>
      <PageHeader
        title="ביטוחים"
        description={`${active.length} פוליסות פעילות${all.length > active.length ? ` · ${all.length - active.length} מושהות או שהסתיימו` : ""}`}
        icon={<CategoryGlyph category="insurance" className="size-6 text-accent" />}
      />

      {all.length === 0 ? (
        <EmptyState
          title="אין פוליסות עדיין"
          body="הוסיפו פוליסה עם קטגוריה ״ביטוח״, או העבירו את המייל של הפוליסה לכתובת שבהגדרות."
          actionHref="/items/new"
          actionLabel="הוסף פוליסה"
        />
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat
              label="סה״כ לשנה"
              value={formatMoney(yearly, "ILS")}
              sub={unknown ? `${unknown} בלי מחיר` : `≈ ${formatMoney(Math.round(yearly / 12), "ILS")} לחודש`}
            />
            <Stat label="פוליסות" value={String(active.length)} sub={`${groups.length} סוגים`} />
            <Stat
              label="הבא לסיום"
              value={next ? formatDaysLeft(next.renewal_date) : "—"}
              sub={next ? next.name : undefined}
            />
            <Stat label="דורש טיפול" value={String(attention.length)} sub={attention[0]?.name} />
          </div>

          {attention.length > 0 ? (
            <div className="mt-6 space-y-2">
              {attention.map((item) => (
                <Link
                  key={item.id}
                  href={`/items/${item.id}`}
                  className="block rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger hover:bg-danger/10"
                >
                  <span className="font-medium">{item.name}</span>
                  {item.notes ? <span className="ms-2 text-danger/80">{item.notes.slice(0, 160)}</span> : null}
                </Link>
              ))}
            </div>
          ) : null}

          <div className="mt-8 space-y-8">
            {groups.map((group) => (
              <section key={group.type}>
                <div className="mb-3 flex items-baseline justify-between">
                  <h2 className="text-sm font-medium text-foreground">
                    {INSURANCE_TYPE_LABELS[group.type]} ({group.items.length})
                  </h2>
                  <span className="text-xs text-muted">
                    {formatMoney(group.yearly, "ILS")} לשנה{group.unknown ? ` · ${group.unknown} בלי מחיר` : ""}
                  </span>
                </div>
                <div className="grid gap-3">
                  {group.items.map((item) => (
                    <PolicyRow key={item.id} item={item} />
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-8">
            <Link href="/items/new" className={btnPrimary}>
              הוסף פוליסה
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
