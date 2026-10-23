import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-cookie";
import { hubUserFromHeaders } from "@/lib/hub-auth";

export async function proxy(req: NextRequest) {
  // Behind the gallab hub (HUB_AUTH=1), Caddy has already enforced the Google login
  // and passes the identity as Remote-Email; no second password here.
  const hubUser = hubUserFromHeaders(req.headers);
  if (hubUser) {
    if (req.nextUrl.pathname === "/login") {
      const home = req.nextUrl.clone();
      home.pathname = "/";
      home.search = "";
      return NextResponse.redirect(home);
    }
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const secret = process.env.SESSION_SECRET;
  if (token && secret) {
    try {
      await jwtVerify(token, new TextEncoder().encode(secret));
      return NextResponse.next();
    } catch {
      // fall through to login
    }
  }

  if (req.nextUrl.pathname === "/login") return NextResponse.next();
  const login = req.nextUrl.clone();
  login.pathname = "/login";
  login.search = "";
  return NextResponse.redirect(login);
}

export const config = {
  // /a/<token>: one-tap buttons from emails. No login; the long single-use token is the secret.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|site.webmanifest|brand/|robots.txt|api/cron|api/inbound|api/calendar|a/).*)",
  ],
};
