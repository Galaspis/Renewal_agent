"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions";
import { IconAdd, IconCalendar, IconFolder, IconHome, IconInbox, IconLogout, IconSettings } from "./Icons";
import { btnPrimary } from "./styles";

// Five places. Insurance is a filter inside חידושים; the activity log lives under הגדרות.
const links = [
  { href: "/", label: "דף הבית", short: "הבית", icon: IconHome },
  { href: "/items", label: "חידושים", short: "חידושים", icon: IconFolder },
  { href: "/calendar", label: "יומן", short: "יומן", icon: IconCalendar },
  { href: "/inbox", label: "טיוטות", short: "טיוטות", icon: IconInbox },
  { href: "/settings", label: "הגדרות", short: "הגדרות", icon: IconSettings },
];

function isActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/";
  if (href === "/items") return pathname === "/items" || pathname.startsWith("/items/") || pathname === "/insurance";
  if (href === "/settings") return pathname === "/settings" || pathname === "/activity";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Red count on the drafts link: how many forwarded emails wait for a decision. */
function Badge({ count, className = "" }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      aria-label={`${count} טיוטות ממתינות`}
      className={`inline-flex min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[11px] font-semibold leading-5 text-white ${className}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function Nav({ pendingDrafts = 0 }: { pendingDrafts?: number }) {
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-card">
        <div className="mx-auto grid h-16 w-full max-w-6xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 md:h-[72px] md:px-6">
          <Link href="/" className="flex min-w-0 items-center justify-self-start" aria-label="כָּרבוֹל, דף הבית">
            {/* The horizontal logo is the unit: rooster + wordmark with its vowel marks. Never retyped. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo.svg" alt="כָּרבוֹל" className="h-10 w-auto md:h-11" />
          </Link>
          <nav className="hidden h-full items-stretch justify-center gap-8 md:flex">
            {links.map((link) => {
              const active = isActive(link.href, pathname);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-0.5 text-[15px] ${
                    active ? "border-accent font-semibold text-navy" : "border-transparent font-medium text-muted hover:text-navy"
                  }`}
                >
                  {link.label}
                  {link.href === "/inbox" ? <Badge count={pendingDrafts} /> : null}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center justify-self-end gap-2">
            <div className="hidden md:block">
              <Link href="/items/new" className={btnPrimary}>
                <IconAdd className="size-4" />
                הוספת חידוש
              </Link>
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="inline-flex size-10 items-center justify-center rounded-lg text-muted transition-colors hover:bg-accent-soft hover:text-navy"
                aria-label="יציאה"
                title="יציאה"
              >
                <IconLogout className="size-5" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card md:hidden" aria-label="ניווט">
        <div className="grid grid-cols-5">
          {links.map((link) => {
            const active = isActive(link.href, pathname);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] ${
                  active ? "font-semibold text-accent" : "text-muted"
                }`}
              >
                {link.href === "/inbox" ? <Badge count={pendingDrafts} className="absolute top-1.5 end-4" /> : null}
                <Icon className="size-6" />
                {link.short}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
