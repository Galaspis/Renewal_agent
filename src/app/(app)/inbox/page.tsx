import Link from "next/link";
import { addDraftAsIs, skipProposal } from "@/app/actions";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { btnPrimary, btnSecondary, cardClass } from "@/components/styles";
import { draftIsComplete, draftReason } from "@/lib/apply-draft";
import { requireSession } from "@/lib/auth";
import { CATEGORY_LABELS } from "@/lib/categories";
import { displayDate } from "@/lib/dates";
import { isCategoryValue } from "@/lib/extract-renewal";
import { formatMoney } from "@/lib/format";
import { autoApplyEnabled } from "@/lib/ingest-email";
import { getItem } from "@/lib/items";
import { listPendingProposals, proposalFiles } from "@/lib/proposals";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  await requireSession();
  const drafts = listPendingProposals();
  const autoApply = autoApplyEnabled();

  return (
    <div>
      <PageHeader
        title="טיוטות"
        description="מיילים שהכלי לא היה בטוח לגביהם. כל אחד אומר מה חסר, ואפשר להוסיף בלחיצה אחת."
      />

      {drafts.length === 0 ? (
        <EmptyState
          title="אין טיוטות ממתינות"
          body="מיילים שהעברתם לכתובת של הכלי ושיש בהם שם ותאריך נכנסים ללוח לבד. רק מה שלא ברור מחכה כאן."
          actionHref="/settings"
          actionLabel="הכתובת להעברה"
        />
      ) : (
        <div className="mt-6 grid gap-3">
          {drafts.map((draft) => {
            const category = isCategoryValue(draft.category) ? draft.category : "other";
            const matched = draft.matched_item_id ? getItem(draft.matched_item_id) : undefined;
            const files = proposalFiles(draft);
            const complete = draftIsComplete(draft);
            return (
              <article key={draft.id} className={`${cardClass} p-5`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold">{draft.name || draft.subject || "מייל בלי נושא"}</h2>
                    <p className="mt-1 text-sm text-muted">
                      {draft.source === "forward" ? "הועבר" : "נסרק (ישן)"}
                      {draft.from_email ? ` · ${draft.from_email}` : ""}
                      {draft.received_at ? ` · ${displayDate(draft.received_at.slice(0, 10))}` : ""}
                    </p>
                  </div>
                  <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
                    {draft.verdict === "exists" ? "כנראה כבר במעקב" : draft.verdict === "weak" ? "לא בטוח" : "מועמד"}
                  </span>
                </div>
                <p className="mt-3 rounded-xl bg-warn/10 px-3 py-2 text-sm text-warn">
                  למה זה כאן: {draftReason(draft, autoApply)}
                </p>
                <p className="mt-3 text-sm text-muted">
                  {CATEGORY_LABELS[category]}
                  {draft.provider ? ` · ${draft.provider}` : ""}
                  {draft.renewal_date ? ` · ${displayDate(draft.renewal_date)}` : " · בלי תאריך ברור"}
                  {draft.amount != null ? ` · ${formatMoney(draft.amount, draft.currency)}` : ""}
                  {files.length > 0 ? ` · ${files.length} קבצים` : ""}
                </p>
                {draft.snippet ? <p className="mt-2 text-sm leading-6">{draft.snippet}</p> : null}
                {matched ? (
                  <p className="mt-2 text-sm text-muted">
                    דומה ל־
                    <Link href={`/items/${matched.id}`} className="text-accent hover:underline">
                      {matched.name}
                    </Link>
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {complete ? (
                    <form action={addDraftAsIs.bind(null, draft.id)}>
                      <button type="submit" className={btnPrimary}>
                        {matched ? "עדכן כפי שהוא" : "הוסף כפי שהוא"}
                      </button>
                    </form>
                  ) : null}
                  <Link href={`/items/new?draft=${draft.id}`} className={complete ? btnSecondary : btnPrimary}>
                    {complete ? "בדוק ותקן" : "השלם פרטים"}
                  </Link>
                  <form action={skipProposal.bind(null, draft.id)}>
                    <button type="submit" className={btnSecondary}>
                      לא רלוונטי
                    </button>
                  </form>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
