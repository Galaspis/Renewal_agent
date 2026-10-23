import { logActivity } from "./activity";
import { createActionLink, type PreviousValues } from "./action-links";
import { CATEGORY_LABELS } from "./categories";
import { formatMoney } from "./format";
import {
  autoLine,
  emailButtons,
  emailShell,
  isolate,
  mailBaseUrl,
  sendMail,
  textButtons,
  textDirection,
  type EmailButton,
  type MailMessage,
} from "./mail";
import type { Proposal, RenewalItem } from "./types";

// The receipt: one email back for every email forwarded to the tool, within a minute,
// saying exactly what happened and offering one-tap buttons to fix it.

export type IngestOutcome =
  | { kind: "added"; item: RenewalItem; proposal: Proposal }
  | { kind: "updated"; item: RenewalItem; previous: PreviousValues; proposal: Proposal }
  | { kind: "draft"; proposal: Proposal; reason: string; matched: RenewalItem | null }
  | { kind: "duplicate"; proposal: Proposal }
  | { kind: "failed"; error: string; emailId: string; subject?: string; from?: string };

function row(label: string, value: string | null | undefined): string {
  if (!value) return "";
  return `${label}: ${value}`;
}

function itemLines(item: Pick<RenewalItem, "name" | "provider" | "category" | "renewal_date" | "amount" | "currency">) {
  return [
    row("שם", item.name),
    row("ספק", item.provider),
    row("סוג", CATEGORY_LABELS[item.category]),
    row("תאריך חידוש", item.renewal_date),
    item.amount != null ? row("מחיר", formatMoney(item.amount, item.currency)) : "",
  ].filter(Boolean);
}

/** Each line decides its own direction, so an English provider under a Hebrew label still reads right. */
function linesHtml(lines: string[]): string {
  return `<div style="margin:0 0 8px">${lines.map((l) => autoLine(l)).join("")}</div>`;
}

function intro(text: string, color = "#101d55"): string {
  return autoLine(text, `font-size:17px;margin:0 0 12px;color:${color}`);
}

export function buildReceipt(outcome: IngestOutcome): MailMessage {
  const base = mailBaseUrl();
  const subjectOf = (p?: { subject?: string | null } | null) => (p?.subject || "").trim();
  // The email's direction follows the thing it is about: the item's name, or the forwarded subject.
  const sample =
    "item" in outcome
      ? `${outcome.item.name} ${outcome.item.provider ?? ""}`
      : "proposal" in outcome
        ? `${outcome.proposal.name ?? ""} ${subjectOf(outcome.proposal)}`
        : outcome.subject ?? "";
  const dir = textDirection(sample);
  const shell = (inner: string) => emailShell(inner, { dir });

  switch (outcome.kind) {
    case "added": {
      const { item, proposal } = outcome;
      const lines = itemLines(item);
      const buttons: EmailButton[] = [
        { label: "נכון", tone: "primary", href: createActionLink("confirm", { itemId: item.id, proposalId: proposal.id, label: item.name }).url },
        { label: "תקן", href: `${base}/items/${item.id}/edit` },
        { label: "מחק", tone: "danger", href: createActionLink("delete_item", { itemId: item.id, proposalId: proposal.id, label: item.name }).url },
      ];
      const introText = `המייל ״${subjectOf(proposal)}״ נקלט ונוסף ללוח כפריט חדש.`;
      return {
        subject: `נקלט ונוסף: ${isolate(item.name)}`,
        text: [introText, "", ...lines, "", textButtons(buttons)].join("\n"),
        html: shell(`${intro(introText)}${linesHtml(lines)}${emailButtons(buttons)}`),
      };
    }

    case "updated": {
      const { item, previous, proposal } = outcome;
      const changes = [
        previous.renewal_date !== item.renewal_date ? `תאריך: ${previous.renewal_date} ← ${item.renewal_date}` : `תאריך: ${item.renewal_date} (ללא שינוי)`,
        previous.amount !== item.amount
          ? `מחיר: ${formatMoney(previous.amount, previous.currency)} ← ${formatMoney(item.amount, item.currency)}`
          : item.amount != null
            ? `מחיר: ${formatMoney(item.amount, item.currency)} (ללא שינוי)`
            : "",
        previous.provider !== item.provider ? `ספק: ${previous.provider ?? "—"} ← ${item.provider ?? "—"}` : "",
      ].filter(Boolean);
      const buttons: EmailButton[] = [
        { label: "נכון", tone: "primary", href: createActionLink("confirm", { itemId: item.id, proposalId: proposal.id, label: item.name }).url },
        { label: "בטל את העדכון", tone: "danger", href: createActionLink("undo_update", { itemId: item.id, proposalId: proposal.id, previous, label: item.name }).url },
        { label: "פתח", href: `${base}/items/${item.id}` },
      ];
      const introText = `המייל ״${subjectOf(proposal)}״ נקלט ועדכן את ״${item.name}״.`;
      return {
        subject: `נקלט ועודכן: ${isolate(item.name)}`,
        text: [introText, "", ...changes, "", textButtons(buttons)].join("\n"),
        html: shell(`${intro(introText)}${linesHtml(changes)}${emailButtons(buttons)}`),
      };
    }

    case "draft": {
      const { proposal, reason, matched } = outcome;
      const found = [
        row("שם", proposal.name),
        row("ספק", proposal.provider),
        row("תאריך", proposal.renewal_date ?? "לא נמצא"),
        proposal.amount != null ? row("מחיר", formatMoney(proposal.amount, proposal.currency)) : "",
        matched ? row("דומה ל", matched.name) : "",
      ].filter(Boolean);
      const canAdd = Boolean(proposal.name && proposal.renewal_date);
      const label = proposal.name || subjectOf(proposal) || "הטיוטה";
      const buttons: EmailButton[] = [
        ...(canAdd
          ? [{ label: "הוסף כפי שהוא", tone: "primary" as const, href: createActionLink("add_draft", { proposalId: proposal.id, label }).url }]
          : []),
        { label: "השלם פרטים", tone: canAdd ? "quiet" : "primary", href: `${base}/items/new?draft=${proposal.id}` },
        { label: "לא רלוונטי", tone: "danger", href: createActionLink("skip_draft", { proposalId: proposal.id, label }).url },
      ];
      const introText = `המייל ״${subjectOf(proposal)}״ נקלט אבל דורש את תשומת לבכם: ${reason}.`;
      return {
        subject: `דורש השלמה: ${isolate(label)}`,
        text: [introText, "", ...found, "", textButtons(buttons)].join("\n"),
        html: shell(`${intro(introText)}${linesHtml(found)}${emailButtons(buttons)}`),
      };
    }

    case "duplicate": {
      const { proposal } = outcome;
      const target = proposal.matched_item_id ? `${base}/items/${proposal.matched_item_id}` : `${base}/inbox`;
      const buttons: EmailButton[] = [{ label: "פתח", tone: "primary", href: target }];
      const introText = `המייל ״${subjectOf(proposal)}״ כבר התקבל בעבר, ולא נעשה בו שימוש נוסף.`;
      return {
        subject: `כבר נקלט בעבר: ${isolate(proposal.name || subjectOf(proposal))}`,
        text: [introText, "", textButtons(buttons)].join("\n"),
        html: shell(`${intro(introText)}${emailButtons(buttons)}`),
      };
    }

    case "failed": {
      const buttons: EmailButton[] = [
        { label: "נסה שוב", tone: "primary", href: createActionLink("retry_inbound", { emailId: outcome.emailId, label: outcome.subject }).url },
        { label: "הגדרות", href: `${base}/settings` },
      ];
      const what = outcome.subject ? `המייל ״${outcome.subject}״` : "מייל שהועבר לכלי";
      const introText = `${what} לא נקלט. הסיבה: ${outcome.error}`;
      return {
        subject: `לא נקלט: ${isolate(outcome.subject || "מייל שהועבר")}`,
        text: [introText, "", textButtons(buttons)].join("\n"),
        html: shell(`${intro(introText, "#d63232")}${emailButtons(buttons)}`),
      };
    }
  }
}

/** Sends the receipt to the alert recipients. Never throws: a receipt failure is logged, not fatal. */
export async function sendReceipt(outcome: IngestOutcome): Promise<void> {
  const refs = {
    itemId: "item" in outcome ? outcome.item.id : "matched" in outcome ? outcome.matched?.id : undefined,
    proposalId: "proposal" in outcome ? outcome.proposal.id : undefined,
  };
  try {
    const message = buildReceipt(outcome);
    const channel = await sendMail(message);
    logActivity("receipt", `${message.subject} (${channel})`, refs);
  } catch (err) {
    logActivity("receipt", `שליחת האישור נכשלה: ${err instanceof Error ? err.message : String(err)}`, refs);
  }
}
