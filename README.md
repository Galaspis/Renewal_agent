# Renewals

A small family tool that keeps track of subscriptions and insurance policies so nothing renews by surprise.

Live at https://renewals.gallab.top (private instance, behind a shared Google sign-in).

Forward a renewal email or a PDF policy to the tool's inbound address. The text is parsed, an LLM pulls out the provider, the amount, the renewal date and the cancellation window, and a draft appears in the inbox for a one-click confirm. From then on the tool emails reminders before each deadline, shows everything on a calendar, and keeps the original documents attached to the item.

## Features

- **Inbox**: forwarded emails and PDFs land here as drafts, with the extracted fields pre-filled.
- **Items and insurance**: one list for subscriptions, one for policies, each with documents, notes and history.
- **Reminders**: a ladder of alert emails before renewal and cancellation dates, with one-tap buttons that work without logging in.
- **Calendar**: a month view plus an iCal feed you can subscribe to from a phone.
- **Activity log**: what the tool did and when (emails received, reminders sent, links used).
- **Switchable AI**: Claude, OpenAI or Gemini for the extraction step, chosen in Settings.
- **Hebrew, right-to-left UI.**

## Stack

Next.js 16 (App Router), TypeScript, Tailwind CSS 4, `zod`. SQLite through Node's built-in `node:sqlite` (no native module), kept in a `data/` folder together with uploads. `mailparser` for inbound mail, `unpdf` for PDF text, `nodemailer` or Resend for outgoing mail. `jose` signs the session cookie; the one-tap links in emails are random single-use tokens stored in an `action_links` table (`src/lib/action-links.ts`). Runs as one Docker container.

Requires **Node 22.5 or newer** (for `node:sqlite`); the Dockerfile uses Node 24.

## Run locally

```bash
npm install
cp .env.example .env.local   # set FAMILY_PASSWORD and SESSION_SECRET at minimum
npm run dev
```

Open the address the command prints and log in with the password you set. Everything else in `.env.example` is optional: email sending, inbound mail, AI keys, a cron secret.

## Auth model

Two modes, picked by environment:

- **Local**: a shared `FAMILY_PASSWORD` and a signed session cookie (`jose`, `src/proxy.ts`).
- **Hosted**: `HUB_AUTH=1` makes the app trust the `Remote-Email` header that the reverse proxy sets after a Google sign-in (`src/lib/hub-auth.ts`). The proxy strips any `Remote-*` header a client sends, so the app never has to check the password itself.

## Inbound mail

Point a Resend Receiving webhook at `/api/inbound`. Set `INBOUND_ADDRESS` (the address people forward to) and `RESEND_WEBHOOK_SECRET` (the webhook's signing secret; it can also be pasted in Settings). Each received email is parsed, attachments are stored, the extractor fills a draft, and a confirmation email with action buttons goes back.

## Reminders

A timer inside the app (`src/instrumentation.ts`, `src/lib/background.ts`) checks every 15 minutes and sends the day's reminders once, after 08:00 Israel time. `/api/cron/alerts` with `CRON_SECRET` is an optional external trigger for schedulers. The ladder, the overdue nag and the buttons are described in [docs/reminders.md](docs/reminders.md).

## Deploy

A push to `master` runs `.github/workflows/deploy.yml`: it joins the private network, syncs the source to the server, runs `docker compose build`, installs the Caddy site from `deploy/` and finishes with a smoke test. The hosted instance is a small VPS with Docker and Caddy. Data lives outside the container, so rebuilding never touches it.

## Project layout

```
src/app/          pages, server actions, API routes (calendar, cron, documents, inbound), /a/<token> action pages
src/lib/          db, auth, mail, alerts ladder, action links, AI extraction, parsing
src/proxy.ts      login gate (session cookie or hub header)
deploy/           Caddy site for the hosted instance
docs/reminders.md how and when reminders are sent
Dockerfile        production image
```
