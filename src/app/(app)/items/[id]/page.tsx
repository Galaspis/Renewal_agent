import Link from "next/link";
import { notFound } from "next/navigation";
import {
  acknowledgeItem,
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
import { CategoryGlyph, IconDocument, IconTick } from "@/components/Icons";
import { statusWords } from "@/components/ItemCard";
import { btnDanger, btnPrimary, btnQuiet, btnSecondary, cardClass, fieldClass } from "@/components/styles";
import { requireSession } from "@/lib/auth";
import { CADENCE_LABELS, CATEGORY_LABELS, INSURANCE_TYPE_LABELS, STATUS_LABELS, milestoneLabel } from "@/lib/categories";
import { displayDate, todayISO } from "@/lib/dates";
import { bytesLabel, formatMoney } from "@/lib/format";
import { getItem, listDocuments } from "@/lib/items";
import { reminderState } from "@/lib/reminder-state";

export const dynamic = "force-dynamic";

function Fact({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className={`mt-0.5 truncate text-[15px] font-medium text-navy ${ltr ? "numeric" : ""}`}>{value}</dd>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={`${cardClass} p-5`}>
      <h2 className="text-sm font-semibold text-navy">{title}</h2>
      {children}
    </section>
  );
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
  const needsYou = active && (item.attention === 1 || status.tone === "danger");
  const statusText = item.attention && status.tone !== "danger" ? "דורש טיפול" : status.text;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <nav className="text-[13px] text-muted">
        <Link href="/" className="hover:text-accent">
          דף הבית
        </Link>
        <span className="px-1.5">/</span>
        <Link href={`/items?category=${item.category}`} className="hover:text-accent">
          {category}
        </Link>
      </nav>

      {/* Hero: the name, the date with its status, and the one answer. */}
      <header className="flex items-start gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
          <CategoryGlyph category={item.category} subcategory={item.subcategory} className="size-7" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-[26px] font-bold leading-tight text-navy sm:text-[30px]">{item.name}</h1>
          <p className="mt-1.5 text-[15px] text-muted">
            {[category, item.provider, item.insured].filter(Boolean).join(" · ")}
            {!active ? ` · ${STATUS_LABELS[item.status]}` : ""}
          </p>
          <p className="mt-3 text-lg">
            <span className="text-muted">תאריך חידוש </span>
            <span className="numeric font-semibold text-navy">{displayDate(item.renewal_date)}</span>
            {active ? (
              <>
                <span className="mx-2 text-muted">·</span>
                <span className={needsYou ? "font-semibold text-danger" : status.tone === "soon" ? "font-semibold text-accent" : "text-muted"}>
                  {statusText}
                </span>
              </>
            ) : null}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
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
            <Link href={`/items/${item.id}/edit`} className={btnSecondary}>
              עריכה
            </Link>
            {needsYou ? (
              <form action={setItemEnded.bind(null, item.id)}>
                <button type="submit" className={btnQuiet}>
                  ביטלתי, לסיים
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </header>

      {item.attention ? (
        <p className="rounded-2xl bg-danger/5 px-4 py-3 text-sm text-danger ring-1 ring-danger/20">
          מסומן ״דורש טיפול״. כשסיימתם, הסירו את הסימון בעריכה.
        </p>
      ) : null}

      <dl className={`${cardClass} grid grid-cols-2 gap-x-4 gap-y-5 p-5 sm:grid-cols-4`}>
        <Fact label="מחיר" value={formatMoney(item.amount, item.currency)} ltr />
        <Fact
          label="תדירות"
          value={`${CADENCE_LABELS[item.cadence]}${item.cadence === "custom" && item.cadence_months ? ` · ${item.cadence_months} חודשים` : ""}`}
        />
        <Fact label="חידוש אוטומטי" value={item.auto_renew ? "כן" : "לא"} />
        <Fact label="חלון התראה" value={`${item.notice_days} ימים לפני`} />
        {item.start_date ? <Fact label="תחילת תוקף" value={displayDate(item.start_date)} /> : null}
        {item.policy_number ? <Fact label="מספר פוליסה" value={item.policy_number} ltr /> : null}
      </dl>

      {item.notes ? (
        <Panel title="הערות">
          <p className="mt-2 whitespace-pre-wrap text-[15px] leading-7 text-navy">{item.notes}</p>
        </Panel>
      ) : null}

      <Panel title="תזכורות">
        {reminders.quiet ? (
          <p className="mt-2 text-[15px] text-muted">{reminders.quiet}</p>
        ) : reminders.next ? (
          <p className="mt-2 text-[15px]">
            <span className="text-muted">הבאה: </span>
            {reminders.next.label} · <span className="numeric">{displayDate(reminders.next.date)}</span>
            {reminders.next.date <= todayISO() ? <span className="text-muted"> (בבדיקה היומית הבאה)</span> : null}
          </p>
        ) : (
          <p className="mt-2 text-[15px] text-muted">אין עוד תזכורות צפויות למחזור הזה.</p>
        )}
        {reminders.sent.length > 0 ? (
          <ul className="mt-2 space-y-1 text-sm text-muted">
            {reminders.sent.map((row) => (
              <li key={row.id}>
                נשלחה <span className="numeric">{displayDate(row.sent_at.slice(0, 10))}</span> ·{" "}
                {row.milestone < 0 ? "תזכורת איחור" : milestoneLabel(row.milestone, row.milestone)}
                {row.channel === "outbox" ? " (נכתבה לתיקייה, לא נשלחה)" : ""}
              </li>
            ))}
          </ul>
        ) : null}
        {active && !reminders.quiet ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <form action={snoozeItem.bind(null, item.id)}>
              <button type="submit" className={btnSecondary}>
                הזכר לי בעוד שבוע
              </button>
            </form>
            <form action={acknowledgeItem.bind(null, item.id)}>
              <button type="submit" className={btnSecondary}>
                קיבלתי, בלי תזכורות נוספות
              </button>
            </form>
          </div>
        ) : null}
      </Panel>

      <Panel title="מסמכים">
        {documents.length === 0 ? (
          <p className="mt-2 text-sm text-muted">אין קבצים עדיין. פוליסה שמועברת במייל נשמרת כאן לבד.</p>
        ) : (
          <ul className="mt-2">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center gap-3 py-2 text-sm">
                <IconDocument className="size-5 shrink-0 text-accent" />
                <a className="min-w-0 flex-1 truncate font-medium text-navy hover:text-accent" href={`/api/documents/${doc.id}`}>
                  {doc.original_name}
                  <span className="ms-2 font-normal text-muted">{bytesLabel(doc.size_bytes)}</span>
                </a>
                <ConfirmButton action={removeDocument.bind(null, doc.id)} message="להסיר את הקובץ?" className="shrink-0 text-[13px] text-muted hover:text-danger">
                  הסרה
                </ConfirmButton>
              </li>
            ))}
          </ul>
        )}
        <form action={uploadDocument.bind(null, item.id)} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="block min-w-0 flex-1 text-sm font-medium text-navy">
            הוספת קובץ
            <input className={fieldClass} type="file" name="file" accept=".pdf,image/*" required />
          </label>
          <button type="submit" className={btnSecondary}>
            העלאה
          </button>
        </form>
      </Panel>

      <div className="flex flex-wrap items-center gap-2 pt-2">
        {active ? (
          <form action={pauseItem.bind(null, item.id)}>
            <button type="submit" className={btnQuiet}>
              השהיה
            </button>
          </form>
        ) : null}
        <ConfirmButton action={deleteItem.bind(null, item.id)} message="למחוק את הפריט ואת המסמכים?" className={btnDanger}>
          מחיקה
        </ConfirmButton>
      </div>
    </div>
  );
}
