import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { appBaseUrl, buildIcs, calendarToken } from "@/lib/calendar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// iCalendar feed. Public (no login) by design; the long token in the URL is the secret.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const given = Buffer.from(token.replace(/\.ics$/, ""));
  const expected = Buffer.from(calendarToken());
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const body = buildIcs(await appBaseUrl());
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="renewals.ics"',
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
