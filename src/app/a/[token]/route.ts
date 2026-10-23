import { NextRequest, NextResponse } from "next/server";
import { describeAction, performAction, readActionLink } from "@/lib/action-links";
import { escapeHtml, mailBaseUrl } from "@/lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The page behind every button in the tool's emails. Public by design (no login): the
// 43-character random token is the secret, it works once, and GET only shows a
// confirmation. The action itself runs on POST, so pre-fetching mail scanners do nothing.

function page(title: string, body: string): NextResponse {
  const html = `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${escapeHtml(title)} · כָּרבוֹל</title>
<link rel="icon" href="/brand/favicon.svg" type="image/svg+xml">
<style>
  body{margin:0;background:#f2f6fc;font-family:Heebo,Arial,sans-serif;color:#101d55;line-height:1.55}
  main{max-width:480px;margin:0 auto;padding:32px 20px}
  .logo{height:40px;width:auto;margin:0 0 18px}
  .card{background:#fff;border:1px solid #d9e2f0;border-radius:16px;padding:28px 24px;box-shadow:0 6px 20px rgba(16,29,85,.06)}
  h1{font-size:20px;margin:0 0 10px}
  p{margin:0 0 12px;font-size:16px}
  .muted{color:#53617c;font-size:14px}
  .ok{color:#2451d1}.bad{color:#d63232}
  .row{margin-top:20px;display:flex;flex-wrap:wrap;gap:10px}
  button,a.btn{display:inline-block;min-height:44px;padding:10px 22px;border-radius:8px;font:inherit;font-weight:700;font-size:16px;cursor:pointer;text-decoration:none}
  button{background:#ff7048;color:#101d55;border:1px solid #ff7048}
  a.btn{background:#fff;color:#101d55;border:1px solid #d9e2f0}
</style>
</head>
<body><main><img class="logo" src="/brand/logo.svg" alt="כָּרבוֹל"><div class="card">${body}</div></main></body></html>`;
  return new NextResponse(html, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

function openButton(itemId?: string): string {
  const href = itemId ? `${mailBaseUrl()}/items/${itemId}` : mailBaseUrl();
  return `<a class="btn" href="${escapeHtml(href)}">פתיחה בלוח</a>`;
}

function unavailable(state: "missing" | "used" | "expired"): NextResponse {
  const text =
    state === "used"
      ? "הכפתור הזה כבר נלחץ, ואי אפשר להשתמש בו שוב."
      : state === "expired"
        ? "תוקף הכפתור הזה פג (30 יום)."
        : "הקישור לא נמצא.";
  return page("הקישור לא פעיל", `<h1>הקישור לא פעיל</h1><p>${escapeHtml(text)}</p><p class="muted">אפשר לעשות את אותה פעולה בלוח, אחרי התחברות.</p><div class="row">${openButton()}</div>`);
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const found = readActionLink(token);
  if (found.state !== "ok") return unavailable(found.state);
  const d = describeAction(found.link);
  return page(
    d.title,
    `<h1>${escapeHtml(d.title)}</h1><p>${escapeHtml(d.detail)}</p>
<form method="post" class="row"><button type="submit">${escapeHtml(d.button)}</button>${openButton(found.link.payload.itemId)}</form>`,
  );
}

export async function POST(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const found = readActionLink(token);
  if (found.state !== "ok") return unavailable(found.state);
  const outcome = await performAction(found.link);
  const cls = outcome.ok ? "ok" : "bad";
  const title = outcome.ok ? "בוצע" : "לא בוצע";
  return page(
    title,
    `<h1 class="${cls}">${escapeHtml(title)}</h1><p>${escapeHtml(outcome.message)}</p><div class="row">${openButton(outcome.itemId)}</div>`,
  );
}
