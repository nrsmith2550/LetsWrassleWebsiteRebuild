# Let's Wrassle Apparel

Static storefront (React + Vite) on **Cloudflare Pages**, with a few small serverless functions for payments.
Everything is edited and deployed through **GitHub**. There is no database and no server to maintain.

| Piece | Where it lives |
|---|---|
| Products, categories, videos, store settings | `content/*.json` (edited in the admin at `/admin`, or by hand) |
| Storefront | `web/` |
| Payments, order emails, admin login | `functions/api/*` (Cloudflare Pages Functions) |
| Pricing/validation shared by browser and server | `shared/` |
| Orders and customer info | **Square and Stripe dashboards** (never stored in this repo) |

## How changes go live

1. **Edit**: use `/admin` (Decap CMS, sign in with GitHub) or edit `content/` in GitHub.
   Each CMS save opens a **pull request**.
2. **Test**: GitHub Actions checks the content and builds a **preview site** for the pull request and comments the link.
   Previews use your *sandbox* payment keys, so test orders are safe.
3. **Publish**: merge the pull request. The workflow deploys `main` to the **live site**.

Prices are compiled from `content/` into `catalog.json`, and the payment functions charge from that same file,
so a customer can never be charged a different price than the one shown.

## Payments

- **Square**: normal credit/debit cards, entered in Square's secure card field on the checkout page.
- **Stripe**: Apple Pay and Google Pay buttons (Stripe Express Checkout), shown only on devices that support them.
- Customers never leave the site. Order details go to the Square/Stripe dashboard, and an email goes to you and the customer.

## One-time setup

1. **Cloudflare**: create a free account. Create the Pages project once:
   `npx wrangler pages project create letswrassle --production-branch=main`
2. **GitHub repo secrets** (Settings > Secrets and variables > Actions): `CLOUDFLARE_API_TOKEN`
   (template "Edit Cloudflare Workers", plus Pages edit) and `CLOUDFLARE_ACCOUNT_ID`.
3. **Cloudflare variables** (Pages project > Settings > Variables and Secrets). Use **sandbox/test** values for
   *Preview* and **live** values for *Production*. Names are listed in `.dev.vars.example`.
4. **Admin login**: GitHub > Settings > Developer settings > OAuth Apps > New. Homepage = your site,
   callback = `https://YOUR-DOMAIN/api/callback`. Put the client id/secret in the Cloudflare variables.
   Only people with **write access to this repo** can save changes.
5. **Stripe webhook**: add endpoint `https://YOUR-DOMAIN/api/stripe-webhook` for event `payment_intent.succeeded`, copy the signing secret to `STRIPE_WEBHOOK_SECRET`.
6. **Apple Pay**: in Stripe > Settings > Payment methods > Apple Pay, add your domain and download the verification file
   to `web/public/.well-known/apple-developer-merchantid-domain-association`. (Apple Pay only works on registered domains, so it will not show on preview URLs. Google Pay works everywhere.)
7. **Email**: create a free [Resend](https://resend.com) account, verify your domain, set `RESEND_API_KEY`, `EMAIL_FROM`, `OWNER_EMAIL`.
8. **Custom domain**: Pages project > Custom domains > `letswrassleapparel.com`.
9. In GitHub, protect `main` (require the "check" job to pass) so only reviewed, tested changes go live.

## Run it on your computer

```bash
npm install
cp .dev.vars.example .dev.vars   # add sandbox keys (optional for browsing)
npm run dev                      # open http://localhost:8788
```

`npm run dev:ui` runs just the storefront (no payments). `npm run typecheck` checks the code.

## Limits to know about

- **No automatic stock counts.** With no database, stock is an "In stock" switch per size/color in the admin. Turn it off when something sells out.
- **No customer accounts or order history page.** Customers get an email receipt; you manage orders in Square/Stripe.
- **Shipping labels**: buy them in the Shippo dashboard (or Square/Stripe shipping tools) using the address in the order email.
- Shipping and tax are a flat rate and a flat percentage, set in the admin under "Store settings".
