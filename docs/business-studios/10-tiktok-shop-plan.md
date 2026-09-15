# Plan: Mulberry theme, two studios, TikTok Shop studio (P13–P18)

**Date:** 2026-09-15 · **Source:** the TikTok Shop market research Guillaume shared (US TikTok Shop apparel, "missing middle" 100–500 SKUs) and his decisions below.

## Decisions (answered 2026-09-15)

| # | Decision |
|---|---|
| D11 | **Theme "Mulberry Atelier"** replaces the cream/terracotta look on every business surface: marketing, onboarding, app, admin, emails and OG images. |
| D12 | **Two studios, one account.** `/app/brand/*` (photos of you) and `/app/shop/*` (TikTok Shop). Each has its own navigation, plan and credits; one login, with a studio switcher. |
| D13 | **Shop pricing $49 / $199 / $399** (Starter / Growth / Scale); Agency stays on request. Brand stays $29 / $99 / $759. |
| D14 | **Shop import V1 = paste shop URL (scrape) + Seller Center export file.** The official TikTok Shop API replaces the scrape once approved (P18). |

## What the research changes (and what it doesn't)

- **Wedge:** TikTok Shop apparel sellers with 100–500 SKUs. They get new stock weekly, phone photos no longer scale, and a studio isn't worth it yet. Brand Studio stays, but Shop gets priority.
- **Moat:** a catalog-connected workflow, not a prompt tool. Import the store → find products that need photos → weekly drops → a listing-ready pack per product. Later (API): new product → automatic photos → written back to the listing.
- **Make-or-break is product accuracy** (print scale, drape, neckline). The research's threshold is **≥ 80% of photos accepted on the first try**. We measure that ourselves and gate the paid Shop launch on it (it's also the SP1 spike we never ran).
- **Compliance:** TikTok Shop requires a visible "AI-generated" label on AI listing images and bans misrepresenting the product. Shop already defaults to the visible AI tag; keep it on for TikTok listing packs and don't let it be switched off there.
- **Retention:** unused quota drives churn. Growth tiers point quota at the products that need it and show before/after (sold-count snapshots now, TikTok Analytics after API approval).
- **Open strategic point (not blocking V1):** the research is about **US** sellers, while checkout is VND bank transfer in early-access mode. Selling to US shops needs Stripe/USD. Decide before paid launch.

---

## P13 — Theme: Mulberry Atelier (1–2 days)

**Tokens** (`app/globals.css`; the `app-*` names stay, only the values change):

| Token | Light | Dark |
|---|---|---|
| app-bg | `#FAF7F8` porcelain | `#141015` |
| app-panel | `#FFFFFF` | `#1C171D` |
| app-sunken | `#F3ECEF` | `#251E26` |
| app-ink | `#1D1520` plum-black | `#F4ECF1` |
| app-muted | `#6E6270` | `#AD9FAE` |
| app-line | `#EADFE5` | `#3A2F3B` |
| app-accent | `#8E2A5C` mulberry | `#E08AB6` |
| app-accent-ink | `#FFFFFF` | `#1A1117` |
| app-accent-soft | `#F5E6EE` blush | `#3A2130` |
| app-success / warning / danger / info | `#1F7A57` / `#A36A12` / `#B3263E` / `#3F5E8C` | `#7CC4A2` / `#E0B25C` / `#F08A9A` / `#9DB7E0` |

- **Type:** display **Bricolage Grotesque** (600–800) replaces Cormorant on business surfaces; body stays **Inter**. Tighten the display scale, since the grotesque needs less size than the serif.
- **Sweep:** remove hard-coded hex values left over from the old palette. Examples: `#b8683f` and `#9c5c3a` in emails, admin, `ScoreCard`, `PostKitPanel`, `PromiseBlock` and `FinalCtaBand`. Add a lint check (`rg '#(b8683f|9c5c3a|d89873|f5f1ea|1f1c19)'` must return nothing).
- **Also update:** OG image renderer, email layout, admin tabs, favicon or accent mark.
- **Consumer `/photos` and `/studio`:** keep their own look in P13 (separate product). Optional P13.5 applies the same tokens if Guillaume wants one brand.
- **Acceptance:** screenshots of `/`, `/brand`, `/shop`, `/pricing`, `/start/*`, the app and admin in light and dark at 390 px and 1440 px. WCAG AA contrast for body text and buttons.

## P14 — Two studios, one account (2–3 days)

- **Routes:** `/app/brand/...` and `/app/shop/...`. Old `/app/*` redirects to the last-used studio, or the only one the user has.
  - The studio comes from the URL, not local storage (`WorkspaceProvider` reads the route segment).
  - `/app/settings` stays shared (account, privacy).
- **Navigation per studio:**
  - **Brand:** Home · Create · Sets · Library · Billing.
  - **Shop:** Home · **Store** · Products · Create drop · **TikTok library** · Billing.
- **Studio switcher:** in the sidebar header (and the mobile top bar). It shows both studios and marks the one you don't have yet: "Add Shop Studio → /start/shop".
- **Identity:** Brand keeps the "you" wording. Shop wording: "Next5 Shop — for TikTok Shop sellers". Don't name it "TikTok Studio" (TikTok brand rules).
- **Deep links in emails and banners** get the studio prefix.
- **Acceptance:**
  - A user with both workspaces can switch without losing context.
  - Every old URL redirects.
  - The e2e scripts are updated.

## P15 — TikTok Shop import V1 (4–6 days, spike first)

**15.0 Spike (½–1 day, before building):**
- Try 2–3 Apify TikTok Shop catalog actors on 3 real US apparel shops. Check coverage (products, variants, all images, price, sold count, category), speed, cost per 500 products and failure rate. Pick one and record the input/output shape.
- Get a real **Seller Center product export** file and record its columns.

**Data model (dbmate migration + Prisma):**
- `shop_connections`: id, workspace_id, platform (`tiktok_shop`), shop_url, shop_name, handle, source (`scrape` | `export` | `api`), status (`pending` | `syncing` | `ready` | `failed`), product_count, last_synced_at, next_sync_at, error, owner_attested_at.
- `products` gains:
  - Source fields: source, external_id, external_url, category_path.
  - Commerce fields: price_cents, currency, sold_count, variants (JSON: SKU, color, size, image), image_urls (text[]).
  - Sync fields: imported_at, last_synced_at.
  - Unique key: (workspace_id, source, external_id).
- `product_snapshots`: product_id, sold_count, price_cents, captured_at. This is the before/after baseline.

**Pipeline (`src/server/shopImport/`):**
- One adapter interface `CatalogSource.fetch(connection) → NormalizedProduct[]` with `apifyScrape`, `sellerCenterExport` and later `tiktokApi` implementations. P18 is then just a new adapter.
- `POST /api/app/shop/connections { url, attest }`:
  1. Validate the URL (shop page, @handle shop tab, or a product URL → its shop).
  2. Require the checkbox "I own or manage this shop". Scraping someone else's store is not allowed.
  3. Start an Apify run.
  4. Apify calls `/api/webhooks/apify` when done (plus a poll fallback).
  5. Normalize and upsert, capped at 500 products in V1.
  6. Queue image downloads to R2 in the background.
  7. Take a sold-count snapshot.
- `POST /api/app/shop/import-file`: xlsx/csv upload, auto-detect columns, a manual column mapping if detection fails, image URLs fetched in the background. Needs a small xlsx parser (approve the dependency, e.g. `read-excel-file`).
- **Product photo input:** the main image becomes the product's front photo for generation. The seller can pick a different image, for example a flat-lay, from the imported ones.
- **Sync:**
  - Manual "Sync now".
  - Growth/Scale also re-sync weekly from the daily billing cron (due connections), adding snapshots.
  - Removed products are archived, not deleted.
- **Env:** `APIFY_TOKEN`, `APIFY_ACTOR_ID`, `APIFY_WEBHOOK_SECRET`.
- **Risk note in code and docs:** scraping breaks TikTok's terms of service, so it's a V1 bridge only. Public data only, rate-limited, and switched off when the API adapter is live (`NEXT5_SHOP_IMPORT=api|scrape|export`).
- **Tests:** normalizer fixtures from the spike output, export parser fixtures, idempotent upserts, archive-on-missing, snapshot creation.

## P16 — TikTok Shop studio flows (5–7 days)

- **Onboarding (Shop):**
  1. Account.
  2. **Connect your store** (paste URL, or upload the export, or "skip, add products by hand").
  3. Consent.
  4. Model.
  5. Look.
  6. **Free trial: 3 photos of your best-selling product** (from sold count).
  7. Plan.

  This is the "paste your URL" hook from the research.
- **Store (Shop home):**
  - A catalog grid with image, title, price, sold count, variant count and a Next5 status (`needs photos` / `in drop` / `pack ready`).
  - Filters: new since last sync, no Next5 photos yet, best sellers, slow sellers (low sold count), by category.
  - Sync status and "Sync now".
- **Create drop:**
  - Pick products (suggested: new and not yet photographed, then best sellers without a pack).
  - Pick a pack: **Listing pack** = main 1:1 plus up to 8 extras (angles, detail, lifestyle) plus a 9:16 video cover.
  - Optional **one photo per colorway** when variant images exist.
  - Show a credits estimate.
  - Growth/Scale get a **weekly or biweekly drop schedule** that pre-selects products and emails when the drop is ready to review.
- **TikTok library** (per product, replaces the flat library for Shop):
  - Slots 1–9 in TikTok upload order, reorderable. Each slot sits next to the original TikTok image.
  - "AI-generated" label always on for listing images.
  - Post Kit description plus hashtags.
  - Per-product status: `draft` → `ready` → `uploaded` (the seller marks it until P18 write-back).
  - **Download listing pack** zip: `{sku}_01_main.jpg … {sku}_09.jpg` plus `{sku}_cover_9x16.jpg` plus `description.txt`. Checks TikTok image specs (300–4000 px, ≤ 9 main images).
- **Accuracy KPI:**
  - Admin → QA shows the **first-try acceptance rate** (photos never redone as "doesn't match product") by category and by model.
  - A launch gate for paid Shop: **≥ 80%** on 3 real catalogs.
- **Before/after (V1, sold-count based):** each product card shows "Sold since Next5 pack: +N (last sync)". The wording states only facts, no causation claims.

## P17 — Shop pricing and offer refresh (2 days)

| Plan | Price | Photos/mo | Store | Includes |
|---|---|---|---|---|
| Starter | $49 | 100 | 1 store · up to 50 products | Store import, listing packs, score |
| **Growth** (most popular) | **$199** | 400 | 1 store · up to 500 products · weekly sync | + weekly/biweekly drops, Post Kit (descriptions, hashtags), all 6 models, colorway packs, before/after |
| Scale | $399 | 1,000 | 2 stores · weekly sync | + priority, 2K, early API features (auto-trigger, write-back) |
| Agency | on request | custom | many stores | setup call |

- **Code:** `plans.ts` (Shop ids: `shop_starter`, `shop_pro` sold as Growth, new `shop_scale`; `shop_agency` becomes contact-only). Also `offer.ts` value stack and pricing copy.
- **Value stack anchors** (use only numbers we can cite; keep the `basis` field):
  - soona $39 per photo.
  - UGC video about $175 per deliverable.
  - A studio shoot $200+ per session.
- **Headline direction:** "Your new drops, photographed every week. Listing-ready for TikTok Shop."
- **Trial:** "Paste your shop link. Get 3 free photos of your best seller."
- **Keep the promises.** Add "first-try accuracy" to the match promise once the KPI is measured.

## P18 — TikTok Shop API (after approval, 1–2 weeks)

1. **Connect store:** OAuth in Partner Center. Verify the scopes and the `PRODUCT_CREATION` entitlement for the US market in an authenticated session first.
2. **Import:** the `tiktokApi` adapter uses the Product API for catalog, SKUs and attributes. Turn scraping off.
3. **Auto-trigger:** the `PRODUCT_CREATION` webhook (event 16) → add to the next drop, or generate immediately (Scale).
4. **Write-back:**
   - Upload Image (`/product/202309/images/upload`), then Edit or Partial Edit Product.
   - Images go through **re-audit**: track `PRODUCT_STATUS_CHANGE` and show "In TikTok review / Live / Rejected, old images kept".
5. **Analytics:** product/SKU performance endpoints → quota allocation to underperformers, plus real before/after (views, conversion) replacing sold-count deltas.

## Order and parallel work

1. **Now, in parallel:**
   - P13 theme.
   - P15.0 spike: needs an Apify account/token and 3 real shop URLs.
   - Collect a Seller Center export file.
2. P14 studio separation.
3. P15 import.
4. P16 studio flows, then run the accuracy test on 3 real catalogs (the gate).
5. P17 pricing and offer.
6. P18 when the API is approved.

## Needs from Guillaume

- An Apify account and `APIFY_TOKEN` (or approve using ours).
- 3 real US TikTok Shop apparel shop URLs (ideally one you manage) and a Seller Center product export file.
- OK to add a small xlsx parser dependency.
- US vs Vietnam sellers for paid launch (Stripe/USD vs VND bank transfer).
- Whether `/photos` gets the new theme too (P13.5).

## Cursor kickoff prompts

```
P13: Implement the Mulberry Atelier theme per docs/business-studios/10-tiktok-shop-plan.md §P13. Change token values in app/globals.css (light + dark), swap the display font to Bricolage Grotesque on business surfaces, and remove every hard-coded old-palette hex in src/components, src/server/email and admin. Don't touch /photos or /studio. Screenshot the listed pages at 390 and 1440 in light and dark.
```
```
P14: Split the app into /app/brand/* and /app/shop/* per §P14. The studio comes from the route, not local storage; old /app/* URLs redirect. Separate nav per studio, a studio switcher, shared /app/settings. Update the e2e scripts in tests/e2e.
```
```
P15: Build the TikTok Shop import per §P15. Start with the spike notes in docs/business-studios/spikes/tiktok-import.md. Add the dbmate migration (shop_connections, product fields, product_snapshots), the CatalogSource adapters (apifyScrape, sellerCenterExport), the connection + import-file routes, the Apify webhook with a poll fallback, R2 image download, and weekly sync from the billing cron. Write fixture-based tests first.
```
