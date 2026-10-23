import { CATEGORIES, type Category } from "./types";
import { todayISO } from "./dates";

const CATEGORY_HINTS: { category: Category; pattern: RegExp }[] = [
  { category: "insurance", pattern: /ביטוח|פוליסה|הראל|מגדל|הפניקס|מנורה|car insurance|home insurance/i },
  { category: "license", pattern: /רישיון נהיגה|משרד הרישוי|טסט שנתי|אגרת רישוי/i },
  { category: "domain", pattern: /חידוש דומיין|domain renewal|godaddy|namecheap/i },
  { category: "warranty", pattern: /אחריות מורחבת|extended warranty/i },
  { category: "membership", pattern: /דמי חברות|חדר כושר|gym membership/i },
  { category: "subscription", pattern: /חיוב שנתי|annual plan|netflix|spotify/i },
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toISO(year: number, month: number, day: number): string | null {
  if (year < 2020 || year > 2040 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function extractDates(text: string): string[] {
  const found = new Set<string>();
  const iso = text.matchAll(/\b(20\d{2})-(\d{2})-(\d{2})\b/g);
  for (const match of iso) {
    const value = toISO(Number(match[1]), Number(match[2]), Number(match[3]));
    if (value) found.add(value);
  }
  const dotted = text.matchAll(/\b(\d{1,2})[./](\d{1,2})[./](20\d{2})\b/g);
  for (const match of dotted) {
    const value = toISO(Number(match[3]), Number(match[2]), Number(match[1]));
    if (value) found.add(value);
  }
  return [...found];
}

export function pickRenewalDate(text: string, receivedAt?: string): string | null {
  const today = todayISO(receivedAt ? new Date(receivedAt) : new Date());
  const dates = extractDates(text);
  const future = dates.filter((date) => date >= today).sort();
  if (future.length > 0) return future[0];
  if (dates.length === 0) return null;
  return dates.sort().at(-1) ?? null;
}

export function extractAmount(text: string): number | null {
  const matches = [
    ...text.matchAll(/(?:₪|ש["״]ח|ILS|NIS)\s*([0-9]{1,3}(?:[, ]?[0-9]{3})*(?:\.\d{1,2})?)/gi),
    ...text.matchAll(/([0-9]{1,3}(?:[, ]?[0-9]{3})*(?:\.\d{1,2})?)\s*(?:₪|ש["״]ח|ILS|NIS)/gi),
  ];
  const amounts = matches
    .map((match) => Number(match[1].replace(/[, ]/g, "")))
    .filter((value) => Number.isFinite(value) && value >= 20 && value <= 200_000);
  if (amounts.length === 0) return null;
  return amounts.sort((a, b) => b - a)[0];
}

export function guessCategory(text: string): Category {
  for (const hint of CATEGORY_HINTS) {
    if (hint.pattern.test(text)) return hint.category;
  }
  return "other";
}

export function guessName(subject: string, provider: string | null, category: Category): string {
  const cleaned = subject
    .replace(/^(fwd:|fw:|re:|הועבר:|תגובה:)\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned && cleaned.length <= 80 && !/^undeliver/i.test(cleaned)) return cleaned;
  if (provider) return `${categoryLabel(category)} ${provider}`;
  return cleaned || "מנוי מהמייל";
}

function categoryLabel(category: Category): string {
  const labels: Record<Category, string> = {
    insurance: "ביטוח",
    license: "רישיון",
    subscription: "מנוי",
    warranty: "אחריות",
    membership: "חברות",
    domain: "דומיין",
    other: "פריט",
  };
  return labels[category];
}

export function isForwardSubject(subject: string): boolean {
  return /^(fwd:|fw:|הועבר:)/i.test(subject.trim());
}

export function looksLikeRenewal(text: string, hasPdf: boolean): boolean {
  return renewalSignals(text, hasPdf).keep;
}

export function renewalSignals(text: string, hasPdf: boolean): { keep: boolean; category: Category; provider: string | null } {
  const category = guessCategory(text);
  const provider = guessInsurer(text);

  if (isNoise(text)) {
    return { keep: false, category, provider };
  }

  const strongTopic =
    /(ביטוח|פוליסה|הראל|מגדל|הפניקס|מנורה|איילון|ביטוח ישיר|הכשרה|כלל ביטוח|רישיון נהיגה|משרד הרישוי|טסט שנתי|אגרת רישוי|חידוש פוליסה|תוקף הפוליסה|car insurance|home insurance|life insurance)/i.test(
      text,
    ) || Boolean(provider);

  const mediumTopic = /(חידוש ביטוח|renewal of|policy renewal|warranty exp|אחריות מורחבת|חידוש דומיין)/i.test(text);

  const futureDate = Boolean(pickRenewalDate(text));
  const amount = extractAmount(text);
  const money = amount != null && amount >= 50;
  const pdfWithTopic = hasPdf && strongTopic;

  const keep = strongTopic && (futureDate || money || pdfWithTopic || mediumTopic);
  return { keep, category: provider ? "insurance" : category, provider };
}

function isNoise(text: string) {
  return /(privacy policy|מדיניות פרטיות|unsubscribe|הסרה מרשימת|verify your email|confirm your email|shipping confirmation|your package|linkedin|facebook.com|instagram|tiktok|newsletter|רשימת תפוצה|מבצע סוף|flash sale)/i.test(
    text,
  );
}

function guessInsurer(text: string): string | null {
  const brands: [RegExp, string][] = [
    [/הראל|harel/i, "הראל"],
    [/מגדל(?!\s*עיר)/i, "מגדל"],
    [/migdal/i, "מגדל"],
    [/הפניקס|phoenix/i, "הפניקס"],
    [/מנורה/i, "מנורה"],
    [/איילון|ayalon/i, "איילון"],
    [/ביטוח ישיר/i, "ביטוח ישיר"],
    [/הכשרה/i, "הכשרה"],
    [/כלל ביטוח|clal/i, "כלל"],
  ];
  for (const [pattern, name] of brands) {
    if (pattern.test(text)) return name;
  }
  return null;
}

export function isCategoryValue(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}
