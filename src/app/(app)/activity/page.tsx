import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { cardClass } from "@/components/styles";
import { listActivity, type ActivityKind, type ActivityRow } from "@/lib/activity";
import { requireSession } from "@/lib/auth";
import { getItem } from "@/lib/items";
import { getProposal } from "@/lib/proposals";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<ActivityKind, string> = {
  inbound: "מייל נקלט",
  receipt: "אישור נשלח",
  alert: "תזכורת נשלחה",
  action: "כפתור נלחץ",
};

const KIND_TONE: Record<ActivityKind, string> = {
  inbound: "bg-accent-soft text-accent",
  receipt: "bg-line/60 text-muted",
  alert: "bg-warn/10 text-warn",
  action: "bg-ok/10 text-ok",
};

function dayOf(iso: string): string {
  return new Date(iso).toLocaleDateString("he-IL", {
    timeZone: "Asia/Jerusalem",
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString("he-IL", { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit" });
}

function target(row: ActivityRow): { href: string; label: string } | null {
  if (row.item_id) {
    const item = getItem(row.item_id);
    if (item) return { href: `/items/${item.id}`, label: item.name };
  }
  if (row.proposal_id) {
    const proposal = getProposal(row.proposal_id);
    if (proposal && proposal.status === "pending") return { href: "/inbox", label: "לטיוטה" };
  }
  return null;
}

export default async function ActivityPage() {
  await requireSession();
  const rows = listActivity(200);

  const days = new Map<string, ActivityRow[]>();
  for (const row of rows) {
    const key = dayOf(row.at);
    days.set(key, [...(days.get(key) ?? []), row]);
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="יומן פעילות"
        description="כל מה שהכלי עשה: מיילים שנקלטו, אישורים ותזכורות שנשלחו, כפתורים שנלחצו."
      />

      {rows.length === 0 ? (
        <EmptyState title="עדיין אין פעילות" body="ברגע שיגיע מייל או תישלח תזכורת, זה יופיע כאן." />
      ) : (
        <div className="mt-6 space-y-6">
          {[...days.entries()].map(([day, list]) => (
            <section key={day}>
              <h2 className="mb-2 text-sm font-medium text-foreground">{day}</h2>
              <ul className={`${cardClass} divide-y divide-line`}>
                {list.map((row) => {
                  const link = target(row);
                  const kind = row.kind in KIND_LABEL ? row.kind : "action";
                  return (
                    <li key={row.id} className="flex flex-wrap items-start gap-x-3 gap-y-1 px-4 py-3 text-sm">
                      <span className="w-12 shrink-0 tabular-nums text-muted">{timeOf(row.at)}</span>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${KIND_TONE[kind]}`}>
                        {KIND_LABEL[kind]}
                      </span>
                      <span className="min-w-0 flex-1 break-words leading-6">{row.detail}</span>
                      {link ? (
                        <Link href={link.href} className="shrink-0 text-accent hover:underline">
                          {link.label}
                        </Link>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
