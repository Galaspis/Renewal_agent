import { notFound } from "next/navigation";
import { updateItem } from "@/app/actions";
import { ItemForm } from "@/components/ItemForm";
import { requireSession } from "@/lib/auth";
import { getItem } from "@/lib/items";

export const dynamic = "force-dynamic";

export default async function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const item = getItem(id);
  if (!item) notFound();

  return (
    <div>
      <h1 className="text-[28px] font-bold leading-tight text-navy">עריכה</h1>
      <p className="mt-1 text-[15px] text-muted">{item.name}</p>
      <div className="mt-8">
        <ItemForm item={item} action={updateItem.bind(null, item.id)} submitLabel="שמירת שינויים" />
      </div>
    </div>
  );
}
