"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { runAlertCheck } from "@/lib/alerts";
import { clearSession, createSession, passwordsMatch, requireSession } from "@/lib/auth";
import { HUB_LOGOUT_URL, hubAuthEnabled } from "@/lib/hub-auth";
import { rotateCalendarToken } from "@/lib/calendar";
import { getSetting, setSetting } from "@/lib/db";
import {
  createItemRecord,
  deleteDocumentRecord,
  deleteItemRecord,
  getDocument,
  getItem,
  saveDocument,
  setItemQuiet,
  setItemRenewalDate,
  setItemStatus,
  updateItemRecord,
} from "@/lib/items";
import { logActivity } from "@/lib/activity";
import { applyDraft } from "@/lib/apply-draft";
import { sendAlertMail } from "@/lib/mail";
import { asFile, parseItemForm } from "@/lib/parse";
import { addCadence, formatISODate, parseISODate, todayISO } from "@/lib/dates";
import { attachProposalFiles, getProposal, setProposalStatus } from "@/lib/proposals";

export async function login(_prev: { error?: string } | null, formData: FormData) {
  const expected = process.env.FAMILY_PASSWORD;
  if (!expected) {
    return { error: "יש להגדיר FAMILY_PASSWORD ב־.env.local ולהפעיל מחדש." };
  }
  const password = String(formData.get("password") ?? "");
  if (!passwordsMatch(password, expected)) {
    return { error: "סיסמה שגויה." };
  }
  await createSession();
  redirect("/");
}

export async function logout() {
  await clearSession();
  // Behind the hub the session belongs to the shared login; end it there.
  redirect(hubAuthEnabled() ? HUB_LOGOUT_URL : "/login");
}

export async function createItem(_prev: { error?: string } | null, formData: FormData) {
  await requireSession();
  try {
    const input = parseItemForm(formData);
    const item = createItemRecord(input);
    const file = asFile(formData.get("file"));
    if (file) await saveDocument(item.id, file);
    const proposalId = String(formData.get("proposal_id") ?? "").trim();
    if (proposalId) {
      const proposal = getProposal(proposalId);
      if (proposal && proposal.status === "pending") {
        await attachProposalFiles(proposal, item.id);
        setProposalStatus(proposalId, "added");
      }
    }
    revalidatePath("/");
    revalidatePath("/inbox");
    redirect(`/items/${item.id}`);
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: err instanceof Error ? err.message : "לא הצלחנו לשמור את הפריט." };
  }
}

export async function updateItem(id: string, _prev: { error?: string } | null, formData: FormData) {
  await requireSession();
  const existing = getItem(id);
  if (!existing) return { error: "הפריט כבר לא קיים." };
  try {
    updateItemRecord(id, parseItemForm(formData));
    revalidatePath("/");
    revalidatePath(`/items/${id}`);
    redirect(`/items/${id}`);
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: err instanceof Error ? err.message : "לא הצלחנו לעדכן את הפריט." };
  }
}

export async function deleteItem(id: string) {
  await requireSession();
  deleteItemRecord(id);
  revalidatePath("/");
  redirect("/items");
}

export async function pauseItem(id: string) {
  await requireSession();
  setItemStatus(id, "paused");
  revalidatePath("/");
  revalidatePath(`/items/${id}`);
}

export async function resumeItem(id: string) {
  await requireSession();
  setItemStatus(id, "active");
  revalidatePath("/");
  revalidatePath(`/items/${id}`);
}

export async function markRenewed(id: string) {
  await requireSession();
  const item = getItem(id);
  if (!item) return;
  const next = addCadence(item.renewal_date, item.cadence, item.cadence_months);
  if (next) {
    setItemRenewalDate(id, next);
  } else {
    setItemStatus(id, "ended");
  }
  revalidatePath("/");
  revalidatePath(`/items/${id}`);
}

export async function uploadDocument(id: string, formData: FormData) {
  await requireSession();
  const file = asFile(formData.get("file"));
  if (!file) return;
  await saveDocument(id, file);
  revalidatePath(`/items/${id}`);
}

export async function removeDocument(docId: string) {
  await requireSession();
  const doc = getDocument(docId);
  deleteDocumentRecord(docId);
  if (doc) revalidatePath(`/items/${doc.item_id}`);
}

export async function saveSettings(formData: FormData) {
  await requireSession();
  const emails = String(formData.get("alert_emails") ?? "").trim();
  const autoCheck = formData.get("auto_check") === "on" ? "1" : "0";
  const autoApply = formData.get("auto_apply") === "on" ? "1" : "0";
  setSetting("alert_emails", emails);
  setSetting("auto_check", autoCheck);
  setSetting("auto_apply", autoApply);
  setSetting("sender_name", String(formData.get("sender_name") ?? "").trim().slice(0, 60));
  const gemini = String(formData.get("gemini_api_key") ?? "").trim();
  const openai = String(formData.get("openai_api_key") ?? "").trim();
  const anthropic = String(formData.get("anthropic_api_key") ?? "").trim();
  const provider = String(formData.get("ai_provider") ?? "auto").trim() || "auto";
  const inboundSecret = String(formData.get("inbound_webhook_secret") ?? "").trim();
  if (inboundSecret) setSetting("inbound_webhook_secret", inboundSecret);
  if (gemini) setSetting("gemini_api_key", gemini);
  if (openai) setSetting("openai_api_key", openai);
  if (anthropic) setSetting("anthropic_api_key", anthropic);
  setSetting("ai_provider", provider);
  revalidatePath("/settings");
  redirect("/settings?saved=1");
}

export async function rotateCalendarLink() {
  await requireSession();
  rotateCalendarToken();
  revalidatePath("/settings");
  redirect("/settings?calendar=rotated#calendar");
}

export async function skipProposal(id: string) {
  await requireSession();
  setProposalStatus(id, "skipped");
  logActivity("action", "טיוטה סומנה כלא רלוונטית (מהלוח)", { proposalId: id });
  revalidatePath("/inbox");
  revalidatePath("/");
}

/** "הוסף כפי שהוא": the draft becomes an item with the details found in the email. */
export async function addDraftAsIs(id: string) {
  await requireSession();
  const result = await applyDraft(id);
  logActivity("action", `${result.message} (מהלוח)`, { itemId: result.itemId, proposalId: id });
  revalidatePath("/inbox");
  revalidatePath("/");
  if (result.ok && result.itemId) redirect(`/items/${result.itemId}`);
  redirect(`/items/new?draft=${id}`);
}

/** "ביטלתי": the dashboard's quick answer for an overdue item. */
export async function setItemEnded(id: string) {
  await requireSession();
  setItemStatus(id, "ended");
  logActivity("action", "סומן כהסתיים (מהלוח)", { itemId: id });
  revalidatePath("/");
  revalidatePath(`/items/${id}`);
}

/** "הזכר לי בעוד שבוע" from the item page. */
export async function snoozeItem(id: string) {
  await requireSession();
  const until = formatISODate(new Date(parseISODate(todayISO()).getTime() + 7 * 86_400_000));
  setItemQuiet(id, { snoozed_until: until });
  logActivity("action", `מושתק עד ${until} (מהלוח)`, { itemId: id });
  revalidatePath(`/items/${id}`);
  revalidatePath("/");
}

/** "קיבלתי, בלי תזכורות נוספות" from the item page. */
export async function acknowledgeItem(id: string) {
  await requireSession();
  const item = getItem(id);
  if (!item) return;
  setItemQuiet(id, { ack_renewal_date: item.renewal_date, snoozed_until: null });
  logActivity("action", `אושר למחזור ${item.renewal_date} (מהלוח)`, { itemId: id });
  revalidatePath(`/items/${id}`);
  revalidatePath("/");
}

export async function sendTestAlert() {
  await requireSession();
  const toNote = getSetting("alert_emails") || process.env.ALERT_TO_EMAIL || "תיקיית data/outbox";
  await sendAlertMail({
    subject: "התראת בדיקה מחידוש",
    text: `אם קיבלתם את זה, הדואר היוצא עובד.\nיעד מוגדר: ${toNote}`,
    html: `<div dir="rtl" style="font-family:Assistant,Arial,sans-serif"><p>אם קיבלתם את זה, הדואר היוצא עובד.</p><p>יעד מוגדר: ${escapeHtml(String(toNote))}</p></div>`,
  });
  revalidatePath("/settings");
  redirect("/settings?test=1");
}

export async function runAlertsNow() {
  await requireSession();
  await runAlertCheck({ force: true });
  revalidatePath("/settings");
  revalidatePath("/");
  redirect("/settings?ran=1");
}

function isRedirect(err: unknown) {
  return typeof err === "object" && err !== null && "digest" in err &&
    String((err as { digest?: string }).digest).startsWith("NEXT_REDIRECT");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
