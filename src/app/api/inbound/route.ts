import { NextRequest, NextResponse, after } from "next/server";
import { processReceivedEmail, verifySignature } from "@/lib/inbound";

export const runtime = "nodejs";

type ReceivedEvent = {
  type?: string;
  data?: { email_id?: string };
};

// Resend calls this for every email received at the tool's address.
// Public (no login) by design; authenticity comes from the webhook signature.
export async function POST(req: NextRequest) {
  const payload = await req.text();
  const ok = verifySignature(payload, {
    id: req.headers.get("svix-id"),
    timestamp: req.headers.get("svix-timestamp"),
    signature: req.headers.get("svix-signature"),
  });
  if (!ok) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: ReceivedEvent;
  try {
    event = JSON.parse(payload) as ReceivedEvent;
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  if (event.type !== "email.received" || !event.data?.email_id) {
    return NextResponse.json({ ignored: true });
  }

  // Answer Resend right away; AI + PDF extraction can take a while.
  const emailId = event.data.email_id;
  after(async () => {
    await processReceivedEmail(emailId);
  });
  return NextResponse.json({ accepted: true });
}
