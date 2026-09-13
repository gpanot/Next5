# P0 — Groundwork

**Size:** M · **Depends on:** — · **Flag:** creates `NEXT5_BUSINESS_ENABLED` (default `false`)

## Goal

Prepare the codebase for the business products with **zero visible change** except that the
consumer homepage now also lives at `/photos`. Split oversized files, add config + money helpers,
dark-mode tokens scoped to business surfaces, and the shared UI primitives every later phase uses.

## Out of scope

New pages, database changes, payments, generation changes.

## Tasks

### 0.1 Read first
- [x] Read `AGENTS.md`, then the Next.js 16 docs in `node_modules/next/dist/docs/` for: App Router
      pages/layouts, route handlers, `redirect`/`notFound`, metadata. Note any API you'll use differently.
- [x] Read `docs/business-studios/README.md`, `03-ux-ui.md` §2–§4, `docs/design-system.md`, `docs/contributing.md`.

### 0.2 Move the consumer homepage to `/photos`
- [x] Create `src/components/photos/PhotosHomePage.tsx` (named export) containing the current body of `app/page.tsx`.
- [x] `app/photos/page.tsx` renders `<PhotosHomePage />` with metadata copied from `app/layout.tsx` (title/description of Next5 Photos).
- [x] `app/page.tsx` **keeps rendering `<PhotosHomePage />` for now** (P3 replaces it). This keeps production identical.
- [x] Update in-page anchors in `src/data/site.ts` `navLinks` and `Header`/`Footer` so they work from both `/` and `/photos` (use `/photos#routes`, `/photos#how-it-works`, `/photos#faq`).
- [x] Search for hard-coded `href="/"` / `"/#` in `src/components/**` and `app/studio/**`; point consumer links to `/photos`.

### 0.3 Split oversized files (global rule: ≤ 600 lines; split > 400)
- [x] `src/components/booking/steps/PreviewStep.tsx` (747 lines) → `PreviewStep.tsx` (composition, 350 lines) + `src/hooks/usePreviewGeneration.ts` + `src/components/booking/preview/{FeedbackBlock,PreviewResultParts,InlinePaymentSection}.tsx`. **No behaviour change.**
- [x] `app/admin/page.tsx` (615 lines) → `app/admin/page.tsx` (tabs + auth, ~80 lines) + `src/components/admin/{UsersTab,BookingsTab,PromptsTab,AdminLogin}.tsx` + `src/lib/admin-format.ts`.
- [ ] Manually re-test: full `/photos` booking flow in mock mode (`NEXT5_MOCK_GENERATION=true`), `/admin` tabs.

### 0.4 Config & helpers
- [x] `src/config/business.ts`: `isBusinessEnabled()`, `TRIAL_CREDITS`, `FREE_REDOS_PER_ITEM`, `MAX_BATCH_ITEMS`, `VND_PER_USD`.
- [x] `src/lib/money.ts`: `formatUsd(cents, { showCents? })`, `usdCentsToVnd(cents, rate)` (rounds **up** to nearest 1,000₫), `formatVnd(vnd)`.
- [x] `src/lib/dates.ts`: `formatShortDate(date)` → `Sep 14, 2026`, `formatRelative(date)`.
- [x] Add `vitest` as a devDependency, `npm run test` script, `vitest.config.ts`, and `tests/lib/money.test.ts` (9 tests, all pass).

### 0.5 Business surface tokens (dark mode)
- [x] Add the `--color-app-*` tokens and the scoped dark override from `03-ux-ui.md` §2.2 to `app/globals.css`.
- [x] Add `src/components/ui/BusinessSurface.tsx`: `<div data-surface="business" className="min-h-screen bg-app-bg text-app-ink antialiased">`.
- [ ] Verify `/photos` is visually unchanged in OS dark mode.

### 0.6 UI primitives (`src/components/ui/`)
- [x] `AppButton`, `Card` (+ sub-parts), `Badge`, `Chip`/`ChipGroup`, `SegmentedControl`, `Tabs` / `UrlTabs`
- [x] `Field`, `TextInput`, `Select`, `Textarea`, `ColorInput`, `Checkbox`, `RadioGroup`, `Switch`
- [x] `Stepper`, `ProgressMeter`, `SkeletonText`/`SkeletonCard`/`SkeletonGrid`, `EmptyState`, `ErrorState`
- [x] `Dialog`, `Sheet` (reuses `useFocusTrap`, `useLockBodyScroll`), `Toast`/`ToastContainer` + `useToast`
- [x] `FileDrop` + `src/hooks/useFileDrop.ts` (PhotoDropzone kept untouched)
- [x] `ImageTile`, `ImageGrid`, `CompareRow`, `PriceTag`, `Tooltip`, `Kbd`, `Avatar`, `Divider`
- [x] Dev gallery `app/dev/ui/page.tsx` + `src/components/dev/DevGallery.tsx` (notFound in production)
- [x] All primitives documented in `docs/components.md` (props table + examples).

### 0.7 Feature-flag guard
- [x] `src/server/guards.ts`: `assertBusinessEnabled()` → calls `notFound()` when `NEXT5_BUSINESS_ENABLED !== 'true'`.

## Acceptance criteria

- `npm run build`, `npm run lint`, `npm run test` pass.
- `/` and `/photos` render the identical consumer homepage; booking flow works end to end in mock mode.
- `/admin` behaves exactly as before.
- No file in `src/` or `app/` exceeds 600 lines.
- `/dev/ui` shows all primitives, correct in light and dark (toggle OS appearance).

## Verification

```bash
npm run lint && npm run test && npm run build
NEXT5_MOCK_GENERATION=true npm run dev   # walk /photos booking flow, /admin, /dev/ui
find app src -name '*.ts*' | xargs wc -l | sort -n | tail -5
```

## Cursor kickoff prompt

```
You are implementing Phase P0 of the Next5 Business Studios plan.
Read, in order: AGENTS.md, docs/business-studios/README.md, docs/business-studios/03-ux-ui.md (§2–§4),
docs/design-system.md, docs/contributing.md, then docs/business-studios/phases/phase-00-groundwork.md.
Before using any Next.js API, check node_modules/next/dist/docs/ — this is Next 16.3.
Work through the tasks in order (0.1 → 0.7). After each task: run lint + build, tick the checkbox in
the phase file, and summarise what changed. Do not change consumer behaviour. Follow the global rules:
strict TS, no any, named exports, ≤600 lines/file, functions <50 lines, Tailwind only, dark mode on new UI.
Stop and ask me if a task would change user-visible behaviour on /photos or /studio.
```
