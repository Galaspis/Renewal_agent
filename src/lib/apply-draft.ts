import { createItemRecord, getItem, patchItemRenewal } from "./items";
import { proposalToItemInput } from "./match-item";
import { attachProposalFiles, getProposal, setProposalStatus } from "./proposals";
import type { Proposal } from "./types";

// Turning a draft (טיוטה) into an item without a form: used by the "הוסף כפי שהוא"
// button in the drafts page and by the same button inside receipt emails.

export type ApplyDraftResult = { ok: boolean; message: string; itemId?: string; proposalId?: string };

export async function applyDraft(proposalId: string): Promise<ApplyDraftResult> {
  const proposal = getProposal(proposalId);
  if (!proposal) return { ok: false, message: "הטיוטה לא נמצאה." };
  if (proposal.status !== "pending") return { ok: false, message: "הטיוטה כבר טופלה.", proposalId };
  if (!proposal.name || !proposal.renewal_date) {
    return { ok: false, message: "חסר שם או תאריך. השלימו אותם בטופס.", proposalId };
  }
  const matched = proposal.matched_item_id ? getItem(proposal.matched_item_id) : undefined;
  if (matched) {
    patchItemRenewal(matched.id, {
      renewal_date: proposal.renewal_date,
      amount: proposal.amount,
      currency: proposal.currency,
      provider: proposal.provider,
      notes: proposal.notes,
    });
    await attachProposalFiles(proposal, matched.id);
    setProposalStatus(proposal.id, "added");
    return { ok: true, message: `״${matched.name}״ עודכן לתאריך ${proposal.renewal_date}.`, itemId: matched.id, proposalId };
  }
  const item = createItemRecord(proposalToItemInput(proposal));
  await attachProposalFiles(proposal, item.id);
  setProposalStatus(proposal.id, "added");
  return { ok: true, message: `״${item.name}״ נוסף ללוח לתאריך ${item.renewal_date}.`, itemId: item.id, proposalId };
}

/** Can the draft be added with one tap (it has a name and a date)? */
export function draftIsComplete(proposal: Proposal): boolean {
  return Boolean(proposal.name && proposal.renewal_date);
}

/** Why the email became a draft instead of an item, in words for the drafts page. */
export function draftReason(proposal: Proposal, autoApply: boolean): string {
  if (!proposal.name && !proposal.renewal_date) return "לא נמצאו שם ותאריך חידוש במייל.";
  if (!proposal.name) return "לא נמצא שם למנוי. התאריך נמצא.";
  if (!proposal.renewal_date) return "לא נמצא תאריך חידוש במייל. השאר נמצא.";
  if (!autoApply) return "ההוספה האוטומטית כבויה בהגדרות, אז הכל מחכה כאן לאישור.";
  if (proposal.verdict === "exists") return "נראה כמו פריט שכבר במעקב. אישור יעדכן אותו.";
  return "ממתין לאישור.";
}
