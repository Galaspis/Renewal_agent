# Karbol UI plan (2026-10-25)

An audit of every screen as it is today, what is wrong with it, and what it becomes. Colours, fonts and the logo stay as in the brand kit. The rules come from current guidance (Apple HIG layout principles, NN/g hierarchy, the "calm chrome" pattern used by Linear, Vercel and Stripe): hierarchy from size and spacing, colour only for status, one primary action per screen, whitespace instead of boxes, nothing shown twice.

## Rules for every screen

| Rule | In practice |
|---|---|
| One loud thing per screen | One orange button at most. Everything else is a hairline button or a text link. |
| Colour means status | Red = needs you. Blue = navigation and links. Orange = the one action. No coloured boxes for information. |
| No boxes inside boxes | A card holds one subject. Sections are separated by space (40px), not by borders or tiles. |
| Nothing twice | If a fact is in the title, it is not repeated in a badge, a banner or a tile. |
| Type scale | Page title 28/700 · section 15/600 with a muted count · body 15 · meta 13.5 muted · numbers tabular. Weights 400–700 only. |
| Icons only where they say something | The category icon on a row. No icons next to headings, no decorative icons. |
| Plain words | No "Webhook", "SMTP", "API" where a plain sentence works. One line of help text, never a paragraph. |

Navigation shrinks from 7 items to 5: **דף הבית · חידושים · יומן · טיוטות · הגדרות**. "ביטוחים" becomes a filter inside חידושים (with its yearly total). "יומן פעילות" moves under הגדרות and stays linked from the home page's status line. The phone bar gets the same 5.

## 1. דף הבית

**Today:** blue panel with a title and a count line; red problems box; "דורש טיפול (1)" group with orange buttons; "השבוע / החודש / בהמשך" groups; a quiet status line; sidebar with mini calendar, drafts card, recent files. Your question: why the count line if the group is right below?

**Problem:** the count line duplicates the groups. The panel's job is to set the mood and say the one thing that matters, not to summarise the list.

**Becomes:**
- Blue panel: "החידושים שלך" and **one sentence** that is the decision for today: "2 חידושים מחכים לתשובה שלך" or "הכל מסודר. הקרוב ב־1.11". No counts, no button (the add button is in the header; on the phone it is in the bottom bar).
- Groups: **מחכים לך** (flagged + overdue; each row has the orange "חידשתי"), then **השבוע**, **החודש**, **בהמשך** as plain rows with no buttons. Row = icon, name, "date · status · provider", amount small at the end.
- Red problems box only when something is actually broken.
- Sidebar: this month's calendar, latest files. Drafts card only when drafts exist. Status line at the bottom links to יומן פעילות.

## 2. חידושים (the list)

**Today:** title, count, category chips, rows. Mostly fine.

**Becomes:** same, with two changes. The chips get the insurance yearly total when ביטוח is selected ("8 פוליסות · 18,067 ₪ לשנה"), so the separate insurance page is not needed. Paused and ended items go under one muted heading at the end.

## 3. ביטוחים page

**Today:** four stat tiles (yearly total, count, next to end, needs attention), a red box repeating the pension note, groups by type with progress bars and "67 ימים" badges. Your question: what is this?

**Problem:** it is a second dashboard with its own visual language (tiles, bars, badges) for 8 items. The note in red is just the item's notes field.

**Becomes:** the page goes away. חידושים filtered to ביטוח shows the same items as rows with the yearly total in the chip line. The route `/insurance` redirects there so old links work.

## 4. Item page

**Today:** breadcrumb; icon + name + meta; date/status line; three buttons (חידשתי · עריכה · ביטלתי); a red banner "מסומן דורש טיפול"; a facts card; a reminders card with two buttons; a documents card with a file input; השהיה · מחיקה. Your screenshot: a mess.

**Problem:** six boxes and nine actions for one item. The banner repeats the status. The reminders and documents boxes shout as loud as the item itself.

**Becomes:**
- Top: name (28), one meta line, one date/status line, **one** orange button ("חידשתי"), "עריכה" as a text link. "ביטלתי" only for overdue items, as a text link.
- The red banner goes. If the item is flagged, the status line says "דורש טיפול" and a small text link "הסר סימון" clears it in one tap.
- Facts: one quiet row (מחיר · תדירות · חידוש אוטומטי · התראה), no card around it.
- Then two plain sections with small headings, separated by space, not boxes: **תזכורות** (next one, sent ones, two text links: הזכר לי בעוד שבוע · קיבלתי) and **מסמכים** (list, one "הוספת קובץ" link that opens the file picker).
- Bottom: השהיה · מחיקה as muted text links.

## 5. הוספת חידוש / עריכה (the form)

**Today:** three cards ("מה זה", "מתי וכמה", "פרטים") with 14 fields, long help paragraphs, two checkboxes with explanations.

**Becomes:** one column, no cards. The essentials first: שם, קטגוריה, תאריך, תדירות, מחיר. Then a single "עוד אפשרויות" disclosure holding ספק, על שם, סוג ביטוח, מספר פוליסה, תחילת תוקף, התראה (ימים לפני), חידוש אוטומטי, דורש טיפול, הערות, קובץ. Help text one line. One orange "שמירה".

## 6. טיוטות

**Today:** card per draft with a yellow reason box, meta line, snippet, three buttons.

**Becomes:** card per draft: subject, one muted line that says why it waits, the extracted facts on one line, then "הוסף כפי שהוא" (orange), "השלם פרטים" (hairline), "לא רלוונטי" (text). No yellow box.

## 7. יומן

**Today:** month grid plus a list of the same month under it. Fine.

**Becomes:** grid stays; the list under it becomes a short "בחודש הזה" list in the same row style as everywhere else. "חיבור ליומן Google" moves to הגדרות only.

## 8. הגדרות

**Today:** one long form mixing alert addresses, sender name, inbound address, webhook secret, auto-apply, AI model and three API keys; then a calendar card; then an outgoing-mail card with two test buttons. Your verdict: a mess.

**Becomes:** five short sections, each its own card with its own save, plain titles and one line of help:
1. **תזכורות**: אל מי לשלוח (addresses), שם השולח, "לבדוק גם בפתיחת הלוח".
2. **מיילים שמעבירים לכלי**: the address to forward to (copy button), "להוסיף לבד כשיש שם ותאריך", and the Resend key as "מפתח החיבור מ־Resend" with its status line.
3. **קריאת המיילים**: which model, and the keys inside a collapsed "מפתחות" disclosure.
4. **יומן**: the feed link with "הוספה ל־Google" and "הוספה ל־iPhone", "החלפת הקישור" as text.
5. **מה הכלי עשה**: last email, last reminder run, "שליחת מייל בדיקה", "בדיקת תזכורות עכשיו", link to יומן פעילות.

## 9. יומן פעילות

Stays as it is (rows by day). Reachable from הגדרות and the home status line. Out of the main navigation.

## 10. כניסה and the email button pages

Stay as they are: logo, one field, one orange button; one sentence, one button.

## Phone

Bottom bar: הבית · חידושים · יומן · טיוטות · הגדרות. Adding goes through the orange button in the blue panel on the home page and the "הוספה" link on חידושים. Rows never grow wider than the screen; when a row has the orange button it drops to its own line under the text.

## Order of work

1. Navigation and the item row (shared by every list).
2. Home and חידושים (with the insurance filter and the redirect).
3. Item page.
4. Form.
5. הגדרות.
6. טיוטות, יומן.
7. Phone pass, screenshots, push.
