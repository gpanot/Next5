# P8 — Shop Studio features

**Size:** L · **Depends on:** P4, P5, P6, **SP1 = Go** · **Flag:** Shop launch at the end of this phase

## Goal

A TikTok/Instagram shop owner adds a week's new stock in bulk, generates on-model photos with her
own face or a Studio model in her shop look, checks every garment against its product photo, and
downloads listing-ready files named by SKU.

## Out of scope

Automatic garment-accuracy scoring (backlog), marketplace API publishing, video.

## Tasks

### 8.1 Studio models
- [x] Generate C15–C26 (`04-image-prompts.md`) and add manifest entries.
- [x] Extend `scripts/seed-business.ts`: upload each model's face + full-body image to R2 (`studio-models/{slug}/face.jpg`, `full.jpg`) and upsert `IdentityReference` rows (`isStudioModel = true`, `studioModelSlug`).
- [x] `GET /api/app/studio-models` — `{ slug, name, age, description, faceImage }[]`, plus `available: boolean` per model based on plan (Starter: only the model chosen at onboarding or first used; Pro: all).
- [x] Composer uses the model's refs when `set.modelRef` is a slug.

### 8.2 Products API (`app/api/app/products/…`)
- [x] `GET /api/app/products?search=&category=&status=unused|used&cursor=` (40/page).
- [x] `POST /api/app/products` — multipart: `front` (required), `back?`, `detail?`, fields per `01-product-spec` §3.3. Server image pipeline same as identity (rotate, strip EXIF, max 2048, JPEG q90) → `productKey`.
- [x] `POST /api/app/products/bulk` — up to 20 `front` files + a JSON array of fields (same index); all-or-nothing validation, per-row errors returned `{ index, field, message }`.
- [x] `PATCH /api/app/products/[productId]` (fields, add/replace back/detail), `DELETE` = archive (`archivedAt`).
- [ ] *(P9.)* Retention: products unused for 12 months are listed by the billing cron for deletion (implemented in P9).

### 8.3 Products page (`app/app/products/page.tsx`, `src/components/app/products/`)
- [x] `ProductsToolbar` (search, category select, status chips "New · Photographed"), `ProductGrid` of `ProductCard` (front photo, name, category `Badge`, SKU, "New" or "Photographed", selection checkbox) *(count not shown)*, empty state (D6/D7 example images + tip).
- [x] `AddProductsSheet` two steps (`03-ux-ui.md` §8.7): `BulkDrop` (up to 20) → `ProductRowsTable` (thumbnail · name · category · colour · SKU · fit; "Apply to all" for category & fit; add back/detail per row via small drop targets *(back/detail are added in the product detail sheet instead)*) → Save with per-row inline errors. Mobile: rows become stacked cards.
- [x] `ProductDetailSheet`: edit fields, photos, "Create photos for this product" → `/app/create?products={id}`.
- [x] Selecting products → sticky bar "3 selected · Create photos".

### 8.4 Shop looks
- [x] Reuse `SetsPage`/`SetBuilder` with shop variant: steps = look template → model (Me / Studio model picker) → name. Nav label "Shop looks". Same plan limits.
- [x] "Me" requires identity refs; the look editor shows a hint when none exist (batch creation returns `identity_missing`).

### 8.5 Create flow (`ShopCreateFlow`)
- [x] Steps per `03-ux-ui.md` §8.4: `ProductsStep` (grid with checkboxes, filter "Not photographed yet" default on, `?products=` preselect, max 40 products per batch), `LookStep` (look shows its model), `PackStep` (Listing/Full; auto "Accessory pack" note for accessory categories; Full's back shot only for products with a back photo *(skipped silently; the estimate reflects it)*), `FormatsStep` (default = workspace `defaultFormats`, else `square_1_1`).
- [x] `CreditSummaryBar` with explicit multiplication `12 products × 3 shots × 1 format = 36 credits`.

### 8.6 Results — Compare view (`ShopBatchView`)
- [x] `BatchHeader`; AI tag state + Settings link live in the posting tips card.
- [x] One `CompareRow` per product: pinned original (front only), generated shots (horizontal scroll on mobile with snap), per-row [Download zip] (`/zip?productId=`).
- [x] Tile actions: favourite, download, redo with **shop reasons** (`product_mismatch`, `not_like_me` labelled "Doesn't look like me/model", `bad_quality` "Bad pose or hands", `other`).
- [x] `CompareLightbox`: desktop side-by-side original ↔ generated at the same height; mobile swipe between original and generated with a "Original / Generated" segmented label.
- [ ] *(Pending SP1.)* If SP1 was "Go with limits": products whose category/notes mark prints show a `Badge` "Check print details" on the row.
- [x] `PostingTipsCard` (dismissible, stored in localStorage): AIGC label on TikTok Shop, match the real item, keep real feedback photos real.

### 8.7 File naming & formats
- [x] Zip and single downloads use `{sku || slug(name)}_{shot}_{format.filenameSuffix}.jpg`; duplicates get `-2`, `-3`.
- [x] Settings default `visibleAiTag = true` for shop workspaces at creation (P4 workspace creation — patch if already built).

### 8.8 Replace marketing "after" images
- [x] Run C1/C3/C5 through the real Shop pipeline (model `model-vy`, look `beige-wall`, shot `full_body_front`; bag = `worn_half_body`), review, and replace C2/C4/C6 files + manifest entries (prompt field notes "Generated with Next5 Shop pipeline from C1").

## Implementation notes (2026-09-14)

- **SP1 has not been run.** P8 was built ahead of the spike because demand validation needs the full flow; run SP1 with real shop products before any paid launch of Shop Studio. Early signal from 3 pipeline runs (marketing slider): knit texture, buttons, bag flap/buckle reproduced faithfully; one small hem-length drift on the dress and one added clutch.
- Studio model limit: plans without `allStudioModels` may use one Studio model across active shop looks (`model_limit` 403).
- Batch detail returns `products` + `visibleAiTag`; shop batches render `ShopCompareGrid` (original pinned, shots in pack order) and `CompareLightbox` (side by side on desktop, toggle on phones); per-product zip.
- Bulk add: `POST /api/app/products/bulk` validates all rows first (per-row `details.errors`), creates nothing if any row is invalid.
- Verified in Chrome: bulk add 3 products → select → create (Listing, 1:1) → 9/9 ready → compare lightbox → "Doesn't match product" redo → per-product zip download.

## Acceptance criteria

- Bulk add 20 products on desktop and 5 on a phone; validation errors are per row and don't lose entered data.
- 12 products × Listing × 1:1 batch completes; compare view shows each original next to its shots; zip names match SKUs.
- "Doesn't match product" redo is free twice, then costs a credit; reason stored for QA.
- Starter cannot use a second Studio model (clear upgrade message); Pro can use all six.
- Visible AI tag appears on shop outputs by default.
- Light/dark, 375 px, keyboard accessible compare lightbox.

## Verification

```bash
NEXT5_BUSINESS_ENABLED=true NEXT5_MOCK_GENERATION=true npm run dev
npm run db:seed:business   # models seeded
# staging: 5 real products × Listing × 1:1 in real mode, review garment accuracy vs SP1 results
```

## Cursor kickoff prompt

```
Implement Phase P8 (docs/business-studios/phases/phase-08-shop-studio.md).
First read docs/business-studios/spike-01-report.md — if the decision is "No-go", stop and tell me.
Then read 01-product-spec.md §3, 03-ux-ui.md §8.2, §8.4, §8.6, §8.7, 04-image-prompts.md section C,
and reuse P6 APIs and P7 set components (shop variant, no duplication).
Order: 8.1 → 8.2 → 8.3 → 8.4 → 8.5 → 8.6 → 8.7 → 8.8. Tick checkboxes as you go.
```
