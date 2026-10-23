import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { btnSecondary, cardClass } from "@/components/styles";
import { requireSession } from "@/lib/auth";
import { occurrencesBetween } from "@/lib/calendar";
import { CATEGORY_LABELS } from "@/lib/categories";
import { displayDate, formatISODate, todayISO } from "@/lib/dates";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

const MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];
const WEEKDAYS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

function parseMonth(raw: string | undefined): { year: number; month: number } {
  const match = /^(\d{4})-(\d{2})$/.exec(raw ?? "");
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (month >= 1 && month <= 12) return { year, month };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function monthParam(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function shiftMonth(year: number, month: number, delta: number) {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  await requireSession();
  const { m } = await searchParams;
  const { year, month } = parseMonth(m);
  const first = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const from = formatISODate(first);
  const to = formatISODate(new Date(year, month - 1, daysInMonth));
  const today = todayISO();

  const occurrences = occurrencesBetween(from, to);
  const byDay = new Map<string, typeof occurrences>();
  for (const occ of occurrences) {
    const list = byDay.get(occ.date) ?? [];
    list.push(occ);
    byDay.set(occ.date, list);
  }

  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const now = new Date();
  const leading = first.getDay(); // Sunday = 0, week starts Sunday
  const cells: (number | null)[] = [...Array<null>(leading).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      <PageHeader
        title="יומן"
        description={`${occurrences.length} חידושים ב${MONTHS[month - 1]} ${year}`}
      />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Link href={`/calendar?m=${monthParam(prev.year, prev.month)}`} className={btnSecondary}>
          ‹ {MONTHS[prev.month - 1]}
        </Link>
        <Link href={`/calendar?m=${monthParam(next.year, next.month)}`} className={btnSecondary}>
          {MONTHS[next.month - 1]} ›
        </Link>
        {year !== now.getFullYear() || month !== now.getMonth() + 1 ? (
          <Link href="/calendar" className={btnSecondary}>
            היום
          </Link>
        ) : null}
        <Link href="/settings#calendar" className="ms-auto text-sm text-accent hover:underline">
          חיבור ליומן Google
        </Link>
      </div>

      <div className={`${cardClass} mt-4 overflow-hidden`}>
        <div className="grid grid-cols-7 border-b border-line text-center text-xs font-medium text-muted">
          {WEEKDAYS.map((day) => (
            <div key={day} className="py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, index) => {
            if (day == null) return <div key={`empty-${index}`} className="min-h-16 border-b border-e border-line/60 bg-background/40 sm:min-h-24" />;
            const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const list = byDay.get(iso) ?? [];
            const isToday = iso === today;
            return (
              <div key={iso} className="min-h-16 border-b border-e border-line/60 p-1.5 sm:min-h-24">
                <div
                  className={`inline-flex size-6 items-center justify-center rounded-full text-xs ${
                    isToday ? "bg-accent font-semibold text-white" : "text-muted"
                  }`}
                >
                  {day}
                </div>
                <div className="mt-1 space-y-1">
                  {list.slice(0, 3).map((occ) => (
                    <Link
                      key={`${occ.item.id}-${occ.date}`}
                      href={`/items/${occ.item.id}`}
                      title={occ.item.name}
                      className={`block truncate rounded px-1 py-0.5 text-[11px] leading-4 sm:text-xs ${
                        iso < today ? "bg-danger/10 text-danger" : "bg-accent-soft text-accent"
                      }`}
                    >
                      {occ.item.name}
                    </Link>
                  ))}
                  {list.length > 3 ? <div className="px-1 text-[11px] text-muted">+{list.length - 3}</div> : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {occurrences.length > 0 ? (
        <ul className="mt-6 grid gap-2">
          {occurrences.map((occ) => (
            <li key={`${occ.item.id}-${occ.date}-row`}>
              <Link href={`/items/${occ.item.id}`} className={`${cardClass} flex items-center gap-4 px-4 py-3 text-sm`}>
                <span className={`w-20 shrink-0 font-medium ${occ.date < today ? "text-danger" : ""}`}>{displayDate(occ.date)}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{occ.item.name}</span>
                <span className="hidden truncate text-muted sm:inline">
                  {CATEGORY_LABELS[occ.item.category]}
                  {occ.item.provider ? ` · ${occ.item.provider}` : ""}
                </span>
                <span className="shrink-0 text-muted">{formatMoney(occ.item.amount, occ.item.currency)}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-sm text-muted">אין חידושים בחודש הזה.</p>
      )}
    </div>
  );
}
