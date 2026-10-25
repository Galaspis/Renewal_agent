"use client";

import { useActionState, useState } from "react";
import { CADENCE_LABELS, CATEGORY_LABELS, INSURANCE_TYPE_LABELS, NOTICE_DEFAULTS } from "@/lib/categories";
import { CADENCES, CATEGORIES, INSURANCE_TYPES, type Cadence, type Category, type RenewalItem } from "@/lib/types";
import { btnPrimary, fieldClass, labelClass } from "./styles";

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

const help = "mt-1 block text-[13px] font-normal text-muted";

// The essentials in one column; everything else behind one disclosure.
export function ItemForm({ item, draft, action, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, null);
  const [category, setCategory] = useState<Category>(item?.category ?? draft?.category ?? "insurance");
  const [cadence, setCadence] = useState<Cadence>(item?.cadence ?? "yearly");
  const [noticeTouched, setNoticeTouched] = useState(Boolean(item));
  const [notice, setNotice] = useState(String(item?.notice_days ?? NOTICE_DEFAULTS[item?.category ?? draft?.category ?? "insurance"]));
  const hasExtras = Boolean(
    item && (item.provider || item.insured || item.policy_number || item.start_date || item.auto_renew || item.attention || item.notes),
  );

  function onCategory(next: Category) {
    setCategory(next);
    if (!noticeTouched) setNotice(String(NOTICE_DEFAULTS[next]));
  }

  return (
    <form action={formAction} className="max-w-lg space-y-5">
      {draft ? <input type="hidden" name="proposal_id" value={draft.id} /> : null}
      {state?.error ? <p className="rounded-lg bg-danger/5 px-3 py-2.5 text-sm text-danger ring-1 ring-danger/20">{state.error}</p> : null}

      <label className={labelClass}>
        שם
        <input className={fieldClass} name="name" required defaultValue={item?.name ?? draft?.name ?? ""} placeholder="ביטוח רכב" autoFocus={!item} />
      </label>

      <label className={labelClass}>
        קטגוריה
        <select className={fieldClass} name="category" value={category} onChange={(e) => onCategory(e.target.value as Category)}>
          {CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {CATEGORY_LABELS[value]}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className={labelClass}>
          {category === "insurance" ? "תוקף עד" : "תאריך חידוש"}
          <input className={fieldClass} type="date" name="renewal_date" required defaultValue={item?.renewal_date ?? draft?.renewal_date ?? ""} dir="ltr" />
        </label>
        <label className={labelClass}>
          תדירות
          <select className={fieldClass} name="cadence" value={cadence} onChange={(e) => setCadence(e.target.value as Cadence)}>
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
          <input className={fieldClass} type="number" name="cadence_months" min={1} max={120} defaultValue={item?.cadence_months ?? 12} required />
        </label>
      ) : null}

      <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-5">
        <label className={labelClass}>
          מחיר
          <input className={fieldClass} type="number" name="amount" min={0} step="0.01" defaultValue={item?.amount ?? draft?.amount ?? ""} placeholder="0.00" />
        </label>
        <label className={labelClass}>
          מטבע
          <input className={fieldClass} name="currency" defaultValue={item?.currency ?? draft?.currency ?? "ILS"} maxLength={3} dir="ltr" />
        </label>
      </div>

      <details className="group pt-1" open={hasExtras}>
        <summary className="cursor-pointer list-none text-sm font-medium text-accent hover:underline">
          <span className="group-open:hidden">עוד אפשרויות</span>
          <span className="hidden group-open:inline">פחות אפשרויות</span>
        </summary>
        <div className="mt-5 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className={labelClass}>
              ספק
              <input className={fieldClass} name="provider" defaultValue={item?.provider ?? draft?.provider ?? ""} placeholder="הראל, GoDaddy…" />
            </label>
            <label className={labelClass}>
              {category === "insurance" ? "מבוטחים" : "על שם"}
              <input className={fieldClass} name="insured" defaultValue={item?.insured ?? ""} />
            </label>
          </div>
          {category === "insurance" ? (
            <div className="grid gap-5 sm:grid-cols-2">
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
                <input className={fieldClass} name="policy_number" defaultValue={item?.policy_number ?? ""} dir="ltr" />
              </label>
              <label className={labelClass}>
                תחילת תוקף
                <input className={fieldClass} type="date" name="start_date" defaultValue={item?.start_date ?? ""} dir="ltr" />
              </label>
            </div>
          ) : null}
          <label className={labelClass}>
            להתחיל להזכיר (ימים לפני)
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
            <span className={help}>התזכורות ממשיכות עד שעונים על אחת מהן.</span>
          </label>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="auto_renew" defaultChecked={item?.auto_renew === 1} className="mt-1 size-4 accent-accent" />
            <span>
              מתחדש אוטומטית
              <span className={help}>החיוב קורה לבד והתאריך מתקדם לבד אחריו.</span>
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="attention" defaultChecked={item?.attention === 1} className="mt-1 size-4 accent-accent" />
            <span>
              דורש טיפול
              <span className={help}>יופיע באדום בראש דף הבית עד שתסירו את הסימון.</span>
            </span>
          </label>
          <label className={labelClass}>
            הערות
            <textarea className={`${fieldClass} min-h-24`} name="notes" defaultValue={item?.notes ?? draft?.notes ?? ""} />
          </label>
          {item ? null : (
            <label className={labelClass}>
              קובץ
              <input className={fieldClass} type="file" name="file" accept=".pdf,image/*" />
              <span className={help}>
                PDF או תמונה עד 10 מ״ב.{draft?.fileCount ? ` ${draft.fileCount} קבצים מהמייל יצטרפו בשמירה.` : ""}
              </span>
            </label>
          )}
        </div>
      </details>

      <div className="pt-2">
        <button type="submit" disabled={pending} className={`${btnPrimary} w-full sm:w-auto`}>
          {pending ? "שומרים…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
