import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { runAlertCheck } from "@/lib/alerts";
import { SESSION_COOKIE } from "@/lib/session-cookie";

export const runtime = "nodejs";

async function authorized(req: NextRequest): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization");
  if (cronSecret && header === `Bearer ${cronSecret}`) return true;

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const sessionSecret = process.env.SESSION_SECRET;
  if (!token || !sessionSecret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(sessionSecret));
    return true;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!(await authorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runAlertCheck({ force: true });
  return NextResponse.json(result);
}

export async function GET(req: NextRequest) {
  return POST(req);
}
