import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  icon,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
}) {
  return (
    <div>
      <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
        {icon}
        {title}
      </h1>
      {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
    </div>
  );
}
