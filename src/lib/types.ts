export const CATEGORIES = [
  "insurance",
  "license",
  "subscription",
  "warranty",
  "membership",
  "domain",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CADENCES = ["monthly", "yearly", "once", "custom"] as const;
export type Cadence = (typeof CADENCES)[number];

export const ITEM_STATUSES = ["active", "paused", "ended"] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

export const INSURANCE_TYPES = ["car", "home", "health", "life", "ltc", "pension", "travel", "other"] as const;
export type InsuranceType = (typeof INSURANCE_TYPES)[number];

export type RenewalItem = {
  id: string;
  name: string;
  category: Category;
  provider: string | null;
  renewal_date: string;
  cadence: Cadence;
  cadence_months: number | null;
  auto_renew: number;
  amount: number | null;
  currency: string;
  notice_days: number;
  notes: string | null;
  status: ItemStatus;
  created_at: string;
  updated_at: string;
  /** Insurance type when category is "insurance"; null otherwise. */
  subcategory: InsuranceType | null;
  policy_number: string | null;
  insured: string | null;
  start_date: string | null;
  attention: number;
  /** "Remind me in a week": no reminders before this date. */
  snoozed_until: string | null;
  /** The renewal date the user already answered a reminder for; equal to renewal_date = quiet this cycle. */
  ack_renewal_date: string | null;
};

export type DocumentRow = {
  id: string;
  item_id: string;
  original_name: string;
  stored_name: string;
  mime: string;
  size_bytes: number;
  created_at: string;
};

export type AlertRow = {
  id: string;
  item_id: string;
  renewal_date: string;
  milestone: number;
  channel: string;
  sent_at: string;
};

export type AlertDispatch = {
  item: RenewalItem;
  milestone: number;
  days: number;
};

export type ProposalStatus = "pending" | "added" | "skipped";
export type ProposalVerdict = "add" | "exists" | "weak";

export type ProposalFile = {
  name: string;
  stored: string;
  mime: string;
  size: number;
};

export type Proposal = {
  id: string;
  gmail_id: string;
  source: "scan" | "forward";
  from_email: string | null;
  from_name: string | null;
  subject: string | null;
  snippet: string | null;
  received_at: string | null;
  name: string | null;
  category: Category;
  provider: string | null;
  renewal_date: string | null;
  amount: number | null;
  currency: string;
  verdict: ProposalVerdict;
  matched_item_id: string | null;
  status: ProposalStatus;
  notes: string | null;
  files_json: string | null;
  created_at: string;
};

export type AlertRun = {
  checkedAt: string;
  sent: { name: string; milestone: number; days: number }[];
  recipients: string[];
  channel: "email" | "outbox";
  error?: string;
};
