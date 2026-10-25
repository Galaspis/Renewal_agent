import Link from "next/link";
import { notFound } from "next/navigation";
import {
  acknowledgeItem,
  deleteItem,
  markRenewed,
  pauseItem,
  removeDocument,
  resumeItem,
  snoozeItem,
  uploadDocument,
} from "@/app/actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { CategoryGlyph, IconAlert, IconBell, IconDocument, IconEdit, IconPause, IconRenew, IconSnooze, IconTick } from "@/components/Icons";
import { statusWords } from "@/components/ItemCard";
import { btnDanger, btnPrimary, btnSecondary, cardClass, fieldClass } from "@/components/styles";
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
      <dd className={`mt-0.5 truncate text-[15px] font-semibold text-navy ${ltr ? "numeric" : ""}`}>{value}</dd>
    </div>
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
  const urgent = item.attention === 1 || status.tone === "danger";
  const active = item.status === "active";

  return (
    <div className="mx-auto max-w-3xl">
      <nav className="text-sm text-muted">
        <Link href="/" className="hover:text-accent">
          דף הבית
        </Link>
        <span className="px-2">·</span>
        <Link href={`/items?category=${item.category}`} className="hover:text-accent">
          {category}
        </Link>
      </nav>

      {/* Hero: who it is, when it renews, what it costs, and the one answer. */}
      <section className={`${cardClass} mt-3 overflow-hidden border-s-4 ${urgent ? "border-s-danger" : "border-s-accent"}`}>
        <div className="grid gap-5 p-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:p-6">
          <span className="flex size-16 items-center justify-center rounded-full bg-accent-soft text-accent sm:size-20">
            <CategoryGlyph category={item.category} subcategory={item.subcategory} className="size-9 sm:size-11" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
              <span>{category}</span>
              {item.provider ? <span>· {item.provider}</span> : null}
              {!active ? (
                <span className="rounded-md bg-line/60 px-2 py-0.5 text-xs font-semibold text-muted">{STATUS_LABELS[item.status]}</span>
              ) : null}
            </div>
            <h1 className="mt-1 text-2xl font-extrabold leading-tight text-navy sm:text-3xl">{item.name}</h1>

            <div className="mt-4 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
              <div>
                <div className="text-[13px] text-muted">תאריך חידוש</div>
                <div className="numeric text-3xl font-extrabold leading-none tracking-tight text-navy sm:text-4xl">
                  {displayDate(item.renewal_date)}
                </div>
                {active ? (
                  <div className="mt-2">
                    {urgent ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-danger/10 px-2 py-1 text-sm font-bold text-danger">
                        <IconAlert className="size-4" />
                        {item.attention && status.tone !== "danger" ? "דורש טיפול" : status.text}
                      </span>
                    ) : (
                      <span className="text-sm font-bold text-accent">{status.text}</span>
                    )}
                  </div>
                ) : null}
              </div>
              <div className="text-start">
                <div className="text-[13px] text-muted">מחיר</div>
                <div className="numeric text-2xl font-bold text-navy sm:text-3xl">{formatMoney(item.amount, item.currency)}</div>
              </div>
            </div>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-4 border-t border-line bg-background/60 px-5 py-4 sm:grid-cols-4 sm:px-6">
          <Fact
            label="תדירות"
            value={`${CADENCE_LABELS[item.cadence]}${item.cadence === "custom" && item.cadence_months ? ` · ${item.cadence_months} חודשים` : ""}`}
          />
          <Fact label="חידוש אוטומטי" value={item.auto_renew ? "כן, התאריך מתקדם לבד" : "לא"} />
          <Fact label="חלון התראה" value={`${item.notice_days} ימים לפני`} />
          {item.start_date ? <Fact label="תחילת תוקף" value={displayDate(item.start_date)} /> : null}
          {item.policy_number ? <Fact label="מספר פוליסה" value={item.policy_number} ltr /> : null}
          {item.insured ? <Fact label={item.category === "insurance" ? "מבוטחים" : "על שם"} value={item.insured} /> : null}
        </dl>

        <div className="flex flex-wrap gap-2 border-t border-line px-5 py-4 sm:px-6">
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
                <IconRenew className="size-4" />
                חידוש פעילות
              </button>
            </form>
          )}
          <Link href={`/items/${item.id}/edit`} className={btnSecondary}>
            <IconEdit className="size-4" />
            עריכה
          </Link>
          {active ? (
            <form action={pauseItem.bind(null, item.id)}>
              <button type="submit" className={btnSecondary}>
                <IconPause className="size-4" />
                השהיה
              </button>
            </form>
          ) : null}
          <ConfirmButton action={deleteItem.bind(null, item.id)} message="למחוק את הפריט ואת המסמכים?" className={`${btnDanger} ms-auto`}>
            מחיקה
          </ConfirmButton>
        </div>
      </section>

      {item.attention ? (
        <p className="mt-4 flex items-center gap-2 rounded-2xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger">
          <IconAlert className="size-5 shrink-0" />
          מסומן ״דורש טיפול״. כשסיימתם, הסירו את הסימון בעריכה.
        </p>
      ) : null}

      {item.notes ? (
        <section className={`${cardClass} mt-4 p-5`}>
          <h2 className="text-sm font-bold text-navy">הערות</h2>
          <p className="mt-2 whitespace-pre-wrap text-[15px] leading-7">{item.notes}</p>
        </section>
      ) : null}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section className={`${cardClass} p-5`}>
          <h2 className="flex items-center gap-2 text-sm font-bold text-navy">
            <IconBell className="size-5 text-accent" />
            תזכורות למחזור הזה
          </h2>
          {reminders.quiet ? (
            <p className="mt-3 text-[15px] text-muted">{reminders.quiet}</p>
          ) : reminders.next ? (
            <p className="mt-3 text-[15px]">
              הבאה: <span className="font-bold">{reminders.next.label}</span> ·{" "}
              <span className="numeric">{displayDate(reminders.next.date)}</span>
              {reminders.next.date <= todayISO() ? " (בבדיקה היומית הבאה)" : ""}
            </p>
          ) : (
            <p className="mt-3 text-[15px] text-muted">אין עוד תזכורות צפויות למחזור הזה.</p>
          )}
          {reminders.sent.length > 0 ? (
            <ul className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm text-muted">
              {reminders.sent.map((row) => (
                <li key={row.id} className="flex items-center gap-2">
                  <IconTick className="size-4 text-accent" />
                  נשלחה <span className="numeric">{displayDate(row.sent_at.slice(0, 10))}</span> ·{" "}
                  {row.milestone < 0 ? "תזכורת איחור" : milestoneLabel(row.milestone, row.milestone)}
                  {row.channel === "outbox" ? " (נכתבה לתיקייה, לא נשלחה)" : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-muted">עדיין לא נשלחה תזכורת למחזור הזה.</p>
          )}
          {active && !reminders.quiet ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <form action={snoozeItem.bind(null, item.id)}>
                <button type="submit" className={btnSecondary}>
                  <IconSnooze className="size-4" />
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
        </section>

        <section className={`${cardClass} p-5`}>
          <h2 className="flex items-center gap-2 text-sm font-bold text-navy">
            <IconDocument className="size-5 text-accent" />
            מסמכים
          </h2>
          <ul className="mt-3 divide-y divide-line">
            {documents.length === 0 ? (
              <li className="py-2 text-sm text-muted">אין קבצים עדיין. פוליסה שמועברת במייל נשמרת כאן לבד.</li>
            ) : (
              documents.map((doc) => (
                <li key={doc.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <span
                    className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                      /pdf/i.test(doc.mime) ? "bg-primary-soft text-primary" : "bg-accent-soft text-accent"
                    }`}
                  >
                    <IconDocument className="size-5" />
                  </span>
                  <a className="min-w-0 flex-1 truncate font-semibold hover:text-accent" href={`/api/documents/${doc.id}`}>
                    {doc.original_name}
                    <span className="ms-2 font-normal text-muted">{bytesLabel(doc.size_bytes)}</span>
                  </a>
                  <ConfirmButton action={removeDocument.bind(null, doc.id)} message="להסיר את הקובץ?" className="shrink-0 text-muted hover:text-danger">
                    הסרה
                  </ConfirmButton>
                </li>
              ))
            )}
          </ul>
          <form action={uploadDocument.bind(null, item.id)} className="mt-4 flex flex-wrap items-end gap-3 border-t border-line pt-4">
            <label className="block min-w-0 flex-1 text-sm font-medium">
              הוספת קובץ
              <input className={fieldClass} type="file" name="file" accept=".pdf,image/*" required />
            </label>
            <button type="submit" className={btnSecondary}>
              העלאה
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
