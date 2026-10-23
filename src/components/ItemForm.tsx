"use client";

import { useActionState, useState } from "react";
import { CADENCE_LABELS, CATEGORY_LABELS, INSURANCE_TYPE_LABELS, NOTICE_DEFAULTS } from "@/lib/categories";
import { CADENCES, CATEGORIES, INSURANCE_TYPES, type Cadence, type Category, type RenewalItem } from "@/lib/types";
import { btnPrimary, cardClass, fieldClass, labelClass } from "./styles";

type Draft = {
  id: string;
  name?: string | null;
  category?: Category;
  provider?: string | null;
  renewal_date?: string | null;
  amount?: number | null;
  currency?: string | null;
  notes?: string | null;
  fileCount?: number;
};

type Props = {
  item?: RenewalItem;
  draft?: Draft;
  action: (state: { error?: string } | null, formData: FormData) => Promise<{ error?: string } | null>;
  submitLabel: string;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={`${cardClass} space-y-4 p-5`}>
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function ItemForm({ item, draft, action, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, null);
  const [category, setCategory] = useState<Category>(item?.category ?? draft?.category ?? "insurance");
  const [cadence, setCadence] = useState<Cadence>(item?.cadence ?? "yearly");
  const [noticeTouched, setNoticeTouched] = useState(Boolean(item));
  const [notice, setNotice] = useState(String(item?.notice_days ?? NOTICE_DEFAULTS[item?.category ?? draft?.category ?? "insurance"]));

  function onCategory(next: Category) {
    setCategory(next);
    if (!noticeTouched) setNotice(String(NOTICE_DEFAULTS[next]));
  }

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {draft ? <input type="hidden" name="proposal_id" value={draft.id} /> : null}
      {state?.error ? (
        <p className="rounded-md border border-danger/20 bg-danger/5 px-3 py-2.5 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <Section title="מה זה">
        <label className={labelClass}>
          שם
          <input className={fieldClass} name="name" required defaultValue={item?.name ?? draft?.name ?? ""} placeholder="ביטוח רכב" />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            קטגוריה
            <select
              className={fieldClass}
              name="category"
              value={category}
              onChange={(e) => onCategory(e.target.value as Category)}
            >
              {CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {CATEGORY_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            ספק
            <input className={fieldClass} name="provider" defaultValue={item?.provider ?? draft?.provider ?? ""} placeholder="לא חובה" />
          </label>
        </div>
        {category === "insurance" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              סוג ביטוח
              <select className={fieldClass} name="subcategory" defaultValue={item?.subcategory ?? "other"}>
                {INSURANCE_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {INSURANCE_TYPE_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              מספר פוליסה
              <input className={fieldClass} name="policy_number" defaultValue={item?.policy_number ?? ""} dir="ltr" placeholder="לא חובה" />
            </label>
          </div>
        ) : null}
        <label className={labelClass}>
          {category === "insurance" ? "מבוטח/ים" : "על שם מי"}
          <input className={fieldClass} name="insured" defaultValue={item?.insured ?? ""} placeholder="לא חובה" />
        </label>
      </Section>

      <Section title="מתי וכמה">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            {category === "insurance" ? "תוקף עד / חידוש" : "החידוש הבא"}
            <input className={fieldClass} type="date" name="renewal_date" required defaultValue={item?.renewal_date ?? draft?.renewal_date ?? ""} dir="ltr" />
          </label>
          {category === "insurance" ? (
            <label className={labelClass}>
              תחילת תוקף
              <input className={fieldClass} type="date" name="start_date" defaultValue={item?.start_date ?? ""} dir="ltr" />
            </label>
          ) : null}
          <label className={labelClass}>
            תדירות
            <select
              className={fieldClass}
              name="cadence"
              value={cadence}
              onChange={(e) => setCadence(e.target.value as Cadence)}
            >
              {CADENCES.map((value) => (
                <option key={value} value={value}>
                  {CADENCE_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
        </div>
        {cadence === "custom" ? (
          <label className={labelClass}>
            כל כמה חודשים
            <input
              className={fieldClass}
              type="number"
              name="cadence_months"
              min={1}
              max={120}
              defaultValue={item?.cadence_months ?? 12}
              required
            />
          </label>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            מחיר נוכחי
            <input
              className={fieldClass}
              type="number"
              name="amount"
              min={0}
              step="0.01"
              defaultValue={item?.amount ?? draft?.amount ?? ""}
              placeholder="0.00"
            />
          </label>
          <label className={labelClass}>
            מטבע
            <input className={fieldClass} name="currency" defaultValue={item?.currency ?? draft?.currency ?? "ILS"} maxLength={3} dir="ltr" />
          </label>
        </div>
        <label className={labelClass}>
          להתחיל להתריע (ימים לפני)
          <input
            className={fieldClass}
            type="number"
            name="notice_days"
            min={0}
            max={365}
            value={notice}
            onChange={(e) => {
              setNoticeTouched(true);
              setNotice(e.target.value);
            }}
          />
        </label>
        <label className="flex min-h-11 items-start gap-3 text-sm">
          <input type="checkbox" name="auto_renew" defaultChecked={item?.auto_renew === 1} className="mt-3 size-4 accent-accent" />
          <span className="py-2.5">
            מתחדש אוטומטית
            <span className="mt-0.5 block text-xs text-muted">
              התראה אחת לפני כל חידוש (לפי ״ימים לפני״), והתאריך מתקדם לבד אחרי החיוב. בלי זה: סדרת התראות, ואחרי התאריך הפריט מסומן באיחור עד שתסמנו שחודש.
            </span>
          </span>
        </label>
        <label className="flex min-h-11 items-start gap-3 text-sm">
          <input type="checkbox" name="attention" defaultChecked={item?.attention === 1} className="mt-3 size-4 accent-accent" />
          <span className="py-2.5">
            דורש טיפול
            <span className="mt-0.5 block text-xs text-muted">מסומן באדום בראש הלוח עד שתורידו את הסימון.</span>
          </span>
        </label>
      </Section>

      <Section title="פרטים">
        <label className={labelClass}>
          הערות
          <textarea
            className={`${fieldClass} min-h-28`}
            name="notes"
            defaultValue={item?.notes ?? draft?.notes ?? ""}
            placeholder="מספר פוליסה, כיסוי, מי משלם…"
          />
        </label>
        {item ? null : (
          <label className={labelClass}>
            מסמך (רשות)
            <input className={fieldClass} type="file" name="file" accept=".pdf,image/*" />
            <span className="mt-1.5 block text-xs font-normal text-muted">
              PDF או תמונה, עד 10 מ״ב.
              {draft?.fileCount ? ` ${draft.fileCount} קבצים מהמייל יצטרפו בשמירה.` : ""}
            </span>
          </label>
        )}
      </Section>

      <button type="submit" disabled={pending} className={`${btnPrimary} w-full sm:w-auto`}>
        {pending ? "שומרים…" : submitLabel}
      </button>
    </form>
  );
}
