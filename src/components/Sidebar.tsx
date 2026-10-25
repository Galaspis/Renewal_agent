import Link from "next/link";
import { occurrencesBetween } from "@/lib/calendar";
import { formatISODate, todayISO } from "@/lib/dates";
import { bytesLabel } from "@/lib/format";
import { listRecentDocuments } from "@/lib/items";
import { countPendingProposals } from "@/lib/proposals";
import { IconBack, IconDocument, IconInbox } from "./Icons";
import { StatusCard } from "./StatusStrip";
import { cardClass } from "./styles";

// The left column of the approved layout (desktop only): this month at a glance,
// the latest documents, the drafts waiting, and what the tool last did.

const MONTHS = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
const WEEKDAYS = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];

function MiniCalendar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const first = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const from = formatISODate(first);
  const to = formatISODate(new Date(year, month - 1, daysInMonth));
  const today = todayISO();
  const marks = new Map<string, "past" | "due">();
  for (const occ of occurrencesBetween(from, to)) {
    marks.set(occ.date, occ.date < today ? "past" : "due");
  }
  const cells: (number | null)[] = [...Array<null>(first.getDay()).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <section className={`${cardClass} p-4`}>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-navy">
          {MONTHS[month - 1]} {year}
        </h2>
        <Link href="/calendar" className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
          ליומן המלא
          <IconBack className="size-4 rotate-180" />
        </Link>
      </div>
      <div className="mt-3 grid grid-cols-7 text-center text-[11px] font-medium text-muted">
        {WEEKDAYS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-y-1 text-center text-sm">
        {cells.map((day, i) => {
          if (day == null) return <div key={`e${i}`} />;
          const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const mark = marks.get(iso);
          const isToday = iso === today;
          return (
            <Link
              key={iso}
              href={`/calendar?m=${year}-${String(month).padStart(2, "0")}`}
              className="flex flex-col items-center gap-0.5 py-0.5"
            >
              <span
                className={`flex size-8 items-center justify-center rounded-full tabular-nums ${
                  isToday ? "bg-accent font-bold text-white" : "text-foreground hover:bg-accent-soft"
                }`}
              >
                {day}
              </span>
              <span className={`size-1.5 rounded-full ${mark === "past" ? "bg-danger" : mark === "due" ? "bg-primary" : "bg-transparent"}`} />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function RecentDocuments() {
  const docs = listRecentDocuments(4);
  return (
    <section className={`${cardClass} p-4`}>
      <h2 className="text-base font-bold text-navy">מסמכים אחרונים</h2>
      {docs.length === 0 ? (
        <p className="mt-2 text-sm text-muted">עדיין אין קבצים. פוליסה שמועברת במייל נשמרת כאן לבד.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {docs.map((doc) => (
            <li key={doc.id} className="flex items-center gap-3 py-2.5">
              <span
                className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
                  /pdf/i.test(doc.mime) ? "bg-primary-soft text-primary" : "bg-accent-soft text-accent"
                }`}
              >
                <IconDocument className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <a href={`/api/documents/${doc.id}`} className="block truncate text-sm font-semibold hover:text-accent">
                  {doc.original_name}
                </a>
                <Link href={`/items/${doc.item_id}`} className="block truncate text-xs text-muted hover:text-accent">
                  {doc.item_name} · {bytesLabel(doc.size_bytes)}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function DraftsCard() {
  const n = countPendingProposals();
  return (
    <Link
      href="/inbox"
      className={`${cardClass} flex items-center gap-3 p-4 transition-colors hover:border-accent ${n > 0 ? "border-s-4 border-s-primary" : ""}`}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
        <IconInbox className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-bold text-navy">טיוטות מיילים</span>
        <span className="block text-sm text-muted">
          {n === 0 ? "אין טיוטות ממתינות" : n === 1 ? "טיוטה אחת מחכה להחלטה" : `${n} טיוטות מחכות להחלטה`}
        </span>
      </span>
      {n > 0 ? (
        <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-danger px-2 text-sm font-bold leading-7 text-white">{n}</span>
      ) : null}
      <IconBack className="size-5 rotate-180 text-muted" />
    </Link>
  );
}

export function Sidebar() {
  return (
    <aside className="space-y-4">
      <MiniCalendar />
      <DraftsCard />
      <RecentDocuments />
      <StatusCard />
    </aside>
  );
}
