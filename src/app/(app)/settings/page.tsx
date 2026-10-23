import { lastAlertRun } from "@/lib/alerts";
import { aiConfigured, aiProviderLabel, anthropicKey, geminiKey, openaiKey } from "@/lib/ai-extract";
import { requireSession } from "@/lib/auth";
import { appBaseUrl, calendarToken } from "@/lib/calendar";
import { getSetting } from "@/lib/db";
import { inboundAddress, inboundConfigured, inboundSecret, lastInbound } from "@/lib/inbound";
import { DEFAULT_SENDER_NAME, alertRecipients, mailConfigured, senderAddress } from "@/lib/mail";
import { rotateCalendarLink, runAlertsNow, saveSettings, sendTestAlert } from "@/app/actions";
import { btnPrimary, btnSecondary, cardClass, fieldClass, labelClass } from "@/components/styles";

export const dynamic = "force-dynamic";

function inboundStatus(): string {
  if (!inboundConfigured()) return "עדיין כבוי — הדביקו את המפתח מדף ה־Webhook ב־Resend.";
  const last = lastInbound();
  if (!last) return "פעיל. עדיין לא הגיע מייל.";
  const outcome = last.applied
    ? "נוסף/עודכן"
    : last.created
      ? "טיוטה"
      : last.already
        ? "כבר היה"
        : last.error
          ? ""
          : "לא רלוונטי";
  return [
    `מייל אחרון ${new Date(last.scannedAt).toLocaleString("he-IL")}`,
    last.subject,
    outcome,
    last.error,
  ]
    .filter(Boolean)
    .join(" · ");
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; test?: string; ran?: string; calendar?: string }>;
}) {
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
  const geminiSaved = Boolean(geminiKey());
  const openaiSaved = Boolean(openaiKey());
  const claudeSaved = Boolean(anthropicKey());
  const aiOn = aiConfigured();
  const provider = getSetting("ai_provider") || "auto";
  const inboundAddr = inboundAddress();
  const inboundSecretSaved = Boolean(inboundSecret());

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold tracking-tight">הגדרות</h1>
      <p className="mt-1.5 text-sm leading-6 text-muted">
        הוספה ידנית, העברת מיילים לכתובת של הכלי, והתראות למייל שלכם.
      </p>

      {query.saved ? (
        <p className="mt-4 rounded-xl bg-accent-soft px-3 py-2.5 text-sm text-accent">נשמר.</p>
      ) : null}
      {query.test ? (
        <p className="mt-4 rounded-xl bg-accent-soft px-3 py-2.5 text-sm text-accent">
          נשלחה התראת בדיקה (או נכתבה ל־data/outbox).
        </p>
      ) : null}
      {query.ran ? (
        <p className="mt-4 rounded-xl bg-accent-soft px-3 py-2.5 text-sm text-accent">בדיקת ההתראות הסתיימה.</p>
      ) : null}

      <form action={saveSettings} className={`${cardClass} mt-6 space-y-4 p-5`}>
        <h2 className="text-sm font-semibold">התראות</h2>
        <label className={labelClass}>
          שם השולח במיילים
          <input
            className={fieldClass}
            name="sender_name"
            defaultValue={getSetting("sender_name") ?? ""}
            placeholder={DEFAULT_SENDER_NAME}
            maxLength={60}
          />
          <span className="mt-1.5 block text-xs font-normal text-muted">
            כך ייראה השולח בתיבת הדואר. הכתובת עצמה ({senderAddress()}) נשארת.
          </span>
        </label>
        <label className={labelClass}>
          כתובות מייל להתראות
          <textarea
            className={`${fieldClass} min-h-28`}
            name="alert_emails"
            defaultValue={emails}
            placeholder="you@example.com"
            dir="ltr"
          />
          <span className="mt-1.5 block text-xs font-normal text-muted">
            לכאן מגיעות תזכורות חידוש. אפשר כמה כתובות, אחת בכל שורה.
          </span>
        </label>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" name="auto_check" defaultChecked={autoCheck} className="size-4 accent-accent" />
          לבדוק התראות גם בפתיחת הלוח (בנוסף לשליחה היומית אחרי 08:00)
        </label>

        <h2 className="pt-2 text-sm font-semibold">העברת מיילים לכלי</h2>
        {inboundAddr ? (
          <label className={labelClass}>
            העבירו מיילים לכאן
            <input className={fieldClass} readOnly dir="ltr" value={inboundAddr} />
            <span className="mt-1.5 block text-xs font-normal text-muted">
              פוליסה, חשבונית שנתית, הודעת חידוש — כל מייל שמגיע לכתובת הזו נכנס ללוח תוך שניות. כשיש שם ותאריך, הפריט נוסף או מתעדכן לבד; אחרת הוא מחכה ב״טיוטות״.
            </span>
          </label>
        ) : (
          <p className="text-sm text-muted">כתובת ההעברה לא מוגדרת (INBOUND_ADDRESS). ראו README.</p>
        )}
        <label className={labelClass}>
          מפתח חתימה של Resend (Webhook signing secret)
          <input
            className={fieldClass}
            name="inbound_webhook_secret"
            type="password"
            dir="ltr"
            placeholder={inboundSecretSaved ? "שמור — השאירו ריק כדי לא לשנות" : "whsec_..."}
            autoComplete="off"
          />
          <span className="mt-1.5 block text-xs font-normal text-muted">{inboundStatus()}</span>
        </label>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" name="auto_apply" defaultChecked={autoApply} className="size-4 accent-accent" />
          להוסיף/לעדכן לבד כשיש שם ותאריך (בלי טיוטה)
        </label>

        <h2 className="pt-2 text-sm font-semibold">AI לקריאת המיילים</h2>
        <p className="text-sm leading-6 text-muted">
          Claude הכי מדויק למילוי תאריך ומחיר מעברית. OpenAI גם טוב וזול. בלי מפתח — רק חיפוש מילים.
        </p>
        <label className={labelClass}>
          מודל
          <select className={fieldClass} name="ai_provider" defaultValue={provider}>
            <option value="auto">אוטומטי (Claude → OpenAI → Gemini)</option>
            <option value="claude">Claude</option>
            <option value="openai">OpenAI</option>
            <option value="gemini">Gemini</option>
          </select>
        </label>
        <label className={labelClass}>
          מפתח Claude (Anthropic)
          <input
            className={fieldClass}
            name="anthropic_api_key"
            type="password"
            dir="ltr"
            placeholder={claudeSaved ? "שמור — השאירו ריק כדי לא לשנות" : "sk-ant-..."}
            autoComplete="off"
          />
          <span className="mt-1.5 block text-xs font-normal text-muted">
            <a className="text-accent underline" href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">
              console.anthropic.com
            </a>
          </span>
        </label>
        <label className={labelClass}>
          מפתח OpenAI
          <input
            className={fieldClass}
            name="openai_api_key"
            type="password"
            dir="ltr"
            placeholder={openaiSaved ? "שמור — השאירו ריק כדי לא לשנות" : "sk-..."}
            autoComplete="off"
          />
          <span className="mt-1.5 block text-xs font-normal text-muted">
            <a className="text-accent underline" href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">
              platform.openai.com/api-keys
            </a>
          </span>
        </label>
        <label className={labelClass}>
          מפתח Gemini (רשות)
          <input
            className={fieldClass}
            name="gemini_api_key"
            type="password"
            dir="ltr"
            placeholder={geminiSaved ? "שמור — השאירו ריק כדי לא לשנות" : "AIza..."}
            autoComplete="off"
          />
        </label>
        <p className="text-xs text-muted">{aiOn ? `פעיל: ${aiProviderLabel()}.` : "עדיין כבוי — הדביקו מפתח."}</p>

        <button type="submit" className={btnPrimary}>
          שמירת הגדרות
        </button>
      </form>

      <section id="calendar" className={`${cardClass} mt-4 p-5`}>
        <h2 className="text-sm font-semibold">חיבור ליומן</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          כל החידושים כאירועי יום שלם ביומן שלכם, כולל חוזרים (חודשי/שנתי), עם תזכורת שבוע לפני. היומן מתעדכן לבד;
          Google מרענן יומנים מקושרים פעם בכמה שעות עד יממה.
        </p>
        {query.calendar === "rotated" ? (
          <p className="mt-3 rounded-xl bg-accent-soft px-3 py-2.5 text-sm text-accent">
            הקישור הוחלף. הסירו את היומן הישן ב־Google והוסיפו את החדש.
          </p>
        ) : null}
        <label className={`${labelClass} mt-4`}>
          קישור היומן (סודי — מי שיש לו אותו רואה את הרשימה)
          <input className={fieldClass} readOnly dir="ltr" value={feedUrl} />
        </label>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href={googleAddUrl} target="_blank" rel="noreferrer" className={btnPrimary}>
            הוספה ל־Google Calendar
          </a>
          <a href={feedUrl.replace(/^https?:/, "webcal:")} className={btnSecondary}>
            הוספה ל־iPhone / Outlook
          </a>
          <form action={rotateCalendarLink}>
            <button type="submit" className={btnSecondary}>
              החלפת הקישור
            </button>
          </form>
        </div>
        <p className="mt-3 text-xs leading-5 text-muted">
          אם הכפתור של Google לא עובד: ב־Google Calendar במחשב, ליד ״יומנים אחרים״ לחצו + ← ״מכתובת URL״ ← הדביקו את
          הקישור למעלה.
        </p>
      </section>

      <section className={`${cardClass} mt-4 p-5`}>
        <h2 className="text-sm font-semibold">דואר יוצא</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          {viaEmail
            ? `נשלח דרך ${process.env.RESEND_API_KEY ? "Resend" : "SMTP"} אל ${recipients.join(", ")}.`
            : "עדיין אין ספק דואר. התראות נכתבות ל־data/outbox. הוסיפו RESEND_API_KEY או SMTP_* ב־.env.local."}
        </p>
        {last ? (
          <p className="mt-3 text-sm text-muted">
            בדיקה אחרונה {new Date(last.checkedAt).toLocaleString("he-IL")}
            {last.sent.length > 0
              ? ` · נשלח: ${last.sent.map((row) => row.name).join(", ")}`
              : " · אין מה לשלוח"}
            {last.error ? ` · ${last.error}` : ""}
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted">עדיין לא רצה בדיקת התראות.</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <form action={sendTestAlert}>
            <button type="submit" className={btnSecondary}>
              שליחת התראת בדיקה
            </button>
          </form>
          <form action={runAlertsNow}>
            <button type="submit" className={btnSecondary}>
              הרצת בדיקת התראות
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
