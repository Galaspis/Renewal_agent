import { CADENCES, CATEGORIES, INSURANCE_TYPES, type Cadence, type Category, type InsuranceType } from "./types";
import { NOTICE_DEFAULTS } from "./categories";
import type { ItemInput } from "./items";

function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

function isCadence(value: string): value is Cadence {
  return (CADENCES as readonly string[]).includes(value);
}

export function parseItemForm(formData: FormData): ItemInput {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("חסר שם.");
  if (name.length > 200) throw new Error("השם ארוך מדי.");

  const categoryRaw = String(formData.get("category") ?? "");
  if (!isCategory(categoryRaw)) throw new Error("בחרו קטגוריה.");

  const cadenceRaw = String(formData.get("cadence") ?? "yearly");
  if (!isCadence(cadenceRaw)) throw new Error("בחרו כל כמה זמן זה מתחדש.");

  const renewalDate = String(formData.get("renewal_date") ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(renewalDate)) {
    throw new Error("חסר תאריך חידוש.");
  }

  const cadenceMonthsRaw = String(formData.get("cadence_months") ?? "").trim();
  let cadenceMonths: number | null = null;
  if (cadenceRaw === "custom") {
    const months = Number(cadenceMonthsRaw);
    if (!Number.isInteger(months) || months < 1 || months > 120) {
      throw new Error("בתדירות מותאמת צריך מספר חודשים בין 1 ל־120.");
    }
    cadenceMonths = months;
  }

  const amountRaw = String(formData.get("amount") ?? "").trim();
  let amount: number | null = null;
  if (amountRaw) {
    const parsed = Number(amountRaw);
    if (!Number.isFinite(parsed) || parsed < 0) throw new Error("המחיר לא תקין.");
    amount = parsed;
  }

  const currency = String(formData.get("currency") ?? "ILS").trim().toUpperCase() || "ILS";
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error("מטבע צריך להיות קוד בן 3 אותיות.");

  const noticeRaw = String(formData.get("notice_days") ?? "").trim();
  const noticeDays = noticeRaw ? Number(noticeRaw) : NOTICE_DEFAULTS[categoryRaw];
  if (!Number.isInteger(noticeDays) || noticeDays < 0 || noticeDays > 365) {
    throw new Error("ימי התראה צריכים להיות בין 0 ל־365.");
  }

  const provider = String(formData.get("provider") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const autoRenew = formData.get("auto_renew") === "on";

  const subRaw = String(formData.get("subcategory") ?? "").trim();
  const subcategory: InsuranceType | null =
    categoryRaw === "insurance" && (INSURANCE_TYPES as readonly string[]).includes(subRaw)
      ? (subRaw as InsuranceType)
      : null;
  const startRaw = String(formData.get("start_date") ?? "").trim();
  if (startRaw && !/^\d{4}-\d{2}-\d{2}$/.test(startRaw)) throw new Error("תאריך ההתחלה לא תקין.");
  if (startRaw && startRaw > renewalDate) throw new Error("תאריך ההתחלה אחרי תאריך החידוש.");

  return {
    subcategory,
    policy_number: String(formData.get("policy_number") ?? "").trim().slice(0, 120) || null,
    insured: String(formData.get("insured") ?? "").trim().slice(0, 120) || null,
    start_date: startRaw || null,
    attention: formData.get("attention") === "on",
    name,
    category: categoryRaw,
    provider,
    renewal_date: renewalDate,
    cadence: cadenceRaw,
    cadence_months: cadenceMonths,
    auto_renew: autoRenew,
    amount,
    currency,
    notice_days: noticeDays,
    notes,
  };
}

export function asFile(value: FormDataEntryValue | null): File | null {
  if (value instanceof File && value.size > 0) return value;
  return null;
}
