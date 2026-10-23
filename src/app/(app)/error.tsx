"use client";

import { btnPrimary } from "@/components/styles";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold tracking-tight">משהו השתבש</h1>
      <p className="mt-3 text-sm leading-6 text-muted">{error.message}</p>
      <button type="button" onClick={reset} className={`${btnPrimary} mt-6`}>
        נסו שוב
      </button>
    </div>
  );
}
