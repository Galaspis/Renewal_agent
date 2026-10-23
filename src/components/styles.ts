// Shared class strings. Karbol: the important action is orange with navy text,
// everything else is white with a pale-blue border; 8px corners on buttons, 12-16px on cards.

export const btnPrimary =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-bold text-navy transition-colors hover:bg-[#ff8a68] disabled:opacity-60";

export const btnSecondary =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-line bg-card px-4 text-sm font-medium text-foreground transition-colors hover:border-accent hover:text-accent disabled:opacity-60";

export const btnQuiet =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-3 text-sm text-muted transition-colors hover:bg-accent-soft hover:text-accent";

export const btnDanger =
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-danger/30 bg-card px-4 text-sm font-medium text-danger transition-colors hover:bg-danger/5";

export const fieldClass =
  "mt-1.5 min-h-11 w-full rounded-lg border border-line bg-card px-3 py-2 text-base outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/15 sm:text-sm";

export const labelClass = "block text-sm font-medium text-foreground";

export const cardClass = "rounded-2xl border border-line bg-card shadow-[0_6px_20px_rgba(16,29,85,0.06)]";
