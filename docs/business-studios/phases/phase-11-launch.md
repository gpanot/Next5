# P11 — Launch hardening

**Size:** M · **Depends on:** all previous phases · **Flag:** turns `NEXT5_BUSINESS_ENABLED=true` in production at the end

## Goal

Legal pages, abuse protection, SEO/OG, monitoring and end-to-end smoke tests — then swap the
homepage and launch Brand (and Shop if P8 shipped).

## Implementation notes (2026-09-14)

- **Legal (drafts):** `/legal/terms`, `/legal/privacy`, `/legal/ai-and-face-data` from `src/content/business/legal.ts`, each with a
  "Draft pending legal review" notice; linked from the marketing footer and the onboarding consent step. Consent version unchanged.
  Payments are mocked (D7), so the SePay processor line is worded as "payment provider".
- **Rate limits:** `rate_limits` table (migration `20260914170000_rate_limits.sql`, local DBs only so far) + `enforceRateLimit(key, limit, windowSec)`
  → 429 `rate_limited`. Applied: account 5/IP/h, trial 3/IP/day, identity upload 20/user/day, bulk products 20 requests/user/day
  (≤ 50 products each), payment create 10/user/h, batch create 30/user/h (solo accounts ⇒ same as per workspace), magic link 5/email/h.
  Old windows pruned by the daily billing cron. `/api/preview` no longer logs emails.
- **SEO/OG:** `opengraph-image.tsx` for `/`, `/photos`, `/brand`, `/shop`, `/pricing` (shared `ogImage.tsx`).
  `app/robots.ts` + `app/sitemap.ts` list business pages only when the flag is on. Marketing heroes use `next/image` with `sizes` + `priority`.
  JSON-LD and a Lighthouse pass not done.
- **Cron:** `vercel.json` has the daily billing cron. The per-minute generations cron needs Vercel Pro (or an external pinger
  hitting `/api/cron/generations` with `CRON_SECRET`); until then batches advance while a user is polling the batch page.
- **E2E:** `tests/e2e/{brand,shop,brand-create,shop-app}.mjs` (Playwright library + local Chrome, mock generation/payments),
  `npm run test:e2e`, instructions in `tests/e2e/README.md`. Scenarios 3 (consumer /photos) and 4 (cross-workspace 404) and CI not done;
  cross-workspace access is covered by `requireOwnedBatch` returning 404.
- **Launch switch (code, 2026-09-14):** `app/page.tsx` renders `BusinessHome` inside `MarketingShell` when the flag is on and the
  consumer `PhotosHomePage` when off (rollback = flag off). `/home-preview` deleted; `LegacyHashRedirect` forwards `/#routes|#how-it-works|#faq`
  to `/photos`. Root metadata is business (+ `metadataBase`); `/photos` and `/studio` keep consumer metadata.
- **Early-access checkout (D7 amendment):** in production without `NEXT5_MOCK_PAYMENTS=true`, payments are created with
  `provider = 'request'` (30-day expiry): no bank details, no QR, no simulate button — the sheet says "Request received, we'll email you within 24 h".
  Customer gets `request_received`; `NEXT5_ADMIN_EMAIL` gets an alert. Admin → Payments → **Activate** runs `markPaidAndFulfil`
  (plan starts that day) and emails `request_activated`. `NEXT5_MOCK_PAYMENTS=true|false` overrides the default in any environment.
  E2E: `npm run test:e2e:early`.
- **Analytics:** Vercel Web Analytics (`@vercel/analytics`, `SiteAnalytics` in the root layout, query strings scrubbed except plan/term/welcome/product).
  Custom events: onboarding_step_completed, trial_generated, checkout_opened, plan_requested, payment_paid, batch_created, item_redo, zip_downloaded.
  Page views work on Hobby; custom events are visible on Pro. Enable Analytics once in the Vercel dashboard.
- **Production rollout:** `bash scripts/launch-business.sh` (run by Guillaume — migrations, catalog seed, env vars, flag, `vercel --prod`, each confirmed).
- **Generation without a cron (D9):** business tasks are submitted with `?webhook=` → `/api/webhooks/wavespeed`
  (only when `NEXT_PUBLIC_APP_URL` is https and `WAVESPEED_WEBHOOK_SECRET` is set; consumer tasks keep polling). The route verifies the
  signature (required in production), answers 200 at once and in `after()`: finalizes/fails the item (retries the lookup for callbacks that
  beat the task-id write), `pump()`s the global queue so any waiting batch gets the freed slot, and `sweepStale()` polls tasks silent for
  more than 3 minutes. Batch creation also sweeps; the daily billing cron runs a 20 s generation tick; an open batch page still polls.
  Tests: `tests/server/generation/webhook.test.ts`.
- **Skipped by decision:** Sentry/monitoring (11.3). Legal review later.
  Existing lint errors are all in the consumer code (`app/studio`, `useBookingFlow`, `ResultsGallery`, …), none in business code.

## Tasks

### 11.1 Legal (draft in English; **review by a Vietnamese lawyer before launch**)
- [x] `/legal/terms` — service description, prepaid plans & credits, no auto-renewal, refunds (credits for failures; cash only for payment errors), acceptable use (own face / consented; no impersonation; no misleading listings), IP (customer owns outputs subject to model provider terms), liability.
- [x] `/legal/privacy` — data collected (email, photos, product photos, payment metadata), purposes, processors (WaveSpeed, OpenAI, Cloudflare R2, Railway, Vercel, Maileroo, SePay), retention (01-product-spec §5), rights (export, delete), contact.
- [x] `/legal/ai-and-face-data` — how face photos are used, never used to train Next5 models, deletion, AI labeling (embedded + visible), customer responsibilities under Vietnam's AI Law (labeling AI images of real people) and platform rules (TikTok AIGC, Meta AI info).
- [ ] Consent version bump if wording changed since P4 (`version`), and re-consent prompt for existing users.
- [ ] Before any **US** launch (not now): Illinois BIPA-style written consent + retention schedule review, California SB 942 applicability check — note in this file's "Later" list.

### 11.2 Abuse & rate limits
- [x] `src/server/rateLimit.ts` — Postgres-backed fixed-window counter table `RateLimit { key, windowStart, count }` (no new infra), helper `enforce(key, limit, windowSec)`.
- [x] Apply: onboarding account 5/IP/hour; trial 3/IP/day + existing browser guard; identity upload 20/user/day; product upload 200/workspace/day; payment create 10/user/hour; batch create 30/workspace/hour; magic link 5/email/hour.
- [x] Trim PII from logs (`/api/preview` logs emails today — log user id instead).

### 11.3 Monitoring
- [ ] Error monitoring (recommendation: Sentry for Next.js — confirm Next 16 support in its docs) for server routes and client; tag `product`, `route`.
- [ ] Cron health: `/api/cron/*` write a heartbeat row; admin Overview shows last run; alert email to admin if generations cron hasn't run in 15 min or billing cron in 26 h.
- [ ] WaveSpeed failure-rate alert: > 20% failed items in the last hour → admin email.

### 11.4 SEO, OG, performance
- [x] `opengraph-image.tsx` for `/`, `/brand`, `/shop`, `/pricing` via `next/og` (Cormorant headline + one image from the manifest); check Next 16 docs.
- [ ] JSON-LD `Organization` + `Product`/`Offer` for plans on `/pricing`.
- [ ] `next/image` everywhere with correct `sizes`; hero images `priority`; LCP < 2.5 s on 4G for `/brand` and `/shop`.

### 11.5 End-to-end smoke tests (Playwright)
- [x] Add Playwright (dev dep) with `tests/e2e/` running against `NEXT5_MOCK_GENERATION=true NEXT5_MOCK_PAYMENTS=true`:
  1. Brand: landing → Start free → onboarding (upload fixture selfies) → trial ready → choose Starter 3 mo → simulate transfer → dashboard credits 30 → create 8 × 1 format → results → download all.
  2. Shop: landing → Try it free → Studio model → add product → trial compare view → Pro 1 mo → bulk add 3 products → batch → redo "Doesn't match product" → zip.
  3. Consumer `/photos` booking with server-verified payment → `/studio` shows photos.
  4. Security: calling `/api/app/batches/{otherWorkspaceBatch}` → 404; `/api/orders` cannot mark paid.
- [ ] Run in CI (GitHub Actions) on pull requests.

### 11.6 Launch switch
- [x] Replace `app/page.tsx` with the business home (move `home-preview` content to `/`, delete `/home-preview`), keep `/photos`.
- [x] Redirect old consumer deep links: `/#routes` hash links can't redirect server-side — add a small client check on `/` that forwards `#routes|#how-it-works|#faq` to `/photos#…`.
- [x] Update `app/layout.tsx` default metadata to the business positioning; `/photos` keeps its own metadata.
- [ ] Production env: set all variables from `02-architecture.md` §10; SePay webhook pointed to production; cron schedules active; run a 2,000₫ live test payment (P2 admin action).
- [ ] Set `NEXT5_BUSINESS_ENABLED=true`. Monitor errors, payments queue and generation failures for 48 h.

## Launch checklist (tick on launch day)

- [ ] Lawyer-reviewed legal pages live
- [ ] Live SePay test payment matched automatically
- [ ] One real Brand batch and one real Shop batch generated in production
- [ ] Emails deliver (welcome, receipt, batch ready) to Gmail and Outlook
- [ ] Admin: payments queue empty, metrics loading
- [ ] Lighthouse mobile ≥ 90 / 95 / 95 on `/`, `/brand`, `/shop`
- [ ] E2E suite green on `main`
- [ ] Rollback plan: set flag `false` (business routes 404, `/` falls back — keep the old consumer home component importable for one release)

## Later (not in this plan)

Teams & seats (Brand agencies) · Stripe + US launch (BIPA/SB 942 review) · automatic garment-accuracy scoring ·
scheduled posting to Instagram/Facebook/TikTok · short video outputs · referral credits · Zalo OA notifications.

## Cursor kickoff prompt

```
Implement Phase P11 (docs/business-studios/phases/phase-11-launch.md).
Read first: README.md risks table, 01-product-spec.md §5, 02-architecture.md §10–§12.
Order: 11.2 → 11.3 → 11.4 → 11.5 → 11.1 (drafts, flagged for legal review) → 11.6 only when I confirm launch.
Check node_modules/next/dist/docs for opengraph-image and any monitoring integration guidance.
Tick checkboxes as you go.
```
