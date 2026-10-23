# כָּרבוֹל (Karbol)

A family board for everything that renews: insurance policies, licences, subscriptions, domains, warranties. Forward a renewal email to the tool's address and it becomes an item, with a receipt email you can act on. Reminders carry one-tap buttons and keep coming until you answer. The rooster is the brand: it calls for attention.

Live at **https://renewals.gallab.top** behind the gallab Google login. Deployed by pushing to `master` (GitHub Action rebuilds the container on the gallab server).

## Where things are

| What | Where |
|---|---|
| Brand kit (logos, icons, colours, fonts, guidelines) | `karbol-brand-kit/` (source of truth); the app uses copies in `public/brand/` and `src/app/fonts/` |
| How forwarded email gets in, the receipt and its buttons | `docs/inbound-mail.md` |
| Reminders: ladder, buttons, acknowledgement, Sunday timing | `docs/reminders.md` |
| Putting it on the server from scratch | `docs/deploy-renewals.md` |
| Data on the server | `/srv/renewals/data` (SQLite `renewal.db`, `uploads/`, `inbox/`, `outbox/`), owned by uid 1000 |

## Run it on this PC

```bash
npm install
npm run dev
```

Then open the address `next dev` prints and log in with the family password from `.env.local` (locally there is no Google login; on the server the hub's login replaces it).

## Design

Palette and type come from the brand guide (`karbol-brand-kit/guidelines/brand-guide-he.md`): navy `#101D55` for text, blue `#2451D1` for navigation and the summary band, orange `#FF7048` for the one important action (dark text on orange, white on blue), alert red `#D63232`, background `#F2F6FC`. Heebo, weights 400–800. Tokens live in `src/app/globals.css`; shared button and card classes in `src/components/styles.ts`; the 30 Karbol icons as React components in `src/components/Icons.tsx`.
