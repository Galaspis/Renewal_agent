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
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="טיוטות" description="מיילים שהכלי לא היה בטוח לגביהם. כל אחד אומר מה חסר." />

      {drafts.length === 0 ? (
        <EmptyState
          title="אין טיוטות ממתינות"
          body="מייל עם שם ותאריך נכנס ללוח לבד. רק מה שלא ברור מחכה כאן."
          actionHref="/settings#inbound"
          actionLabel="הכתובת להעברה"
        />
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {drafts.map((draft) => {
            const category = isCategoryValue(draft.category) ? draft.category : "other";
            const matched = draft.matched_item_id ? getItem(draft.matched_item_id) : undefined;
            const files = proposalFiles(draft);
            const complete = draftIsComplete(draft);
            const facts = [
              CATEGORY_LABELS[category],
              draft.provider,
              draft.renewal_date ? displayDate(draft.renewal_date) : "בלי תאריך",
              draft.amount != null ? formatMoney(draft.amount, draft.currency) : null,
              files.length > 0 ? `${files.length} קבצים` : null,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <article key={draft.id} className={`${cardClass} p-5`}>
                <h2 className="text-[17px] font-semibold text-navy">{draft.name || draft.subject || "מייל בלי נושא"}</h2>
                <p className="mt-1 text-[15px] text-muted">{draftReason(draft, autoApply)}</p>
                <p className="mt-3 text-sm text-muted">
                  {facts}
                  {draft.from_email ? ` · מאת ${draft.from_email}` : ""}
                  {matched ? (
                    <>
                      {" · דומה ל"}
                      <Link href={`/items/${matched.id}`} className="text-accent hover:underline">
                        {matched.name}
                      </Link>
                    </>
                  ) : null}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
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
                    <button type="submit" className="text-sm text-muted hover:text-navy">
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
