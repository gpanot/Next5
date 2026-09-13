# P3 — Marketing site: `/`, `/brand`, `/shop`, `/pricing`

**Size:** L · **Depends on:** P0 (P1 config for prices) · **Flag:** pages 404 while `NEXT5_BUSINESS_ENABLED=false`; `/` keeps the consumer page until launch

## Goal

Four US-style marketing pages that explain both products, show real sample outputs, price from
config, and send visitors to `/start/brand` or `/start/shop`.

## Out of scope

Onboarding (P4), legal pages and OG images (P11), real testimonials (add only when real).

## Tasks

### 3.1 Images first
- [x] Generate every image in `04-image-prompts.md` sections **A, B, C1–C14** and record them in `public/images/manifest.json`.
- [x] For C2/C4/C6 (after images): use fallback prompts now; add a TODO in `04-image-prompts.md` to replace with pipeline output after P8.
- [x] Review each image for artefacts (hands, text, logos). Regenerate failures.

### 3.2 Shared marketing layout (`src/components/marketing/shared/`)
- [x] `MarketingHeader.tsx` — per `03-ux-ui.md` §1 (logo, For professionals `/brand`, For shops `/shop`, Pricing `/pricing`, Log in `/app`, CTA contextual: on `/brand` → "Start free", on `/shop` → "Try it free", else "Get started" → `/#products`). Sticky, blur after scroll (reuse `useScrolled`), mobile menu sheet.
- [x] `MarketingFooter.tsx` — Products, Pricing, Next5 Photos (`/photos`), Log in, Legal (links added in P11), © line.
- [x] `StickyMobileCta.tsx` (business version) — appears after hero scrolls out.
- [x] `SectionHeader.tsx` (eyebrow `label-caps`, Cormorant H2 sentence case, sub), `FaqAccordion.tsx` (keyboard accessible, `aria-expanded`), `FinalCtaBand.tsx`, `GuaranteeRow.tsx`, `PrivacyRow.tsx`, `SampleBadge.tsx` ("Sample made with Next5").
- [x] `PhoneFrame.tsx`, `BrowserFrame.tsx` — pure CSS device frames for UI mocks (no real platform UI).
- [x] `app/(marketing)/layout.tsx` route group wrapping `BusinessSurface` + header/footer for `/brand`, `/shop`, `/pricing` (and `/` at launch). Check Next 16 docs for route groups + metadata.

### 3.3 Content modules (`src/content/business/`)
Keep copy out of components (English only):
- [x] `home.ts`, `brand.ts`, `shop.ts`, `pricing.ts`, `faq.ts` — typed objects with the copy from `01-product-spec.md` §6 and the section lists in `03-ux-ui.md` §5. Image paths reference manifest keys.

### 3.4 Home (`src/components/marketing/home/`, `app/(marketing)/home-preview/page.tsx` until launch)
- [x] `HomeHero`, `ProductChooser` (two cards), `SharedHowItWorks`, `GuaranteeRow`, `PrivacyRow`, `FaqAccordion`, `FinalCtaBand`, tertiary link to `/photos`.
- [x] Build it at `/home-preview` behind the flag; the swap of `app/page.tsx` happens in P11 launch.

### 3.5 Brand page (`src/components/marketing/brand/`, `app/(marketing)/brand/page.tsx`)
Sections in the order of `03-ux-ui.md` §5.2:
- [x] `BrandHero` (with `PhoneFrame` 3×3 grid of B3–B16 images), `OldWayComparison`, `BrandHowItWorks`,
      `SetsGallery` (reads templates from `src/content/business/brand.ts`, not DB, so the page is static),
      `ThemesScroller` (month labels from `featuredMonth`), `IndustryTabs`, `FormatsShowcase` (B22 cropped via `object-position` into 4 frames),
      `GuaranteeRow`, `PricingPreview` (brand plans from `src/config/plans.ts`), `FaqAccordion`, `FinalCtaBand`.

### 3.6 Shop page (`src/components/marketing/shop/`, `app/(marketing)/shop/page.tsx`)
Sections in the order of `03-ux-ui.md` §5.3:
- [x] `ShopHero` with `BeforeAfterSlider` (pointer + keyboard: arrow keys move 5%; `role="slider"`, `aria-valuenow`; chips switch Dress/Set/Bag),
      `CostPerProduct` (numbers computed from `PLANS.shop_starter`: `$per photo = monthlyUsdCents / monthlyCredits`),
      `ShopHowItWorks`, `LooksGallery`, `ModelsShowcase` (Me vs Studio models; model faces appear only after P8 images exist — hide section until `hasManifestImage`),
      `MarketplaceFrames` (3 `PhoneFrame`s with generic labels), `AccuracyPromise` (mini `CompareRow`), `PostingResponsibly`,
      `PricingPreview` (shop plans), `FaqAccordion`, `FinalCtaBand`.

### 3.7 Pricing page (`src/components/marketing/pricing/`, `app/(marketing)/pricing/page.tsx`)
- [x] `ProductToggle` (URL `?for=professionals|shops`, default professionals), `TermToggle` (`SegmentedControl` 1/3/6, default 3),
      `PlanCard` (price per month for the term, "billed $X for N months", savings, features, CTA → `/start/{product}?plan={id}&term={n}`),
      `TopupsRow`, `ComparisonTable` (horizontal scroll container on mobile), `HowBillingWorks` (3 steps: pay by QR · credits monthly · renew when you want), `FaqAccordion`.
- [x] Unit test for any price-rendering helper (`$51` / `$132` / `Save 20%`).

### 3.8 SEO & metadata
- [ ] Per-page `metadata` (title ≤ 60 chars, description ≤ 155) — e.g. "Next5 Brand — Monthly on-brand photos of you".
- [ ] `app/sitemap.ts` / `app/robots.ts` include business pages only when the flag is on (check Next 16 docs).
- [ ] Semantic landmarks, one `h1` per page, images `alt` from the manifest.

### 3.9 Analytics hooks
- [ ] Wire `track('landing_viewed')` and `track('cta_clicked')` via a no-op `src/lib/analytics.ts` (real provider in P9).

## Implementation notes (2026-09-14)

- 40 images generated with the web-imagery skill (FLUX-2-klein-9b) as **PNG** (skill output); all catalog/doc paths use `.png`.
  `shop/slider/set-after.png` was regenerated with the real Shop pipeline (nano-banana-2/edit, product photo as reference) because
  the first version didn't match the product. Dress/bag "after" images are still text-to-image — replace in P8.8.
- `MarketingImage` renders nothing if a path isn't in the manifest (no stand-in boxes). Copy lives in `src/content/business/marketing.ts`.
- Route group `app/(marketing)` with `assertBusinessEnabled()` in the layout; business home is at `/home-preview` until P11.
- Screenshots checked: `/brand` desktop, `/shop` 390 px light, `/pricing?for=shops` 390 px dark.
- Not done yet: 3.8 sitemap/robots (flag-aware) and 3.9 analytics (P9 provider). Per-page metadata is done.

## Acceptance criteria

- With the flag on: `/brand`, `/shop`, `/pricing`, `/home-preview` render fully on 375 px, 768 px, 1280 px; light and dark.
- With the flag off: those routes return 404; `/` and `/photos` unchanged.
- Every price on every page equals `src/config/plans.ts` (changing a value in config changes all pages).
- No image path outside the manifest (`grep -o "/images/[^'\"]*" -r src | sort -u` all present in manifest).
- Lighthouse (mobile) ≥ 90 Performance, ≥ 95 Accessibility, ≥ 95 SEO on `/brand` and `/shop`.
- No fake testimonials, customer logos or invented statistics anywhere.

## Verification

```bash
NEXT5_BUSINESS_ENABLED=true npm run dev
node -e "const m=require('./public/images/manifest.json');const fs=require('fs');const used=[...new Set(require('child_process').execSync(\"grep -rhoE '/images/[A-Za-z0-9_./-]+' src app\").toString().split('\n').filter(Boolean))];console.log(used.filter(u=>!m['public'+u]))"
npm run build
```

## Cursor kickoff prompt

```
Implement Phase P3 (docs/business-studios/phases/phase-03-marketing-site.md).
Read first: docs/business-studios/01-product-spec.md §6, 03-ux-ui.md §1, §2, §5, 04-image-prompts.md, and
the primitives from P0 in src/components/ui. Check node_modules/next/dist/docs for route groups and metadata.
Task 3.1 (images) must be complete before any component references an image. Build shared pieces (3.2, 3.3)
first, then Brand (3.5), Shop (3.6), Pricing (3.7), Home preview (3.4). Keep every file under 400 lines by
splitting sections into components. English only, US style, dark mode, mobile-first. Tick checkboxes as you go.
```
