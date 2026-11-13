# Handoff: Let's Wrassle store (for UI fixes)

Read this instead of the chat history. It covers what exists, how to run it, where the UI code lives, and what is safe to change.

## What this is
E-commerce site for **Let's Wrassle Apparel** (wrestling apparel, Pennsylvania). It is replacing an IONOS/Ecwid store. The owner is not a developer: explain changes plainly and never ask them to touch code.

- **Stack:** React 18 + Vite + Tailwind 3 (static site), Cloudflare Pages Functions (payments, orders, admin API), Cloudflare D1 (orders), GitHub Actions deploy. No traditional server.
- **Repo:** `~/Documents/letswrassle-store` (GitHub `nrsmith2550/LetsWrassleWebsiteRebuild`). Work is on branch **`feature/static-site`**, pull request #1 open against `main`. `main` still holds an old Express/Prisma version. **Do not merge to `main`**: merging deploys to the live production site, which is not ready (see "Not done").
- **Preview site (test keys, safe):** https://feature-static-site.letswrassle.pages.dev. Pushing to the branch redeploys it in about 1-2 minutes via `.github/workflows/deploy.yml`. The branch alias can serve a stale cached page for a few minutes after a deploy.

## Layout
```
web/src/                 Storefront + admin hub (React)
  App.tsx                Routes (/admin/* is the hub, everything else is the store)
  index.css              Tailwind base + shared classes (.btn-primary, .input, .card, ...)
  components/            Layout (header/footer/announcement bar), CartDrawer, ProductCard, ProductImage, VideoEmbed
  pages/                 Home, Shop, ProductPage, Checkout, OrderConfirmation, Interviews
  admin/                 AdminApp (sign-in gate), AdminShell (IONOS-style layout + shared styles), pages/{Dashboard,Orders,OrderDetail,Customers,Catalog}
  lib/                   cart (localStorage), catalog loader, api helpers
web/tailwind.config.js   Brand colors (ink, orange, bone) and the admin palette (ionos.*)
web/public/cms/          Decap CMS product editor (opens in a new tab from the hub)
content/                 Products, categories, videos, settings as JSON (edited via the CMS or by hand)
scripts/build-catalog.mjs  Compiles content/ into web/public/catalog.json (run by npm run build)
shared/                  Pricing, validation, email, D1 helpers, Shippo, admin auth (used by browser and functions)
functions/api/           Pages Functions: square-pay, stripe-intent, stripe-webhook, config, auth, callback, admin/*
db/schema.sql            Orders table
```
Product prices come from `catalog.json`, and the server re-prices every cart from it. Never trust client totals.

## Run it locally
Node 20+ is required (it may not be installed on this Mac; the owner has no Node of their own).
```
npm install
npm run typecheck        # must stay clean
npm run build            # builds dist/ and catalog.json
```
- **UI only (fast):** `npm run dev:ui`, then open http://localhost:5173. Checkout and admin need the API, so they won't work here.
- **Full local site with orders DB and admin:** build first, then
  `npx wrangler d1 execute letswrassle-preview --local --file=db/schema.sql`, then
  `npx wrangler pages dev dist --port 8788 --binding DEV_ADMIN_BYPASS=1 --binding ADMIN_GITHUB_USERS=nobody --binding SESSION_SECRET=localtest`,
  then open http://localhost:8788/admin. The bypass only works on `localhost`, never in production.
- Secrets live in a git-ignored `.dev.vars` (test/sandbox keys only). **Never commit it, never print its values, never paste keys into code.**
- To see the label form locally, also pass `--binding SHIPPO_API_KEY=placeholder --binding SHIP_FROM_STREET1="1 Main St" --binding SHIP_FROM_CITY=Johnstown --binding SHIP_FROM_ZIP=15901` (no real Shippo calls are made until you click buy).

## Design direction
- **Storefront:** black-and-white, built from the logo (branch `ui/mirror-live-site`). Black is the base; white sections are the break (About, Our Story, and the product, checkout and help pages, chosen by route in `Layout.tsx`). Headings are heavy block capitals (`font-block`, League Spartan) with a handwritten accent word via `<Script>` in `components/Title.tsx`, echoing "Let's WRASSLE". Square-cornered buttons: `btn-primary` on white, `btn-light` / `btn-outline-light` on black. Product tiles are borderless, 3 per row, with a second photo on hover and color dots. Delivery, returns and payment text lives on `/help` (`pages/Help.tsx`), with a one-line strip on the home page. Red `flag` is only for the NEW badge. Storefront-only styles are scoped under `.store`. Logo, wordmark and founder photo are in `web/public/uploads/site/`.
- **Admin hub:** must feel like the **IONOS store portal** the owner used before: dark-navy top bar, bright-blue left menu with a lighter active item, light-gray page, white rounded cards, blue primary buttons, green "Paid", status text colors (amber awaiting, blue processing, green shipped). Palette is `ionos.*` in the Tailwind config. Shared admin classes/components (`Card`, `PageTitle`, `btnPrimary`, `btnOutline`, `field`, `label`) are exported from `web/src/admin/AdminShell.tsx`. Reuse them.
- Every page must work on a phone (the owner will use the hub on mobile). Test at ~390px and desktop.

## Known UI issues / ideas (your starting list)
1. **Product editor is not IONOS-styled.** The hub's Catalog page lists products, but "Edit product" opens the Decap CMS (`/cms/`) in a new tab, which looks different. A native editor inside the hub would need a way to save to Git (the CMS currently commits via the editor's own GitHub login). Discuss before building; do not remove the CMS.
2. **Gray tee (and YOUTH White tee)** have 30 size/color variants and 19 photos. The photo does not change when a color is picked, and 19 thumbnails is a lot. Consider mapping photos to colors and a scrollable thumbnail strip.
3. **YOUTH White tee** has adult sizes + a Color option in IONOS (probably a data mistake). Ask the owner which sizes it should have before changing `content/products/youth-lets-wrassle-t-shirt-white.json`.
4. Admin pages need a mobile pass (sidebar, order cards, order detail columns, label form).
5. Order detail "Print order" uses the browser print of the page. A proper packing-slip layout would be better.
6. Empty states, loading skeletons, and error messages across store and admin are plain.
7. Cart badge may show items left in localStorage from testing. This is fine, just be aware.
8. Shop: no filtering beyond category tabs and sort. Product page: size chart text is plain lines separated by pipes.

## Do not change without asking
- **Money/security code:** `functions/api/*`, `shared/pricing.ts`, `shared/adminAuth.ts`, `shared/validate.ts`, anything that touches payments, sessions, or the admin allowlist.
- **Payment flow behavior:** customers must never be redirected off-site; Square handles cards, Stripe handles Apple Pay/Google Pay only.
- **Secrets:** don't read, log, or echo API keys. The owner enters secrets themselves in a terminal prompt or the Cloudflare dashboard.
- Don't push to `main`, don't merge PR #1, don't touch DNS/domain or production settings.

## Deploy / verify
- Commit to `feature/static-site` and push. Actions runs: content check, `npm run typecheck`, build, then deploys a preview. Verify on the preview address (hard-refresh; the alias can be cached briefly).
- Add this line to commit messages: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- The admin sign-in is GitHub-only and needs the owner's own click. You can't log in for them. Use the local bypass above to look at admin pages.
- Browser-pane tips: popups opened by your clicks are blocked; narrow panes hide desktop-only layout (resize to 1300px wide to see desktop).

## State of the project (so you don't redo it)
- **Working and tested on the preview with test keys:** storefront with the 16 imported IONOS products and 83 saved photos; Square card payments; Stripe wallet payments and webhook; order emails (only deliver to the owner's address until the domain is verified in Resend); orders saved to D1; admin hub with orders, customers, status updates and notes; one-click USPS label via Shippo (test token) that marks the order shipped and emails tracking. The owner confirmed a test label purchase works.
- **Not done (owner or later):** custom domain move; live Square/Stripe/Shippo keys and the Production environment settings; separate live D1 database exists but is empty; Resend domain verification; Stripe webhook and Apple Pay file for the real domain; adding the real domain to the GitHub OAuth app; rotating the keys that were shared in chat; merging PR #1; digital product delivery (the Coaching Planner is imported hidden because the planner site depends on IONOS order numbers).
- **Not supported by design:** customer accounts, automatic stock counts (stock is an in-stock switch per size/color), discount codes.
