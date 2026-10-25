import type { ReactNode } from "react";
import { Nav } from "@/components/Nav";
import { countPendingProposals } from "@/lib/proposals";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: ReactNode }) {
  let pendingDrafts = 0;
  try {
    pendingDrafts = countPendingProposals();
  } catch {
    // The badge is a convenience; the app must render without it.
  }
  return (
    <>
      <Nav pendingDrafts={pendingDrafts} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-8 md:px-6 md:pb-20 md:pt-10">{children}</main>
    </>
  );
}
