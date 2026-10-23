import type { Cadence, Category, InsuranceType, ItemStatus } from "./types";

export const INSURANCE_TYPE_LABELS: Record<InsuranceType, string> = {
  car: "רכב",
  home: "דירה",
  health: "בריאות",
  life: "חיים",
  ltc: "סיעוד",
  pension: "פנסיה",
  travel: "נסיעות",
  other: "אחר",
};

export const CATEGORY_LABELS: Record<Category, string> = {
  insurance: "ביטוח",
  license: "רישיון",
  subscription: "מנוי",
  warranty: "אחריות",
  membership: "חברות",
  domain: "דומיין",
  other: "אחר",
};

export const NOTICE_DEFAULTS: Record<Category, number> = {
  insurance: 60,
  license: 90,
  subscription: 14,
  warranty: 30,
  membership: 21,
  domain: 30,
  other: 30,
};

export const CADENCE_LABELS: Record<Cadence, string> = {
  monthly: "חודשי",
  yearly: "שנתי",
  once: "חד־פעמי",
  custom: "מותאם",
};

export const STATUS_LABELS: Record<ItemStatus, string> = {
  active: "פעיל",
  paused: "מושהה",
  ended: "הסתיים",
};

export function milestonesFor(category: Category, cadence: Cadence): number[] {
  if (category === "license" || category === "insurance") {
    return [90, 60, 30, 14, 7, 1, 0];
  }
  if (cadence === "monthly") {
    return [14, 7, 1, 0];
  }
  return [60, 30, 14, 7, 1, 0];
}

export function alternativesHint(category: Category): string {
  if (category === "insurance") {
    return "לפני חידוש ביטוח כדאי להשוות 2–3 הצעות מול המחיר הנוכחי. הכלי לא ממציא הצעות מחיר.";
  }
  if (category === "license") {
    return "רישיון לרוב מתחדש באותו גוף. בדקו אגרה ותאריך באתר הרשמי, לא אצל מתווך אקראי.";
  }
  if (category === "domain") {
    return "בדקו חידוש אצל הרשם הנוכחי מול רשם אחר — העברה לפעמים זולה יותר לשנה הבאה.";
  }
  if (category === "subscription" || category === "membership") {
    return "בדקו מסלול שנתי מול חודשי, או האם אפשר בלי השדרוג. המחיר למעלה הוא מה ששילמתם, לא הצעה חדשה.";
  }
  if (category === "warranty") {
    return "אחריות מורחבת לעיתים יקרה מהחלפה. השוו מול מחיר מוצר חדש, בלי להמציא מספרים.";
  }
  return "השוו מול המחיר הנוכחי אצל אותו ספק ואצל מתחרה אחד. אין כאן הצעות מחיר מומצאות.";
}

export function milestoneLabel(milestone: number, days: number): string {
  if (days < 0) return "באיחור";
  if (milestone === 0) return "מסתיים היום";
  if (milestone === 1) return "מסתיים מחר";
  return `מתחדש בעוד ${milestone} ימים`;
}
