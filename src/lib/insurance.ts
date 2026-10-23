import { queryAll } from "./db";
import { INSURANCE_TYPES, type InsuranceType, type RenewalItem } from "./types";

// The insurance overview: everything with category "insurance", grouped by type,
// with yearly totals. Replaces the old single-file insurance dashboard.

export function listInsurance(): RenewalItem[] {
  return queryAll<RenewalItem>(
    `SELECT * FROM items WHERE category = 'insurance' ORDER BY
      CASE status WHEN 'active' THEN 0 WHEN 'paused' THEN 1 ELSE 2 END,
      renewal_date ASC, name ASC`,
  );
}

/** What this item costs per year, given its cadence. null when the price is unknown. */
export function annualCost(item: RenewalItem): number | null {
  if (item.amount == null) return null;
  switch (item.cadence) {
    case "monthly":
      return item.amount * 12;
    case "custom":
      return item.cadence_months && item.cadence_months > 0 ? (item.amount * 12) / item.cadence_months : item.amount;
    default:
      // yearly, and once (a one-off premium counts for the year it's paid)
      return item.amount;
  }
}

export type TypeGroup = { type: InsuranceType; items: RenewalItem[]; yearly: number; unknown: number };

export function groupByType(items: RenewalItem[]): TypeGroup[] {
  const groups = new Map<InsuranceType, TypeGroup>();
  for (const item of items) {
    const type: InsuranceType = item.subcategory ?? "other";
    const group = groups.get(type) ?? { type, items: [], yearly: 0, unknown: 0 };
    group.items.push(item);
    const cost = annualCost(item);
    if (cost == null) group.unknown += 1;
    else group.yearly += cost;
    groups.set(type, group);
  }
  return INSURANCE_TYPES.filter((type) => groups.has(type)).map((type) => groups.get(type)!);
}

/** 0..100 of the policy period that has passed; null without a start date. */
export function periodProgress(item: RenewalItem, now = new Date()): number | null {
  if (!item.start_date) return null;
  const start = Date.parse(item.start_date);
  const end = Date.parse(item.renewal_date);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  return Math.min(100, Math.max(0, Math.round(((now.getTime() - start) / (end - start)) * 100)));
}
