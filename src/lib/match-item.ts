import { listActiveItems, type ItemInput } from "./items";
import { NOTICE_DEFAULTS } from "./categories";
import { isCategoryValue } from "./extract-renewal";
import type { Proposal } from "./types";

function norm(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function matchExistingItem(input: { name: string | null; provider: string | null }) {
  const name = norm(input.name);
  const provider = norm(input.provider);
  if (!name && !provider) return null;
  for (const item of listActiveItems()) {
    const itemName = norm(item.name);
    const itemProvider = norm(item.provider);
    if (provider && itemProvider && (provider.includes(itemProvider) || itemProvider.includes(provider))) {
      return item;
    }
    if (name && itemName && (name.includes(itemName) || itemName.includes(name))) {
      return item;
    }
  }
  return null;
}

export function proposalToItemInput(proposal: Proposal, form?: ItemInput): ItemInput {
  if (form) return form;
  const category = isCategoryValue(proposal.category) ? proposal.category : "other";
  if (!proposal.name) throw new Error("חסר שם לטיוטה.");
  if (!proposal.renewal_date) throw new Error("חסר תאריך בטיוטה — השלימו בטופס.");
  return {
    name: proposal.name,
    category,
    provider: proposal.provider,
    renewal_date: proposal.renewal_date,
    cadence: "yearly",
    cadence_months: null,
    auto_renew: false,
    amount: proposal.amount,
    currency: proposal.currency || "ILS",
    notice_days: NOTICE_DEFAULTS[category],
    notes: proposal.notes,
  };
}
