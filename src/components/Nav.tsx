"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions";
import { IconAdd, IconCalendar, IconHome, IconInbox, IconLogout, IconSettings, IconFolder } from "./Icons";
import { btnPrimary, btnQuiet } from "./styles";

const links = [
  { href: "/", label: "דף הבית" },
  { href: "/items", label: "כל החידושים" },
  { href: "/calendar", label: "יומן" },
  { href: "/insurance", label: "ביטוחים" },
  { href: "/inbox", label: "טיוטות" },
  { href: "/activity", label: "יומן פעילות" },
  { href: "/settings", label: "הגדרות" },
];

// The phone bar: four pages with icons, add, settings. Drafts take a slot because
// they are what needs a decision; insurance stays under "כל החידושים".
const mobileLinks = [
  { href: "/", label: "הבית", icon: IconHome },
  { href: "/items", label: "חידושים", icon: IconFolder },
  { href: "/calendar", label: "יומן", icon: IconCalendar },
  { href: "/inbox", label: "טיוטות", icon: IconInbox },
];

function isActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/";
  if (href === "/items") {
    return pathname === "/items" || (pathname.startsWith("/items/") && pathname !== "/items/new");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Red count on the drafts link: how many forwarded emails wait for a decision. */
function Badge({ count, className = "" }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      aria-label={`${count} טיוטות ממתינות`}
      className={`inline-flex min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[11px] font-bold leading-5 text-white ${className}`}
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
        <div className="mx-auto grid h-16 w-full max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-4 px-4 md:h-[72px]">
          <Link href="/" className="flex items-center justify-self-start" aria-label="כָּרבוֹל, דף הבית">
            {/* The horizontal logo is the unit: rooster + wordmark with its vowel marks. Never retyped. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo.svg" alt="כָּרבוֹל" className="h-10 w-auto md:h-12" />
          </Link>
          <nav className="hidden h-full items-stretch justify-center gap-7 md:flex">
            {links.map((link) => {
              const active = isActive(link.href, pathname);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 border-b-[3px] px-0.5 text-[15px] ${
                    active
                      ? "border-accent font-bold text-accent"
                      : "border-transparent font-medium text-navy/80 hover:text-accent"
                  }`}
                >
                  {link.label}
                  {link.href === "/inbox" ? <Badge count={pendingDrafts} /> : null}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center justify-self-end gap-1">
            <div className="hidden md:block">
              <Link href="/items/new" className={btnPrimary}>
                <IconAdd className="size-4" />
                הוספת חידוש
              </Link>
            </div>
            <form action={logout}>
              <button type="submit" className={btnQuiet} aria-label="יציאה">
                <IconLogout className="size-5" />
                <span className="hidden sm:inline">יציאה</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card md:hidden">
        <div className="grid grid-cols-6">
          {mobileLinks.map((link) => {
            const active = isActive(link.href, pathname);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 border-t-2 text-[11px] ${
                  active ? "border-accent font-bold text-accent" : "border-transparent text-muted"
                }`}
              >
                {link.href === "/inbox" ? <Badge count={pendingDrafts} className="absolute top-1 end-3" /> : null}
                <Icon className="size-6" />
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/items/new"
            className="flex min-h-14 flex-col items-center justify-center gap-0.5 border-t-2 border-transparent text-[11px] text-navy"
          >
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary">
              <IconAdd className="size-4" />
            </span>
            הוספה
          </Link>
          <Link
            href="/settings"
            className={`flex min-h-14 flex-col items-center justify-center gap-0.5 border-t-2 text-[11px] ${
              isActive("/settings", pathname) ? "border-accent font-bold text-accent" : "border-transparent text-muted"
            }`}
          >
            <IconSettings className="size-6" />
            הגדרות
          </Link>
        </div>
      </nav>
    </>
  );
}
