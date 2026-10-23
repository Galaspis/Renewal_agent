import { ItemForm } from "@/components/ItemForm";
import { createItem } from "@/app/actions";
import { requireSession } from "@/lib/auth";
import { isCategoryValue } from "@/lib/extract-renewal";
import { getProposal, proposalFiles } from "@/lib/proposals";

export const dynamic = "force-dynamic";

export default async function NewItemPage({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string }>;
}) {
  await requireSession();
  const { draft: draftId } = await searchParams;
  const proposal = draftId ? getProposal(draftId) : undefined;
  const draft =
    proposal && proposal.status === "pending"
      ? {
          id: proposal.id,
          name: proposal.name,
          category: isCategoryValue(proposal.category) ? proposal.category : "other",
          provider: proposal.provider,
          renewal_date: proposal.renewal_date,
          amount: proposal.amount,
          currency: proposal.currency,
          notes: proposal.notes,
          fileCount: proposalFiles(proposal).length,
        }
      : undefined;

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">{draft ? "אישור טיוטה" : "הוספת חידוש"}</h1>
      <p className="mt-1.5 text-sm leading-6 text-muted">
        {draft ? "בדקו תאריך ומחיר. כלום לא נשמר בלוח עד הלחיצה על שמירה." : "קודם תאריך ומחיר. אפשר גם למלא ידנית."}
      </p>
      <div className="mt-6">
        <ItemForm action={createItem} submitLabel="שמירה" draft={draft} />
      </div>
    </div>
  );
}
