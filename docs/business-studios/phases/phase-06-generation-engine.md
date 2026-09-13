# P6 — Generation engine v2 (batches)

**Size:** L · **Depends on:** P1 · **Flag:** API only (`/api/app/**` returns 404 when flag off)

## Goal

A reliable, credit-safe batch generator for up to 200 images per batch: prompt composition per
product, multi-reference WaveSpeed calls, a concurrency-limited queue pump, polling, R2 storage
with AI labeling, automatic refunds, free redos and server-side zips.

## Out of scope

Create/results UI (P7/P8 build on these APIs; this phase includes a minimal dev page only).

## Tasks

### 6.1 WaveSpeed client
- [ ] `src/lib/wavespeed.ts`: `submitEdit` accepts `imageUrls: string[]` (keep `imageUrl` for the consumer routes — map to `[imageUrl]`), `aspectRatio` from `FORMATS`, `resolution: '1k' | '2k'`. Export `COST_USD_MICROS = { '1k': 70_000, '2k': 105_000 }`.
- [ ] Check the WaveSpeed docs: max images per request (set `MAX_REFERENCE_IMAGES` in `src/config/business.ts`), supported aspect ratios for `google/nano-banana-2/edit` (map unsupported formats to the nearest + note), webhook support (if yes, add §6.7).

### 6.2 Prompt composer (`src/server/generation/composer/`)
- [ ] `blocks.ts` — IDENTITY, GARMENT, FORMAT, QUALITY, BRAND_GUARDRAILS, SHOP_GUARDRAILS text from `02-architecture.md` §6.1 (single source of truth; admin-editable later in P10).
- [ ] `brand.ts` — `composeBrandPrompt({ template, set, scene, format, industry })` → `{ prompt, inputKinds }`.
- [ ] `shop.ts` — `composeShopPrompt({ template, set, product, shot, format })` → `{ prompt, inputKinds }` (includes back photo only for `back_or_side`; detail photo for `detail_closeup` and when present).
- [ ] `inputs.ts` — `resolveInputR2Keys({ workspace, set, product?, shot? })` → ordered R2 keys per §6.1 image order; throws `HttpError(409, 'identity_missing')` if identity refs were deleted.
- [ ] Snapshot tests `tests/generation/composer.test.ts` for 3 brand and 5 shop cases (prompt text is stable, guardrails present, garment block order correct).

### 6.3 Batch creation
- [ ] `src/server/generation/draft.ts` — types + validation:
  ```ts
  type BrandDraft = { kind: 'brand_theme'; setId: string; themeId: string; count: 8 | 16 | 24 | 32; formats: FormatId[]; highRes: boolean };
  type ShopDraft  = { kind: 'shop_products'; setId: string; productIds: string[]; packId: PackId; formats: FormatId[]; highRes: boolean };
  type TrialDraft = { kind: 'trial'; … };   // built server-side only (P4)
  ```
  Rules: set & products belong to workspace; `highRes` requires a plan with `highRes`; count of items ≤ `MAX_BATCH_ITEMS`; brand scenes cycle through theme scenes when `count` > scenes (append variation index "variation N: different pose and framing").
- [ ] `expandDraft(draft)` → item specs (sceneId/shot, productId, format). `creditsFor(items, highRes)` = items × (highRes ? 2 : 1).
- [ ] `POST /api/app/batches/estimate` and `POST /api/app/batches` (`app/api/app/batches/route.ts`): create batch + items + `reserveForBatch` in one transaction; name per `01-product-spec` (Brand: `{Theme} · Sep 14`; Shop: `Drop · Sep 14, 2026`); `after(() => pump({ batchId }))`; update `Product.lastUsedAt`.
- [ ] `GET /api/app/batches` (cursor pagination, newest first, cover = first ready item presigned URL).

### 6.4 Pump, poll, finalize (`src/server/generation/`)
- [ ] `pump.ts`, `poll.ts`, `finalize.ts` exactly as `02-architecture.md` §6.2 (claim with `SKIP LOCKED` raw SQL, cached WaveSpeed input URLs on `IdentityReference`; for product images cache in-memory per invocation).
- [ ] `batchStatus.ts` — recompute batch status from items; set `completedAt`; on terminal send "Your photos are ready" email **only if** the batch took > 3 min (user likely left).
- [ ] `labeling.ts` — §6.3; unit test asserts XMP DigitalSourceType present; visible tag compositing when `workspace.visibleAiTag`.
- [ ] Mock mode (`isMockGeneration()`): `pump` marks items `generating` with fake task ids; `poll` completes them after 2–5 s using the template cover images (copied to R2 if configured, else served from `/images/...` URL).
- [ ] `GET /api/app/batches/[batchId]` — ownership, runs `pump({batchId})` + `poll({batchId})` bounded by 8 s total (`Promise.race` with a timer), returns batch + items (presigned URLs 24 h) + `progress { ready, failed, total }`.
- [ ] `app/api/cron/generations/route.ts` — `CRON_SECRET` bearer check; global `poll()` then `pump()`; returns counts. Add `crons` + `functions` to `vercel.json` (§10).

### 6.5 Item actions
- [ ] `POST /api/app/batches/[batchId]/items/[itemId]/redo` — §6.4 rules; reasons enum `not_like_me | product_mismatch | bad_quality | other`; store `redoReason`; 402 when a paid redo lacks credits.
- [ ] `PATCH /api/app/batches/[batchId]/items/[itemId]` — `{ favorite?, rating? }`.
- [ ] `GET /api/app/batches/[batchId]/zip?productId=&format=` — server zip (jszip, `generateNodeStream`) of ready items, file names per spec, `Content-Disposition` attachment, max 200 files.

### 6.6 Client hook + dev page
- [ ] `src/hooks/useBatchPolling.ts` — polls `GET /api/app/batches/[id]` every 4 s while `queued|generating`, exponential backoff on errors (max 30 s), pauses on hidden tab, stops at terminal state; returns `{ batch, items, progress, error, refresh }`.
- [ ] `app/dev/batches/page.tsx` (404 in production) — create a brand or shop batch from a JSON textarea and watch items resolve. Used to test before P7/P8 UI exists.

### 6.7 (Only if WaveSpeed supports webhooks)
- [ ] Submit with the webhook URL + a per-item HMAC token; `POST /api/webhooks/wavespeed` verifies token → `finalize` or failure path. Polling remains as fallback.

### 6.8 Cost tracking
- [ ] On every submit, add provider cost to `Batch.costUsdMicros` (including auto-retries and redos). Expose in admin later (P10).

## Acceptance criteria

- A 24-item brand batch and a 36-item shop batch complete in real mode with `GENERATION_MAX_CONCURRENT=6`; credits reserved = committed + refunded.
- Killing a WaveSpeed task (or forcing an error) → item retried once, then failed and refunded; batch ends `ready` with a partial count.
- Two concurrent `GET /api/app/batches/[id]` calls never submit the same item twice (verify no duplicate `wavespeedTaskId` per item).
- Downloaded JPEGs contain the AI XMP label; visible tag appears when enabled.
- Zip names follow the spec; unauthorised users get 404 for another workspace's batch.
- Tests pass (composer snapshots, labeling, draft validation, credits math).

## Verification

```bash
npm run test
NEXT5_BUSINESS_ENABLED=true npm run dev   # /dev/batches, real mode with a small batch (3 items)
curl -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/generations
```

## Cursor kickoff prompt

```
Implement Phase P6 (docs/business-studios/phases/phase-06-generation-engine.md).
Read first: 02-architecture.md §6 (all), §5 (ledger API), 01-product-spec.md §1–§3 (shots, packs, guardrails),
and existing generation code: src/lib/wavespeed.ts, src/lib/r2.ts, app/api/generate/scene/route.ts (after() usage).
Check node_modules/next/dist/docs for after() and route handler config (maxDuration) in Next 16.
Order: 6.1 → 6.2 (with snapshot tests) → 6.3 → 6.4 → 6.5 → 6.6 → 6.8 (→ 6.7 only if webhooks exist).
Keep every function < 50 lines; split files by responsibility. Never call WaveSpeed when isMockGeneration().
Tick checkboxes as you go.
```
