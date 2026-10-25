import Link from "next/link";
import { lastAlertRun } from "@/lib/alerts";
import { aiConfigured, aiProviderLabel, anthropicKey, geminiKey, openaiKey } from "@/lib/ai-extract";
import { requireSession } from "@/lib/auth";
import { appBaseUrl, calendarToken } from "@/lib/calendar";
import { getSetting } from "@/lib/db";
import { inboundAddress, inboundConfigured, inboundSecret, lastInbound } from "@/lib/inbound";
import { DEFAULT_SENDER_NAME, alertRecipients, mailConfigured, senderAddress } from "@/lib/mail";
import {
  rotateCalendarLink,
  runAlertsNow,
  saveAiSettings,
  saveAlertSettings,
  saveInboundSettings,
  sendTestAlert,
} from "@/app/actions";
import { CopyField } from "@/components/CopyField";
import { PageHeader } from "@/components/PageHeader";
import { btnPrimary, btnSecondary, cardClass, fieldClass, labelClass } from "@/components/styles";

export const dynamic = "force-dynamic";

const help = "mt-1 block text-[13px] font-normal text-muted";
const check = "flex items-start gap-3 text-[15px]";
const textLink = "text-sm font-medium text-accent hover:underline";

function when(iso: string): string {
  return new Date(iso).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Card({
  id,
  title,
  description,
  saved,
  children,
}: {
  id: string;
  title: string;
  description: string;
  saved?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`${cardClass} scroll-mt-24 p-5 sm:p-6`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[17px] font-semibold text-navy">{title}</h2>
        {saved ? <span className="text-sm text-accent">נשמר</span> : null}
      </div>
      <p className="mt-1 text-[15px] text-muted">{description}</p>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

function inboundStatus(): string {
  if (!inboundConfigured()) return "עדיין לא פעיל. הדביקו את המפתח מדף ה־Webhook ב־Resend.";
  const last = lastInbound();
  if (!last) return "פעיל. עדיין לא הגיע מייל.";
  const outcome = last.applied ? "נוסף/עודכן" : last.created ? "טיוטה" : last.already ? "כבר היה" : last.error ? "" : "לא רלוונטי";
  return [`מייל אחרון ${when(last.scannedAt)}`, last.subject, outcome, last.error].filter(Boolean).join(" · ");
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; test?: string; ran?: string; calendar?: string }> }) {
  await requireSession();
  const query = await searchParams;
  const feedUrl = `${await appBaseUrl()}/api/calendar/${calendarToken()}.ics`;
  const googleAddUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feedUrl)}`;
  const emails = getSetting("alert_emails") ?? process.env.ALERT_TO_EMAIL ?? "";
  const autoCheck = getSetting("auto_check") !== "0";
  const autoApply = getSetting("auto_apply") !== "0";
  const last = lastAlertRun();
  const recipients = alertRecipients();
  const viaEmail = mailConfigured() && recipients.length > 0;
  const provider = getSetting("ai_provider") || "auto";
  const inboundAddr = inboundAddress();
  const inboundSecretSaved = Boolean(inboundSecret());
  const keyPlaceholder = (saved: boolean, sample: string) => (saved ? "שמור. השאירו ריק כדי לא לשנות" : sample);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="הגדרות" description="כל חלק נשמר בנפרד." />

      <Card id="alerts" title="תזכורות" description="לאן נשלחות התזכורות ומי השולח." saved={query.saved === "alerts"}>
        <form action={saveAlertSettings} className="space-y-5">
          <label className={labelClass}>
            אל מי לשלוח
            <textarea className={`${fieldClass} min-h-20`} name="alert_emails" defaultValue={emails} placeholder="you@example.com" dir="ltr" />
            <span className={help}>כתובת אחת בכל שורה.</span>
          </label>
          <label className={labelClass}>
            שם השולח
            <input className={fieldClass} name="sender_name" defaultValue={getSetting("sender_name") ?? ""} placeholder={DEFAULT_SENDER_NAME} maxLength={60} />
            <span className={help}>הכתובת עצמה נשארת {senderAddress()}.</span>
          </label>
          <label className={check}>
            <input type="checkbox" name="auto_check" defaultChecked={autoCheck} className="mt-1 size-4 accent-accent" />
            <span>
              לבדוק תזכורות גם בפתיחת הלוח
              <span className={help}>בנוסף לשליחה היומית אחרי 08:00.</span>
            </span>
          </label>
          <button type="submit" className={btnPrimary}>
            שמירה
          </button>
        </form>
      </Card>

      <Card id="inbound" title="מיילים שמעבירים לכלי" description="פוליסה, חשבונית או הודעת חידוש שמעבירים לכתובת הזו נכנסות ללוח לבד." saved={query.saved === "inbound"}>
        {inboundAddr ? <CopyField label="הכתובת להעברה" value={inboundAddr} /> : <p className="text-sm text-muted">הכתובת להעברה לא מוגדרת (INBOUND_ADDRESS).</p>}
        <form action={saveInboundSettings} className="space-y-5">
          <label className={check}>
            <input type="checkbox" name="auto_apply" defaultChecked={autoApply} className="mt-1 size-4 accent-accent" />
            <span>
              להוסיף לבד כשיש שם ותאריך
              <span className={help}>בלי זה, כל מייל מחכה בטיוטות לאישור.</span>
            </span>
          </label>
          <label className={labelClass}>
            מפתח החיבור מ־Resend
            <input className={fieldClass} name="inbound_webhook_secret" type="password" dir="ltr" placeholder={keyPlaceholder(inboundSecretSaved, "whsec_…")} autoComplete="off" />
            <span className={help}>{inboundStatus()}</span>
          </label>
          <button type="submit" className={btnPrimary}>
            שמירה
          </button>
        </form>
      </Card>

      <Card id="ai" title="קריאת המיילים" description={aiConfigured() ? `המיילים נקראים על ידי ${aiProviderLabel()}.` : "בלי מפתח, הכלי מחפש רק מילים ותאריכים בטקסט."} saved={query.saved === "ai"}>
        <form action={saveAiSettings} className="space-y-5">
          <label className={labelClass}>
            מודל
            <select className={fieldClass} name="ai_provider" defaultValue={provider}>
              <option value="auto">אוטומטי (Claude, אחר כך OpenAI, אחר כך Gemini)</option>
              <option value="claude">Claude</option>
              <option value="openai">OpenAI</option>
              <option value="gemini">Gemini</option>
            </select>
          </label>
          <details className="group">
            <summary className={`cursor-pointer list-none ${textLink}`}>
              <span className="group-open:hidden">מפתחות</span>
              <span className="hidden group-open:inline">הסתרת המפתחות</span>
            </summary>
            <div className="mt-4 space-y-4">
              <label className={labelClass}>
                Claude
                <input className={fieldClass} name="anthropic_api_key" type="password" dir="ltr" placeholder={keyPlaceholder(Boolean(anthropicKey()), "sk-ant-…")} autoComplete="off" />
              </label>
              <label className={labelClass}>
                OpenAI
                <input className={fieldClass} name="openai_api_key" type="password" dir="ltr" placeholder={keyPlaceholder(Boolean(openaiKey()), "sk-…")} autoComplete="off" />
              </label>
              <label className={labelClass}>
                Gemini
                <input className={fieldClass} name="gemini_api_key" type="password" dir="ltr" placeholder={keyPlaceholder(Boolean(geminiKey()), "AIza…")} autoComplete="off" />
              </label>
            </div>
          </details>
          <button type="submit" className={btnPrimary}>
            שמירה
          </button>
        </form>
      </Card>

      <Card id="calendar" title="יומן" description="כל החידושים כאירועים ביומן שלכם, עם תזכורת שבוע לפני. מתעדכן לבד.">
        {query.calendar === "rotated" ? <p className="text-sm text-accent">הקישור הוחלף. הסירו את היומן הישן והוסיפו את החדש.</p> : null}
        <div className="flex flex-wrap gap-2">
          <a href={googleAddUrl} target="_blank" rel="noreferrer" className={btnSecondary}>
            הוספה ל־Google Calendar
          </a>
          <a href={feedUrl.replace(/^https?:/, "webcal:")} className={btnSecondary}>
            הוספה ל־iPhone או Outlook
          </a>
        </div>
        <CopyField label="הקישור ליומן (סודי)" value={feedUrl} />
        <form action={rotateCalendarLink}>
          <button type="submit" className={textLink}>
            החלפת הקישור
          </button>
        </form>
      </Card>

      <Card id="system" title="מה הכלי עשה" description={viaEmail ? `תזכורות נשלחות אל ${recipients.join(", ")}.` : "עדיין אין ספק דואר: תזכורות נכתבות לתיקייה בשרת."}>
        <div className="space-y-1 text-[15px]">
          <p>
            <span className="text-muted">מייל אחרון: </span>
            {lastInbound() ? inboundStatus() : "עדיין לא הגיע מייל."}
          </p>
          <p>
            <span className="text-muted">תזכורות: </span>
            {last
              ? `נבדק ${when(last.checkedAt)}${last.sent.length > 0 ? ` · נשלח: ${last.sent.map((row) => row.name).join(", ")}` : " · לא היה מה לשלוח"}${last.error ? ` · ${last.error}` : ""}`
              : "עדיין לא נבדקו."}
          </p>
          {query.test ? <p className="text-accent">נשלח מייל בדיקה.</p> : null}
          {query.ran ? <p className="text-accent">בדיקת התזכורות הסתיימה.</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <form action={sendTestAlert}>
            <button type="submit" className={btnSecondary}>
              שליחת מייל בדיקה
            </button>
          </form>
          <form action={runAlertsNow}>
            <button type="submit" className={btnSecondary}>
              בדיקת תזכורות עכשיו
            </button>
          </form>
          <Link href="/activity" className={textLink}>
            יומן הפעילות
          </Link>
        </div>
      </Card>
    </div>
  );
}
