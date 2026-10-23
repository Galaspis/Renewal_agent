export function todayISO(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function formatISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function daysUntil(iso: string, now = new Date()): number {
  const start = parseISODate(todayISO(now)).getTime();
  const end = parseISODate(iso).getTime();
  return Math.round((end - start) / 86_400_000);
}

export function addCadence(
  iso: string,
  cadence: "monthly" | "yearly" | "once" | "custom",
  cadenceMonths: number | null,
): string | null {
  if (cadence === "once") return null;
  const date = parseISODate(iso);
  if (cadence === "yearly") {
    date.setFullYear(date.getFullYear() + 1);
  } else if (cadence === "monthly") {
    date.setMonth(date.getMonth() + 1);
  } else {
    date.setMonth(date.getMonth() + (cadenceMonths && cadenceMonths > 0 ? cadenceMonths : 12));
  }
  return formatISODate(date);
}

export function hoursSince(isoTimestamp: string, now = new Date()): number {
  const then = Date.parse(isoTimestamp);
  if (Number.isNaN(then)) return Number.POSITIVE_INFINITY;
  return (now.getTime() - then) / 3_600_000;
}

export function displayDate(iso: string): string {
  const date = parseISODate(iso);
  return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
}
