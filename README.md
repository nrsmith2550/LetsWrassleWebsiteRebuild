# Let's Wrassle Apparel — Store, Customer Portal & Admin Hub

React (Vite + TS + Tailwind) frontend, Express (TS) API, SQLite via Prisma. One process serves both in production.

## Quick start (local)

```bash
cp .env.example .env        # then edit (at minimum set JWT_SECRET)
npm install
npm run db:push             # creates data/store.db
npm run db:seed             # categories, sample products, sample videos, admin user
npm run dev                 # API :4000, site http://localhost:5173
```

The seed prints the admin login (email from `ADMIN_EMAIL`; if `ADMIN_PASSWORD` is empty a random password is printed once). Admin Hub: `/admin`.

## Production (one command)

```bash
npm install && npm run build
npm start                   # applies schema (prisma db push) then serves API + site on $PORT
```

Docker:

```bash
docker build -t letswrassle .
docker run -p 4000:4000 -v lw-data:/app/data --env-file .env letswrassle
```

Mount `/app/data` — it holds the SQLite DB and uploaded images. Seed once with
`docker run --rm -v lw-data:/app/data --env-file .env letswrassle npx tsx prisma/seed.ts`.

## Going live checklist

1. `JWT_SECRET` (random), `COOKIE_SECURE=true` behind HTTPS, `SITE_URL=https://letswrassleapparel.com`.
2. Payments — set keys for Square and/or Stripe (sandbox first). `PRIMARY_GATEWAY` picks the default tab; a gateway without keys is hidden automatically.
   Stripe webhook (optional safety net): `POST /api/checkout/stripe/webhook`.
3. Email — SMTP settings + `OWNER_EMAIL` (new-order alerts). With `SMTP_HOST` empty, emails print to the console.
4. Shippo — `SHIPPO_API_KEY` and the `SHIP_FROM_*` address (needed for rates/labels; enable USPS/UPS carriers in Shippo).
5. Shipping/tax at checkout are a flat rate (`SHIPPING_FLAT_CENTS`) and `TAX_RATE`; labels are bought separately in the admin at real Shippo cost.
6. Images — default is local disk (`/uploads`). For hosts with ephemeral disks use `STORAGE_DRIVER=s3` (R2/B2/S3).

## Layout

- `src/` Express API — `services/{storage,email,shipping,payments,orders}.ts`, `routes/*`
- `web/` React app — `pages/`, `pages/admin/`, `components/`, `lib/`
- `prisma/schema.prisma`, `prisma/seed.ts`

## Notes

- Enum-like columns are strings (portable to Postgres). To switch DB: change `provider` + `DATABASE_URL` in `schema.prisma`/`.env`.
- Passwords use `bcryptjs` (pure-JS bcrypt: same hashes, no native build step on cheap hosts).
- Orders are created `PENDING` before payment; stock is deducted and emails are sent only once payment is verified server-side (idempotent).
- Prefer tracked migrations? Run `npx prisma migrate dev --name init` once locally and switch `start` to `prisma migrate deploy`.
