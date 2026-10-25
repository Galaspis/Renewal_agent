import Link from "next/link";
import { occurrencesBetween } from "@/lib/calendar";
import { formatISODate, todayISO } from "@/lib/dates";
import { listRecentDocuments } from "@/lib/items";
import { countPendingProposals } from "@/lib/proposals";
import { IconDocument, IconInbox } from "./Icons";
import { cardClass } from "./styles";

// The side column (desktop): this month at a glance, drafts waiting, latest files.
// Quiet by design: small headings, no decoration, nothing that competes with the list.

const MONTHS = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
const WEEKDAYS = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];

function SideTitle({ children, href, linkLabel }: { children: string; href?: string; linkLabel?: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <h2 className="text-sm font-semibold text-navy">{children}</h2>
      {href && linkLabel ? (
        <Link href={href} className="text-[13px] text-accent hover:underline">
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}

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
  const monthHref = `/calendar?m=${year}-${String(month).padStart(2, "0")}`;

  return (
    <section className={`${cardClass} p-4`}>
      <SideTitle href={monthHref} linkLabel="ליומן המלא">
        {`${MONTHS[month - 1]} ${year}`}
      </SideTitle>
      <div className="mt-3 grid grid-cols-7 text-center text-[11px] text-muted">
        {WEEKDAYS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 text-center text-[13px]">
        {cells.map((day, i) => {
          if (day == null) return <div key={`e${i}`} />;
          const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const mark = marks.get(iso);
          const isToday = iso === today;
          return (
            <Link key={iso} href={monthHref} className="flex flex-col items-center py-0.5">
              <span
                className={`flex size-7 items-center justify-center rounded-full tabular-nums ${
                  isToday ? "bg-accent font-semibold text-white" : "text-navy hover:bg-accent-soft"
                }`}
              >
                {day}
              </span>
              <span className={`mt-0.5 size-1 rounded-full ${mark === "past" ? "bg-danger" : mark === "due" ? "bg-accent" : "bg-transparent"}`} />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function RecentDocuments() {
  const docs = listRecentDocuments(3);
  return (
    <section className={`${cardClass} p-4`}>
      <SideTitle>מסמכים אחרונים</SideTitle>
      {docs.length === 0 ? (
        <p className="mt-2 text-sm text-muted">עדיין אין קבצים.</p>
      ) : (
        <ul className="mt-2">
          {docs.map((doc) => (
            <li key={doc.id} className="flex items-center gap-3 py-2">
              <IconDocument className="size-5 shrink-0 text-accent" />
              <span className="min-w-0 flex-1">
                <a href={`/api/documents/${doc.id}`} className="block truncate text-sm font-medium text-navy hover:text-accent">
                  {doc.original_name}
                </a>
                <Link href={`/items/${doc.item_id}`} className="block truncate text-[13px] text-muted hover:text-accent">
                  {doc.item_name}
                </Link>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function DraftsCard() {
  const n = countPendingProposals();
  if (n === 0) return null;
  return (
    <Link href="/inbox" className={`${cardClass} flex items-center gap-3 p-4 transition-[box-shadow] hover:ring-accent/40`}>
      <IconInbox className="size-5 shrink-0 text-accent" />
      <span className="min-w-0 flex-1 text-sm">
        <span className="font-semibold text-navy">{n === 1 ? "טיוטה אחת" : `${n} טיוטות`}</span>
        <span className="text-muted"> מחכות להחלטה</span>
      </span>
      <span className="text-[13px] text-accent">לטיוטות</span>
    </Link>
  );
}

export function Sidebar() {
  return (
    <aside className="space-y-3">
      <DraftsCard />
      <MiniCalendar />
      <RecentDocuments />
    </aside>
  );
}
