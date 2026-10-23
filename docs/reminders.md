# Reminders: how and when the tool emails you

Last updated 2026-10-20. Code: `src/lib/alerts.ts` (ladder, sending), `src/lib/action-links.ts` (buttons), `src/lib/categories.ts` (milestones per category).

## When

- Once a day, after **08:00 Israel time**. A timer inside the app checks every 15 minutes; the first check after 08:00 that has not run yet today does the work. Opening the dashboard also triggers a check (Settings → "לבדוק התראות גם בפתיחת הלוח").
- The "בדיקה עכשיו" button in Settings ignores the clock and runs immediately.

## Which reminders

Each item has a **notice window** (ימים לפני, set per item; defaults per category: insurance 60, license 90, domain 30, subscription 14, membership 21, warranty 30). Inside that window the item climbs a **ladder**:

| Category / cadence | Ladder (days before) |
|---|---|
| Insurance, license | 90 · 60 · 30 · 14 · 7 · 1 · 0 |
| Monthly anything | 14 · 7 · 1 · 0 |
| Everything else | 60 · 30 · 14 · 7 · 1 · 0 |

Only rungs inside the notice window are used. Example: a domain with a 30-day window gets emails at 30, 14, 7, 1 and 0 days before. **Auto-renewing items get the same ladder** (until 2026-10-20 they got a single email, which was easy to miss).

**Overdue** items that do not auto-renew get a nag **every 7 days** until you renew or end them. Auto-renewing items never go overdue: their date moves forward by itself.

## The buttons

Every reminder has buttons that work from the phone, without login, once each, for 90 days:

| Button | What it does |
|---|---|
| **חידשתי** (non auto-renew only) | Moves the renewal date one cycle forward. A fresh cycle starts: reminders come again before the new date. |
| **קיבלתי, בלי תזכורות נוספות** | Stops the ladder for **this** renewal date. Reminders return for the next cycle. |
| **הזכר לי בעוד שבוע** | No reminders for 7 days, then the ladder continues. |
| **ביטלתי** | Marks the item ended. No more reminders. |
| **פתח בלוח** | Opens the item in the app (asks for the Google login). |

The rule to remember: **reminders keep coming until you press something**. Silence from the tool means you already answered, never that it forgot.

## In the app

- **Dashboard**: a status strip at the top shows the last email received and its outcome, the last reminder run, and a red box when something failed, when no check has run for 36 hours, or when mail is only being written to the outbox folder. Overdue items show "חידשתי" / "ביטלתי, לסיים" right under the card.
- **Item page**: a "תזכורות למחזור הזה" box lists the reminders already sent for the current date, the next one expected, "מושתק עד …" or "אישרתם קיבלתי …" when quiet, and the two buttons (snooze a week, no more reminders this cycle).
- **יומן פעילות** (`/activity`): everything the tool did, newest first, grouped by day, with a link to the item or draft.
- **טיוטות**: each draft says in words why it is a draft, and "הוסף כפי שהוא" adds it in one tap when it has a name and a date.

## Where this is stored

- `items.snoozed_until`: date until which the item is quiet.
- `items.ack_renewal_date`: the renewal date you acknowledged; equal to `renewal_date` means "answered for this cycle".
- `alerts` table: one row per (item, renewal date, rung) that was sent, so a rung is never sent twice.
- `activity` table: every reminder sent and every button pressed.
- Settings keys `last_alert_check_day` (the Israeli date of the last run) and `last_alert_run` (what it sent), shown at the bottom of Settings.
