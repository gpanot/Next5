# P7 — Brand Studio features

**Size:** L · **Depends on:** P4, P5, P6 · **Flag:** Brand soft launch possible at the end of this phase

## Goal

A realtor can manage sets, create a themed batch in four taps, review and redo results, copy
captions (Pro) and find everything in the library.

## Out of scope

Team features, scheduling posts to social networks, video.

## Tasks

### 7.1 Themes API
- [ ] `GET /api/app/themes` — `{ featured: Theme | null, library: Theme[] }`; featured = `featuredMonth` equal to the current month in `Asia/Ho_Chi_Minh`, fallback to the most recent past featured; Pro users also get next month's theme flagged `earlyAccess`.

### 7.2 Sets (`app/app/sets/…`, `src/components/app/sets/`)
- [ ] `GET/POST /api/app/sets`, `GET/PATCH/DELETE(archive) /api/app/sets/[setId]` — enforce `plan.maxSets` (trial/no plan: 1 set) → 403 `set_limit` with upgrade hint.
- [ ] `SetsPage`: `SetCard` grid (cover = latest ready item or template cover, name, locations, "Used in N batches"), `NewSetCard` / `UpgradeCard` when at limit, empty state.
- [ ] `SetBuilder` (`/app/sets/new`, reused in `/app/sets/[id]` edit mode): template → locations (1–3) → wardrobe → brand colours → pose energy → name → Save. Extract step components shared with onboarding step 4 (move them from `src/components/app/onboarding/` into `src/components/app/sets/steps/` and import from both).
- [ ] "Preview 1 photo" button on the builder → creates a 1-item `brand_theme` batch (featured theme scene 1, `portrait_4_5`, 1 credit) and shows it inline; disabled with tooltip when balance is 0.
- [ ] Set detail: rename, edit (note "Changes apply to new batches"), archive with confirm.

### 7.3 Create flow (`app/app/create/page.tsx` → `BrandCreateFlow`)
- [ ] In-page `Stepper` per `03-ux-ui.md` §8.3: `SetStep` (preselect last used via `localStorage` key `next5-last-set`), `ThemeStep` (featured large card + library grid; `?theme=` deep link from dashboard), `AmountStep` (8/16/24/32 chips with "≈ N posts" helper), `FormatsStep` (chips + High-res switch gated by plan).
- [ ] `CreditSummaryBar` (sticky bottom): live estimate via `POST /api/app/batches/estimate` (debounced 300 ms), multiplication shown explicitly, insufficient → warning tone + [Top up] (opens `CheckoutSheet` for top-ups) + [Upgrade].
- [ ] Generate → `POST /api/app/batches` → navigate to `/app/batches/[id]`.

### 7.4 Batch results (`app/app/batches/[batchId]/page.tsx` → `BrandBatchView`)
- [ ] `BatchHeader` (name, progress "12 of 16 ready", formats, created date, [Download all]).
- [ ] `FormatTabs` (only selected formats), `FavoritesFilter`, `SelectModeToggle`.
- [ ] `ImageGrid` of `ImageTile`: states queued/generating (shimmer), ready (actions), failed ("Couldn't create this one — credit refunded" + Retry = redo with reason `bad_quality`, free).
- [ ] `RedoDialog` with reason chips and optional note (note stored in `redoReason` as `reason: note`); shows "Free redo (1 left)" or "Costs 1 credit".
- [ ] `ImageLightbox` (reuse `src/components/ui/ImageLightbox.tsx`): swipe/arrow navigation, download, favourite, caption panel (Pro).
- [ ] `SelectionBar` — selected count, Download selected (client zip via existing `src/lib/download.ts` pattern for ≤ 20, else server zip), Favourite/Unfavourite.
- [ ] "Safe to leave" note while generating + email when done (P6).

### 7.5 Captions (Pro)
- [ ] `POST /api/app/items/[itemId]/caption` — gpt-4o-mini (reuse `src/lib/director-note.ts` client pattern), input: industry, theme title, scene label, workspace name/handle, tone = `poseEnergy`; output ≤ 280 chars, 0–3 hashtags, no emojis unless the user enables later; mock mode returns a canned caption. Cache on `BatchItem.caption`.
- [ ] Caption panel: generate, edit locally, copy button with toast "Caption copied".
- [ ] Non-Pro: panel shows lock + "Captions are included in Pro".

### 7.6 Library (`app/app/library/page.tsx`)
- [ ] `GET /api/app/library` — filters `setId, themeId, format, favorite, from, to`, cursor pagination (40 per page), ready items only.
- [ ] `LibraryFilters` (URL-synced query params), infinite scroll `ImageGrid` (IntersectionObserver sentinel), select mode + server zip (`GET /api/app/library/zip?ids=…` max 200).

### 7.7 Dashboard wiring
- [ ] Featured theme card → `/app/create?theme={id}`; recent batches → batch pages; sets strip → set detail.

## Acceptance criteria

- Realtor flow on a phone: dashboard → Create → pick set/theme/16/2 formats → Generate → results appear progressively → redo one → download all — without dead ends.
- Set limit enforced per plan with a clear upgrade path.
- Estimate always equals credits actually reserved.
- Captions only for Pro; copy works on iOS Safari.
- All views: skeleton, empty, error; light/dark; keyboard accessible grid and lightbox.

## Verification

```bash
NEXT5_BUSINESS_ENABLED=true NEXT5_MOCK_GENERATION=true NEXT5_MOCK_PAYMENTS=true npm run dev
# then one real-mode batch of 8 × 1 format on staging
```

## Cursor kickoff prompt

```
Implement Phase P7 (docs/business-studios/phases/phase-07-brand-studio.md).
Read first: 01-product-spec.md §2, 03-ux-ui.md §8.1, §8.3, §8.5, §8.8, §8.9, and the P6 APIs + useBatchPolling.
Reuse onboarding set-builder steps by moving them into src/components/app/sets/steps (no duplication).
Order: 7.1 → 7.2 → 7.3 → 7.4 → 7.5 → 7.6 → 7.7. Keep components < 400 lines. Tick checkboxes as you go.
```
