"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions";
import { IconLogout, IconPlus, IconShield } from "./Icons";
import { btnPrimary, btnQuiet } from "./styles";

const links = [
  { href: "/", label: "הקרובים" },
  { href: "/items", label: "הכל" },
  { href: "/calendar", label: "יומן" },
  { href: "/insurance", label: "ביטוחים" },
  { href: "/inbox", label: "טיוטות" },
  { href: "/activity", label: "יומן פעילות" },
  { href: "/settings", label: "הגדרות" },
];

// The phone bar has room for six: four pages, add, settings. Drafts take the insurance
// slot there, because drafts are what needs a decision; insurance stays under "הכל".
const mobileLinks = [links[0], links[1], links[2], links[4]];

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
      <header className="sticky top-0 z-20 border-b border-line/80 bg-card/90 backdrop-blur">
        <div className="mx-auto grid h-16 w-full max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4">
          <Link href="/" className="flex items-center gap-2 justify-self-start">
            <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-white">
              <IconShield className="size-5" />
            </span>
            <span className="text-base font-semibold tracking-tight">מנויים</span>
          </Link>
          <nav className="hidden h-full items-stretch gap-6 md:flex">
            {links.map((link) => {
              const active = isActive(link.href, pathname);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 border-b-2 px-1 text-sm ${
                    active
                      ? "border-accent font-medium text-accent"
                      : "border-transparent text-muted hover:text-foreground"
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
                <IconPlus className="size-4" />
                הוסף מנוי
              </Link>
            </div>
            <form action={logout}>
              <button type="submit" className={btnQuiet}>
                <IconLogout className="size-4" />
                יציאה
              </button>
            </form>
          </div>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card md:hidden">
        <div className="grid grid-cols-6">
          {mobileLinks.map((link) => {
            const active = isActive(link.href, pathname);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative flex min-h-12 flex-col items-center justify-center border-t-2 text-sm ${
                  active ? "border-accent font-medium text-accent" : "border-transparent text-muted"
                }`}
              >
                {link.href === "/inbox" ? (
                  <Badge count={pendingDrafts} className="absolute top-1 end-3" />
                ) : null}
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/items/new"
            className={`flex min-h-12 flex-col items-center justify-center border-t-2 text-sm ${
              pathname === "/items/new"
                ? "border-accent font-medium text-accent"
                : "border-transparent text-muted"
            }`}
          >
            הוספה
          </Link>
          <Link
            href="/settings"
            className={`flex min-h-12 flex-col items-center justify-center border-t-2 text-sm ${
              isActive("/settings", pathname)
                ? "border-accent font-medium text-accent"
                : "border-transparent text-muted"
            }`}
          >
            הגדרות
          </Link>
        </div>
      </nav>
    </>
  );
}
