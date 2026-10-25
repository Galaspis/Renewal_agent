import Link from "next/link";
import { notFound } from "next/navigation";
import {
  acknowledgeItem,
  clearAttention,
  deleteItem,
  markRenewed,
  pauseItem,
  removeDocument,
  resumeItem,
  setItemEnded,
  snoozeItem,
  uploadDocument,
} from "@/app/actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { FilePicker } from "@/components/FilePicker";
import { CategoryGlyph, IconDocument, IconTick } from "@/components/Icons";
import { statusWords } from "@/components/ItemCard";
import { btnPrimary } from "@/components/styles";
import { requireSession } from "@/lib/auth";
import { CADENCE_LABELS, CATEGORY_LABELS, INSURANCE_TYPE_LABELS, STATUS_LABELS, milestoneLabel } from "@/lib/categories";
import { displayDate, todayISO } from "@/lib/dates";
import { bytesLabel, formatMoney } from "@/lib/format";
import { getItem, listDocuments } from "@/lib/items";
import { reminderState } from "@/lib/reminder-state";

export const dynamic = "force-dynamic";

const textLink = "text-sm font-medium text-accent hover:underline";
const quietLink = "text-sm text-muted hover:text-navy";

function Fact({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className={`mt-0.5 truncate text-[15px] font-medium text-navy ${ltr ? "numeric" : ""}`}>{value}</dd>
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">{children}</h2>;
}

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const item = getItem(id);
  if (!item) notFound();
  const documents = listDocuments(id);
  const reminders = reminderState(item);
  const status = statusWords(item);
  const category =
    item.category === "insurance" && item.subcategory
      ? `ביטוח ${INSURANCE_TYPE_LABELS[item.subcategory]}`
      : CATEGORY_LABELS[item.category];
  const active = item.status === "active";
  const overdue = active && status.tone === "danger";
  const needsYou = active && (item.attention === 1 || overdue);

  return (
    <div className="mx-auto max-w-2xl">
      <nav className="text-[13px] text-muted">
        <Link href="/items" className="hover:text-navy">
          חידושים
        </Link>
        <span className="px-1.5">/</span>
        <Link href={`/items?category=${item.category}`} className="hover:text-navy">
          {category}
        </Link>
      </nav>

      {/* The item: name, one meta line, one date line, one action. */}
      <header className="mt-4 flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
          <CategoryGlyph category={item.category} subcategory={item.subcategory} className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-[26px] font-bold leading-tight text-navy sm:text-[28px]">{item.name}</h1>
          <p className="mt-1 text-[15px] text-muted">
            {[category, item.provider, item.insured].filter(Boolean).join(" · ")}
            {!active ? ` · ${STATUS_LABELS[item.status]}` : ""}
          </p>
          <p className="mt-3 text-[15px]">
            <span className="numeric font-semibold text-navy">{displayDate(item.renewal_date)}</span>
            {active ? (
              <>
                <span className="mx-2 text-muted">·</span>
                <span className={needsYou ? "font-semibold text-danger" : status.tone === "soon" ? "font-semibold text-accent" : "text-muted"}>
                  {status.text}
                </span>
                {item.attention ? (
                  <>
                    <span className="mx-2 text-muted">·</span>
                    <span className="font-semibold text-danger">דורש טיפול</span>
                    <span className="mx-2 text-muted">·</span>
                    <form action={clearAttention.bind(null, item.id)} className="inline">
                      <button type="submit" className={quietLink}>
                        הסר סימון
                      </button>
                    </form>
                  </>
                ) : null}
              </>
            ) : null}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
            {active ? (
              <form action={markRenewed.bind(null, item.id)}>
                <button type="submit" className={btnPrimary}>
                  <IconTick className="size-4" />
                  {item.cadence === "once" ? "בוצע" : "חידשתי"}
                </button>
              </form>
            ) : (
              <form action={resumeItem.bind(null, item.id)}>
                <button type="submit" className={btnPrimary}>
                  חידוש פעילות
                </button>
              </form>
            )}
            <Link href={`/items/${item.id}/edit`} className={textLink}>
              עריכה
            </Link>
            {overdue ? (
              <form action={setItemEnded.bind(null, item.id)}>
                <button type="submit" className={quietLink}>
                  ביטלתי, לסיים
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </header>

      <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-line pt-6 sm:grid-cols-4">
        <Fact label="מחיר" value={formatMoney(item.amount, item.currency)} ltr />
        <Fact
          label="תדירות"
          value={`${CADENCE_LABELS[item.cadence]}${item.cadence === "custom" && item.cadence_months ? ` · ${item.cadence_months} חודשים` : ""}`}
        />
        <Fact label="חידוש אוטומטי" value={item.auto_renew ? "כן" : "לא"} />
        <Fact label="התראה" value={`${item.notice_days} ימים לפני`} />
        {item.start_date ? <Fact label="תחילת תוקף" value={displayDate(item.start_date)} /> : null}
        {item.policy_number ? <Fact label="מספר פוליסה" value={item.policy_number} ltr /> : null}
      </dl>

      {item.notes ? (
        <section className="mt-10">
          <SectionTitle>הערות</SectionTitle>
          <p className="mt-2 whitespace-pre-wrap text-[15px] leading-7 text-navy">{item.notes}</p>
        </section>
      ) : null}

      <section className="mt-10">
        <SectionTitle>תזכורות</SectionTitle>
        <div className="mt-2 space-y-1 text-[15px]">
          {reminders.quiet ? (
            <p className="text-muted">{reminders.quiet}</p>
          ) : reminders.next ? (
            <p>
              <span className="text-muted">הבאה: </span>
              {reminders.next.label} · <span className="numeric">{displayDate(reminders.next.date)}</span>
              {reminders.next.date <= todayISO() ? <span className="text-muted"> (בבדיקה היומית הבאה)</span> : null}
            </p>
          ) : (
            <p className="text-muted">אין עוד תזכורות צפויות למחזור הזה.</p>
          )}
          {reminders.sent.map((row) => (
            <p key={row.id} className="text-sm text-muted">
              נשלחה <span className="numeric">{displayDate(row.sent_at.slice(0, 10))}</span> ·{" "}
              {row.milestone < 0 ? "תזכורת איחור" : milestoneLabel(row.milestone, row.milestone)}
              {row.channel === "outbox" ? " (נכתבה לתיקייה, לא נשלחה)" : ""}
            </p>
          ))}
        </div>
        {active && !reminders.quiet ? (
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            <form action={snoozeItem.bind(null, item.id)}>
              <button type="submit" className={textLink}>
                הזכר לי בעוד שבוע
              </button>
            </form>
            <form action={acknowledgeItem.bind(null, item.id)}>
              <button type="submit" className={textLink}>
                קיבלתי, בלי תזכורות נוספות
              </button>
            </form>
          </div>
        ) : null}
      </section>

      <section className="mt-10">
        <SectionTitle>מסמכים</SectionTitle>
        {documents.length === 0 ? (
          <p className="mt-2 text-[15px] text-muted">אין קבצים עדיין. פוליסה שמועברת במייל נשמרת כאן לבד.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center gap-3 text-[15px]">
                <IconDocument className="size-5 shrink-0 text-accent" />
                <a className="min-w-0 flex-1 truncate font-medium text-navy hover:text-accent" href={`/api/documents/${doc.id}`}>
                  {doc.original_name}
                  <span className="ms-2 text-sm font-normal text-muted">{bytesLabel(doc.size_bytes)}</span>
                </a>
                <ConfirmButton action={removeDocument.bind(null, doc.id)} message="להסיר את הקובץ?" className={quietLink}>
                  הסרה
                </ConfirmButton>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3">
          <FilePicker action={uploadDocument.bind(null, item.id)} label="הוספת קובץ" className={textLink} />
        </div>
      </section>

      <div className="mt-14 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-5">
        {active ? (
          <form action={pauseItem.bind(null, item.id)}>
            <button type="submit" className={quietLink}>
              השהיה
            </button>
          </form>
        ) : null}
        <ConfirmButton action={deleteItem.bind(null, item.id)} message="למחוק את הפריט ואת המסמכים?" className="text-sm text-muted hover:text-danger">
          מחיקה
        </ConfirmButton>
      </div>
    </div>
  );
}
