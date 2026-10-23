import Link from "next/link";
import { IconPlus } from "./Icons";
import { btnPrimary, cardClass } from "./styles";

export function EmptyState({
  title,
  body,
  actionHref,
  actionLabel,
}: {
  title: string;
  body: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className={`${cardClass} mt-6 px-6 py-12 text-center`}>
      <p className="text-base font-semibold">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">{body}</p>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className={`${btnPrimary} mt-6`}>
          {actionHref === "/items/new" ? <IconPlus className="size-4" /> : null}
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
