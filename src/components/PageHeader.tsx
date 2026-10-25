import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  /** Buttons or links shown at the end of the header row. */
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="flex items-center gap-2 text-[28px] font-bold leading-tight text-navy">
          {icon}
          {title}
        </h1>
        {description ? <p className="mt-1 text-[15px] text-muted">{description}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}
