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
import {
  CADENCE_LABELS,
  CATEGORY_LABELS,
  INSURANCE_TYPE_LABELS,
  STATUS_LABELS,
  milestoneLabel,
} from "@/lib/categories";
import { requireSession } from "@/lib/auth";
import { displayDate, todayISO } from "@/lib/dates";
import { bytesLabel, formatDaysLeft, formatMoney, urgencyBadgeClass } from "@/lib/format";
import { getItem, listDocuments } from "@/lib/items";
import { reminderState } from "@/lib/reminder-state";
import { btnDanger, btnPrimary, btnSecondary, cardClass, fieldClass } from "@/components/styles";

export const dynamic = "force-dynamic";

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const item = getItem(id);
  if (!item) notFound();
  const documents = listDocuments(id);
  const reminders = reminderState(item);

  return (
    <div className="max-w-2xl">
      <p className="text-sm text-muted">
        <Link href="/" className="hover:text-foreground">
          הקרובים
        </Link>
        <span className="px-2">·</span>
        {item.category === "insurance" && item.subcategory
          ? `ביטוח ${INSURANCE_TYPE_LABELS[item.subcategory]}`
          : CATEGORY_LABELS[item.category]}
      </p>

      {item.attention ? (
        <p className="mt-4 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          מסומן ״דורש טיפול״. כשסיימתם — הסירו את הסימון בעריכה.
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{item.name}</h1>
          {item.provider ? <p className="mt-1 text-sm text-muted">{item.provider}</p> : null}
        </div>
        <span className="rounded-md bg-background px-2 py-1 text-xs font-medium text-muted ring-1 ring-line">
          {STATUS_LABELS[item.status]}
        </span>
      </div>

      <div className={`${cardClass} mt-6 p-5`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-medium text-muted">החידוש הבא</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{displayDate(item.renewal_date)}</div>
          </div>
          <span className={`rounded-md px-2 py-1 text-xs font-medium ${urgencyBadgeClass(item.renewal_date)}`}>
            {formatDaysLeft(item.renewal_date)}
          </span>
        </div>
        <dl className="mt-5 grid gap-4 border-t border-line pt-5 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">מחיר</dt>
            <dd className="mt-1 font-medium">{formatMoney(item.amount, item.currency)}</dd>
          </div>
          <div>
            <dt className="text-muted">תדירות</dt>
            <dd className="mt-1 font-medium">
              {CADENCE_LABELS[item.cadence]}
              {item.cadence === "custom" && item.cadence_months ? ` · ${item.cadence_months} חודשים` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-muted">חידוש אוטומטי</dt>
            <dd className="mt-1 font-medium">
              {item.auto_renew ? "כן — התאריך מתקדם לבד, והתזכורות ממשיכות עד שעונים" : "לא"}
            </dd>
          </div>
          <div>
            <dt className="text-muted">חלון התראה</dt>
            <dd className="mt-1 font-medium">{item.notice_days} ימים לפני</dd>
          </div>
          {item.start_date ? (
            <div>
              <dt className="text-muted">תחילת תוקף</dt>
              <dd className="mt-1 font-medium">{displayDate(item.start_date)}</dd>
            </div>
          ) : null}
          {item.policy_number ? (
            <div>
              <dt className="text-muted">מספר פוליסה</dt>
              <dd className="mt-1 font-medium" dir="ltr">
                {item.policy_number}
              </dd>
            </div>
          ) : null}
          {item.insured ? (
            <div>
              <dt className="text-muted">{item.category === "insurance" ? "מבוטחים" : "על שם"}</dt>
              <dd className="mt-1 font-medium">{item.insured}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      {item.notes ? (
        <p className={`${cardClass} mt-4 whitespace-pre-wrap p-5 text-sm leading-6`}>{item.notes}</p>
      ) : null}

      <section className={`${cardClass} mt-4 p-5`}>
        <h2 className="text-sm font-semibold">תזכורות למחזור הזה</h2>
        {reminders.quiet ? (
          <p className="mt-2 text-sm text-muted">{reminders.quiet}</p>
        ) : reminders.next ? (
          <p className="mt-2 text-sm">
            הבאה: <span className="font-medium">{reminders.next.label}</span> · {displayDate(reminders.next.date)}
            {reminders.next.date <= todayISO() ? " (בבדיקה היומית הבאה)" : ""}
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted">אין עוד תזכורות צפויות למחזור הזה.</p>
        )}
        {reminders.sent.length > 0 ? (
          <ul className="mt-3 space-y-1 text-sm text-muted">
            {reminders.sent.map((row) => (
              <li key={row.id}>
                נשלחה {displayDate(row.sent_at.slice(0, 10))} ·{" "}
                {row.milestone < 0 ? "תזכורת איחור" : milestoneLabel(row.milestone, row.milestone)}
                {row.channel === "outbox" ? " (נכתבה לתיקייה, לא נשלחה)" : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-muted">עדיין לא נשלחה תזכורת למחזור הזה.</p>
        )}
        {item.status === "active" && !reminders.quiet ? (
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
      </section>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href={`/items/${item.id}/edit`} className={btnPrimary}>
          עריכה
        </Link>
        {item.status === "active" ? (
          <>
            <form action={markRenewed.bind(null, item.id)}>
              <button type="submit" className={btnSecondary}>
                {item.cadence === "once" ? "סימון כבוצע" : "סימון כחודש"}
              </button>
            </form>
            <form action={pauseItem.bind(null, item.id)}>
              <button type="submit" className={btnSecondary}>
                השהיה
              </button>
            </form>
          </>
        ) : (
          <form action={resumeItem.bind(null, item.id)}>
            <button type="submit" className={btnSecondary}>
              חידוש פעילות
            </button>
          </form>
        )}
        <ConfirmButton
          action={deleteItem.bind(null, item.id)}
          message="למחוק את הפריט ואת המסמכים?"
          className={btnDanger}
        >
          מחיקה
        </ConfirmButton>
      </div>

      <section className={`${cardClass} mt-10 p-5`}>
        <h2 className="text-sm font-semibold">מסמכים</h2>
        <p className="mt-1 text-sm text-muted">הועלו מהלוח, מאחורי סיסמת המשפחה.</p>
        <ul className="mt-4 divide-y divide-line">
          {documents.length === 0 ? (
            <li className="py-3 text-sm text-muted">אין קבצים עדיין.</li>
          ) : (
            documents.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <a className="min-w-0 truncate text-accent hover:underline" href={`/api/documents/${doc.id}`}>
                  {doc.original_name}
                  <span className="ms-2 text-muted">{bytesLabel(doc.size_bytes)}</span>
                </a>
                <ConfirmButton
                  action={removeDocument.bind(null, doc.id)}
                  message="להסיר את הקובץ?"
                  className="shrink-0 text-muted hover:text-danger"
                >
                  הסרה
                </ConfirmButton>
              </li>
            ))
          )}
        </ul>
        <form action={uploadDocument.bind(null, item.id)} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="block min-w-0 flex-1 text-sm font-medium">
            הוספת קובץ
            <input className={fieldClass} type="file" name="file" accept=".pdf,image/*" required />
          </label>
          <button type="submit" className={btnPrimary}>
            העלאה
          </button>
        </form>
      </section>
    </div>
  );
}
