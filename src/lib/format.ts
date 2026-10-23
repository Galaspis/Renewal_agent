import { daysUntil } from "./dates";

export function formatMoney(amount: number | null, currency: string): string {
  if (amount == null) return "—";
  try {
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function formatDaysLeft(iso: string): string {
  const days = daysUntil(iso);
  if (days < 0) {
    const n = Math.abs(days);
    return n === 1 ? "באיחור של יום" : `באיחור של ${n} ימים`;
  }
  if (days === 0) return "היום";
  if (days === 1) return "מחר";
  return `${days} ימים`;
}

export function urgencyClass(iso: string): string {
  const days = daysUntil(iso);
  if (days < 0) return "text-danger";
  if (days <= 7) return "text-warn";
  return "text-muted";
}

export function urgencyBadgeClass(iso: string): string {
  const days = daysUntil(iso);
  if (days < 0) return "bg-danger/10 text-danger";
  if (days <= 7) return "bg-warn/10 text-warn";
  if (days <= 30) return "bg-accent-soft text-accent";
  return "bg-line/60 text-muted";
}

export function bytesLabel(size: number): string {
  if (size < 1024) return `${size} ב׳`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} ק״ב`;
  return `${(size / (1024 * 1024)).toFixed(1)} מ״ב`;
}
