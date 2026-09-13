# 03 — UX / UI

Existing system: `docs/design-system.md` (tokens in `app/globals.css`), `docs/components.md`.
This document **extends** it for the business product. Where it conflicts, this file wins for
business surfaces only (`/`, `/brand`, `/shop`, `/pricing`, `/start/*`, `/app/*`). `/photos` and
`/studio` keep their current look.

---

## 1. What "US style" means here (concrete rules)

| Area | Rule |
|---|---|
| Language | American English, sentence case headings ("Build your set"), no ALL-CAPS headings. `label-caps` only for small eyebrows and badges. |
| Money | `$19/mo`, `$0.63 per photo`, `Save 20%`. VND appears only inside the checkout sheet. |
| Dates | `Sep 14, 2026`; relative for recent items ("2 min ago"). |
| Pricing page | Side-by-side plan cards with a **term toggle** (1 mo · 3 mo · 6 mo), a feature comparison table, and an FAQ. One plan marked *Most popular*. |
| CTAs | Verb-first and specific: "Start free — get 3 photos", "Generate 16 photos", "Renew for $19". Primary CTA repeated in hero, mid-page and footer. |
| Header | Logo · Product links (For professionals · For shops · Pricing) · `Log in` (text) · primary CTA button. Sticky, blurred background after scroll. |
| Trust | Specific numbers and guarantees ("Free redo if it doesn't look like you"), a privacy row (face data, AI labels, delete anytime). **No fake testimonials, no fake customer logos, no invented stats.** Proof sections render only from real data; until then, show the guarantee + sample outputs labelled "Sample made with Next5". |
| Product proof | Show the product: UI mock frames (built in HTML/CSS, not screenshots) containing real sample outputs. |
| Density | Marketing: generous whitespace, max text width 640 px. App: denser — 14 px body, compact tables, 8 px grid. |
| Forms | Labels above inputs, helper text below, inline validation on blur, never placeholder-as-label. |

---

## 2. Tokens & theming

### 2.1 Type

| Role | Face | Where |
|---|---|---|
| Display | Cormorant Garamond 500, sentence case, `tracking-[-0.01em]` | Marketing H1/H2 only |
| UI & body | Inter 400/500/600 | Everything else, including app page titles (Inter 600) |
| Numbers | Inter with `tabular-nums` | Prices, credits, counters, tables |

Scale (business): `12 · 13 · 14 · 16 · 18 · 22 · 28 · 36 · 48 · 60`. Marketing H1 `text-[40px] sm:text-[52px] lg:text-[60px] leading-[1.05]`; app page title `text-[22px] font-semibold`.

### 2.2 Colour — semantic tokens (add to `app/globals.css`)

Add these **new** tokens inside `@theme` (existing tokens unchanged):

```css
@theme {
  /* business surfaces */
  --color-app-bg: #fbfaf8;
  --color-app-panel: #ffffff;
  --color-app-sunken: #f4f1ec;
  --color-app-ink: #1f1c19;
  --color-app-muted: #6b635a;
  --color-app-line: #e7e1d8;
  --color-app-accent: #b8683f;        /* CTA, focus ring, active nav */
  --color-app-accent-ink: #ffffff;
  --color-app-accent-soft: #f6e8df;
  --color-app-success: #3f7a52;
  --color-app-warning: #a8741f;
  --color-app-danger: #b2463a;
  --color-app-info: #4d6a8c;
}
```

Dark values are applied **only inside business surfaces** so `/photos` never changes:

```css
@media (prefers-color-scheme: dark) {
  [data-surface='business'] {
    --color-app-bg: #141210;
    --color-app-panel: #1c1916;
    --color-app-sunken: #24201c;
    --color-app-ink: #f1ebe3;
    --color-app-muted: #aaa093;
    --color-app-line: #36302a;
    --color-app-accent: #e09a72;
    --color-app-accent-ink: #1a1512;
    --color-app-accent-soft: #3a2a20;
    --color-app-success: #7fb58f;
    --color-app-warning: #d8aa5a;
    --color-app-danger: #de8579;
    --color-app-info: #9db5d3;
  }
}
```

- Every business layout root renders `<div data-surface="business" className="bg-app-bg text-app-ink">`.
- Components use `bg-app-panel`, `border-app-line`, etc. Use `dark:` variants for what tokens can't
  express: shadows (`shadow-sm dark:shadow-none`), image scrims (`bg-black/30 dark:bg-black/50`),
  borders on photos (`ring-1 ring-black/5 dark:ring-white/10`).
- Theme follows the OS (no toggle in v1).

### 2.3 Shape, elevation, motion

- Radius: controls `rounded-xl`, cards `rounded-2xl`, pills `rounded-full`, images inside cards `rounded-xl`.
- Elevation: cards `border border-app-line shadow-sm`; overlays `shadow-lg`. No stacked shadows.
- Motion: `transition-colors duration-200` on all interactive elements; sheets/dialogs reuse
  `animate-sheet-in`; skeleton shimmer `animate-pulse`; everything respects `prefers-reduced-motion`.
- Focus: `focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 ring-offset-app-bg`.

---

## 3. Component inventory

Build in P0 under `src/components/ui/` (named exports, props typed, dark-mode ready).
Each gets an entry in `docs/components.md`.

| Component | Notes |
|---|---|
| `AppButton` | variants `primary · secondary · ghost · danger`, sizes `sm · md · lg`, `loading` state with spinner, `iconLeft/Right` |
| `Card`, `CardHeader`, `CardBody`, `CardFooter` | |
| `Badge` | tones `neutral · accent · success · warning · danger · info` |
| `Chip` / `ChipGroup` | selectable (single/multi) — formats, industries, reasons |
| `SegmentedControl` | term toggle, format tabs |
| `Tabs` | URL-synced optional |
| `Field`, `TextInput`, `Select`, `Textarea`, `ColorInput` | label, helper, error |
| `Checkbox`, `Radio`, `Switch` | |
| `Stepper` | onboarding & batch wizard (horizontal desktop, compact "Step 2 of 6" mobile) |
| `ProgressMeter` | credits used / total, with warning tone under 20% |
| `Skeleton` (`SkeletonText`, `SkeletonCard`, `SkeletonGrid`) | |
| `EmptyState` | SVG illustration slot (hand-written SVG), title, body, action |
| `ErrorState` | message, retry action, support link |
| `Dialog`, `Sheet` (bottom sheet on mobile, right drawer on desktop) | uses existing `useFocusTrap`, `useLockBodyScroll` |
| `Toast` + `useToast` | success / error, 4 s, `aria-live="polite"` |
| `FileDrop` | multi-file, previews, per-file error; wraps logic from `booking/upload/PhotoDropzone.tsx` |
| `ImageTile` | image + hover actions (favourite, download, redo, more), status overlay (queued / generating / failed) |
| `ImageGrid` | responsive masonry-free grid by aspect ratio |
| `CompareRow` | product original pinned left + scrollable generated shots right |
| `PriceTag` | USD formatting, strike-through for discounts, `/mo` suffix |
| `Kbd`, `Tooltip`, `Avatar`, `Divider` | small primitives |

Feature components live under `src/components/app/{dashboard,batches,sets,products,billing,settings,onboarding}`,
`src/components/marketing/{home,brand,shop,pricing,shared}`, `src/components/checkout/`.

---

## 4. Global state rules (every async view)

| State | Pattern |
|---|---|
| Loading (first load) | Skeleton matching final layout (never a lone spinner for page content) |
| Loading (action) | Button `loading` state; disable duplicate submits |
| Empty | `EmptyState` with one clear action |
| Error (fetch) | `ErrorState` inline with Retry; keep previously loaded data visible if any |
| Error (action) | Toast + inline field errors when applicable |
| Partial (batch) | Tiles show per-item status; batch header shows "12 of 16 ready" |
| Offline | Toast "You're offline — we'll retry when you're back" (polling pauses) |

---

## 5. Marketing wireframes

### 5.1 Home `/`

```
┌────────────────────────────────────────────────────────────────────┐
│ NEXT5   For professionals  For shops  Pricing        Log in [Start]│
├────────────────────────────────────────────────────────────────────┤
│  Photos of you that work as hard as you do.          ┌──────┐┌────┐│
│  On-brand photos for professionals and on-model      │brand ││shop││
│  photos for online shops — every month.              │hero  ││hero││
│  [For professionals →]  [For online shops →]         └──────┘└────┘│
├────────────────────────────────────────────────────────────────────┤
│  ┌── For professionals ────────┐  ┌── For online shops ──────────┐ │
│  │ image                        │  │ image (before → after)        │ │
│  │ A month of on-brand photos   │  │ Every new product, worn and   │ │
│  │ of you.  From $19/mo         │  │ ready to post.  From $15/mo   │ │
│  │ [See Brand Studio]           │  │ [See Shop Studio]             │ │
│  └──────────────────────────────┘  └───────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────┤
│  How it works (3 steps, shared)  ·  Guarantees row  ·  Privacy row  │
│  FAQ (6)  ·  Final CTA  ·  "Personal photoshoot? → Next5 Photos"    │
│  Footer: products · pricing · legal · Log in                        │
└────────────────────────────────────────────────────────────────────┘
Mobile: hero images stack under text; product cards full-width; sticky bottom CTA "Start free".
```

### 5.2 Brand `/brand` — section order

1. **Hero** — H1/sub/CTA (01-spec §6) + UI mock frame: phone showing a 3×3 grid of Brand samples; "Sample made with Next5" caption.
2. **The old way vs Next5** — two-column table: Photographer ($1,200+ / shoot, 1–2×/year, same 30 photos) vs Next5 (from $19/mo, new photos monthly, your set).
3. **How it works** — ① Upload 3 selfies (image `brand-step-selfies`) ② Build your set (template tiles) ③ Get your monthly drop (theme covers).
4. **Sets gallery** — 6 template cards (cover, name, one-line look). Hover: "Use this set".
5. **A theme every month** — horizontal scroller of theme covers with month labels (Oct · Just Listed …).
6. **Made for your industry** — tabs: Real estate · Coaching · Beauty & wellness · Fitness · Finance; each tab = image + 3 bullet use cases.
7. **Every format** — 4 frames (4:5, 9:16, 1:1, 3:4) with the same sample.
8. **Guarantees** — Likeness redo · Cancel = just don't renew · Delete your face data anytime · AI label built in.
9. **Pricing preview** — Brand Starter / Pro cards + link to /pricing.
10. **FAQ** (8): Will it look like me? · What do I upload? · Who owns the photos? · Can I use them for ads? · How do I pay? · What happens when my plan ends? · Is my face data safe? · Do I have to label them as AI?
11. **Final CTA** band.

### 5.3 Shop `/shop` — section order

1. **Hero** — H1/sub/CTA + interactive **before/after slider** (flat-lay ↔ on-model), 3 samples switchable by chips (Dress · Set · Bag).
2. **Cost per product** — "A model shoot for 10 items" vs "Next5: 30 photos for ~$9" (derived from plan config, not hard-coded).
3. **How it works** — ① Upload product photos (image `shop-step-upload`) ② Pick model & shop look ③ Download in every format.
4. **Shop looks** — 6 look cards.
5. **Models** — "Wear it yourself" (selfie guide) vs "Studio models" (6 model portraits, name + one line).
6. **Built for marketplaces** — 3 phone frames (1:1 listing · 9:16 video cover · 4:5 feed), generic UI, **no real platform logos or UI clones**; label text only ("TikTok Shop listing", etc.).
7. **Accuracy promise** — "If the garment doesn't match, redo it free." + mini compare-row visual.
8. **Posting responsibly** — AIGC label, match the real product, keep real feedback photos real.
9. **Pricing preview** — Shop Starter / Pro.
10. **FAQ** (8): Which photos work best? · Can I use my own face? · Will colours and prints match? · Formats? · Can I sell on TikTok Shop with these? · How do I pay? · Bulk uploads? · Data & deletion.
11. **Final CTA**.

### 5.4 Pricing `/pricing`

```
Simple plans. Prepaid. No surprises.
[ For professionals | For online shops ]      term: ( 1 mo | 3 mo −10% | 6 mo −20% )
┌ Starter ───────────┐ ┌ Pro · Most popular ─┐
│ $19 /mo            │ │ $49 /mo             │
│ billed $51 for 3mo │ │ billed $132 for 3mo │
│ 30 photos / month  │ │ 90 photos / month   │
│ 2 sets …           │ │ 5 sets · 2K · captions│
│ [Start free]       │ │ [Start free]        │
└────────────────────┘ └─────────────────────┘
Top-ups: 20 · $6   60 · $15   150 · $32   (valid 12 months)
Compare table · How billing works (bank transfer QR, no auto-charge, renewal reminders) · FAQ
```

Prices always computed from `src/config/plans.ts` (`getTermPrice(planId, termMonths)`).

---

## 6. Checkout sheet (`src/components/checkout/CheckoutSheet.tsx`)

```
┌ Renew Brand Pro · 3 months ───────────────────── ✕ ┐
│ $132.00  (you save $15)                             │
│ You'll transfer 3,432,000₫ at 26,000₫/$             │
│ ┌───────────┐  Bank      MB Bank          [Copy]    │
│ │  QR code  │  Account   0123456789       [Copy]    │
│ │           │  Name      NEXT5 …          [Copy]    │
│ └───────────┘  Amount    3,432,000₫       [Copy]    │
│                Memo      N5K7QX2M9A       [Copy]  ← must include │
│ ⏱ Waiting for your transfer · 28:41                 │
│ ● pending → ✓ Payment received → Credits added      │
│ Scan with your banking app. Keep the memo exactly.  │
└──────────────────────────────────────────────────────┘
States: creating (skeleton) · waiting · paid (success + CTA) · underpaid (amount missing, contact) ·
expired (Generate new QR) · error (Retry).
Mobile: full-height bottom sheet; "Open banking app" hint; QR also downloadable (long-press save).
```

Reuse `booking/payment/CopyField.tsx` and `booking/ui/QrPlaceholder.tsx` visuals.

---

## 7. Onboarding `/start/[product]` (Stepper, one step per screen, progress saved server-side)

| Step | Brand | Shop |
|---|---|---|
| 1 Account | Email, first name, business name, industry (chips), Instagram/Facebook handle (optional) → creates user, workspace, session | Email, first name, shop name, category (Fashion · Accessories · Mixed), shop handle |
| 2 Consent | Checkbox: "These are photos of me and I agree to Next5 processing my face to create images" · Terms · AI label notice | Same (face consent only shown if they choose "Me" in step 3) |
| 3 Identity | Upload 3 selfies with a live checklist: front / slight left / slight right · good light · no sunglasses · only you. Show good/bad example images. | Choose **Wear it yourself** (2 selfies + 1 full body) or **Studio model** (grid of 6 → pick 1) |
| 4 Set | Pick a template → pick locations (1–3) → wardrobe → brand colours (optional) | Pick a shop look → Shop: add first product (front photo + name + category) |
| 5 Trial | "Generating your 3 free photos…" progress (reuse `booking/preview/GenerationProgressBar.tsx` feel), then results grid with redo | 1 product × listing pack (3 shots), compare view |
| 6 Plan | Plan cards with term toggle → CheckoutSheet; secondary link "Not now — go to my workspace" | Same |

Rules: back navigation allowed except during generation; each step validates before Continue;
refresh resumes at the last completed step (`GET /api/app/me` returns `onboardingStep`).

Mobile identity capture: `<input type="file" accept="image/*" capture="user">` for selfies,
`capture="environment"` for products and full-body.

---

## 8. App shell `/app`

```
Desktop (≥1024px)
┌────────────┬───────────────────────────────────────────────────────┐
│ NEXT5      │  Page title                   [ 24 / 90 photos ▮▮▯ ]  │
│ Brand ▾    │                               [+ Create]   (avatar)   │
│            ├───────────────────────────────────────────────────────┤
│ ◻ Home     │                                                       │
│ ✚ Create   │   page content                                        │
│ ▦ Library  │                                                       │
│ ◈ Sets     │                                                       │
│ ▤ Products │ (Shop only)                                           │
│ $ Billing  │                                                       │
│ ⚙ Settings │                                                       │
│ ─────────  │                                                       │
│ Plan: Pro  │                                                       │
│ ends Oct 14│                                                       │
└────────────┴───────────────────────────────────────────────────────┘
Mobile: top bar (logo · credits pill · avatar) + bottom tab bar: Home · Create (center, accent) · Library · Sets/Products · More(Billing, Settings)
Banners (top of content, dismissible per session): trial-not-converted · renewal ≤7 days · low credits <20% · payment underpaid
```

Icons: hand-written SVG in `src/components/ui/Icons.tsx` (extend the existing file; split if > 600 lines).

### 8.1 Dashboard (Brand)

```
Good morning, Linh
┌ This month ───────────────┐ ┌ October theme: Just Listed ─────────┐
│ 24 of 90 photos left       │ │ cover image                          │
│ ▮▮▮▮▮▮▯▯▯  resets Oct 14   │ │ 8 scenes · [Create with this theme]  │
│ [Top up]                    │ └──────────────────────────────────────┘
└────────────────────────────┘
Recent batches  (cards: cover mosaic, name, "16 photos · ready", date)       [View all]
Your sets       (small tiles + "New set")
Empty (no batches): EmptyState "Create your first batch — it takes about 5 minutes."
```

### 8.2 Dashboard (Shop)

Same credit card; replace theme card with **"Products waiting for photos"** (products added but
never used, max 8 thumbs, [Create photos for these]); recent drops; shop looks.

### 8.3 Create — Brand (`/app/create`, Stepper in-page)

```
1 Set      [tiles of her sets]                       (preselect last used)
2 Theme    Featured this month (large) + library grid
3 Amount   (8) (16) (24) (32) photos
4 Formats  [✓ Instagram feed 4:5] [✓ Stories 9:16] [ Square 1:1] [ Portrait 3:4]
           ☐ High-res 2K (2 credits each) — Pro
Summary bar (sticky bottom): 16 photos × 2 formats = 32 credits · you have 54 → 22 after
                            [Generate 32 photos]
Insufficient: bar turns warning → [Top up] [Upgrade] ; Generate disabled
```

Amount semantics: "16 photos" = 16 scene variations; each selected format multiplies the credits.
The summary always shows the multiplication explicitly.

### 8.4 Create — Shop

```
1 Products  grid with checkboxes · filter "Not photographed yet" · [+ Add products]
2 Model     Me | Studio model (if Pro: pick; Starter: shows chosen one)
3 Look      shop look tiles
4 Pack      (Listing · 3 shots) (Full · 5 shots)   accessories auto-use Accessory pack (note)
5 Formats   same chips as brand
Summary: 12 products × 3 shots × 1 format = 36 credits · [Generate 36 photos]
```

### 8.5 Batch results — Brand (`/app/batches/[id]`)

```
Just Listed · Sep 14        16 of 16 ready · 2 formats      [Download all ⤓]
[ Instagram feed 4:5 | Stories 9:16 ]          [Select]  filter: ★ favourites
grid of ImageTile (hover/tap: ★  ⤓  ↻ Redo  ⋯ Copy caption)
Redo dialog: reason chips (Doesn't look like me · Bad pose/hands · Wrong vibe · Other) + optional note
Select mode: checkbox on tiles, sticky bar "6 selected · Download · Unfavourite"
While generating: tiles show shimmer + "Generating…"; header progress bar; page safe to leave ("We'll email you when it's done")
```

### 8.6 Batch results — Shop compare view

```
Drop · Sep 14, 2026     34 of 36 ready            [Download all ⤓]
┌ Linen set — beige · SKU LS-03 ─────────────────────────────── [⤓ zip] ┐
│ ┌original┐ │ ┌full body┐ ┌half body┐ ┌detail┐                         │
│ │ front  │ │ │         │ │         │ │      │   ← horizontal scroll   │
│ │ photo  │ │ └─────────┘ └─────────┘ └──────┘     on mobile            │
│ └────────┘ │  ★ ⤓ ↻      ★ ⤓ ↻       ⚠ Failed · Retry                  │
└──────────────────────────────────────────────────────────────────────┘
Redo reasons (Shop): Doesn't match product · Doesn't look like me/model · Bad pose/hands · Other
Tap image → Lightbox (reuse ui/ImageLightbox.tsx) with side-by-side original on desktop, swipe on mobile.
Visible AI tag toggle lives in Settings; badge on header shows "AI tag: on".
```

### 8.7 Products `/app/products`

Grid of product cards (front photo, name, category badge, "Photographed 2×" / "New"), search,
filter by category/status, [+ Add products]. **Add products sheet:** step 1 drop up to 20 front
photos → step 2 table (one row per photo: thumbnail · name · category · colour · SKU · fit) with
"apply category to all" → Save. Row-level: add back/detail photo. Validation: name + category
required. Empty state: "Add your first products — a clear front photo on a plain background works best."

### 8.8 Sets `/app/sets`, `/app/sets/new`, `/app/sets/[id]`

List: set cards (cover = first generated image or template cover, name, locations count,
"Used in 3 batches"). Limit reached → card "Upgrade to Pro for 5 sets". Builder = same UI as
onboarding step 4 in a page, plus "Preview 1 photo (1 credit)". Detail: rename, edit choices
(affects future batches only), archive.

### 8.9 Library `/app/library`

Filters row (set · theme/product · format · favourites · date), infinite scroll grid, select mode
+ bulk download (server zip, max 200). Empty state as above.

### 8.10 Billing `/app/billing`

```
Current plan  Brand Pro · 3 months · Sep 14 → Dec 14, 2026   Next credits: Oct 14 (+90)
[Renew / extend]  [Change plan]
Credits: 54 available (plan 44 · top-up 10) · next expiry Oct 14 (44)
Top-ups: 20 · $6 [Buy]  60 · $15 [Buy]  150 · $32 [Buy]
Payments table: Date · Item · USD · VND · Status badge · Reference
Pending payment row → [Resume] reopens CheckoutSheet
```

### 8.11 Settings `/app/settings` + `/app/settings/privacy`

Profile (name, email read-only) · Business (name, handle, industry, brand colours) · Output
(visible AI tag switch, default formats) · Identity photos (thumbnails, replace, delete) ·
Privacy: download my data (zip of identity + generated), **Delete my face data** (confirm dialog
with typed "DELETE"; explains that future batches need new photos), delete account (contact support in v1).

---

## 9. Accessibility checklist (per screen)

- All images have meaningful `alt` (generated outputs: "{theme/product} — {scene/shot}, {format}").
- Keyboard: every action reachable; grid tiles are buttons; Esc closes dialogs; focus returns to trigger.
- Colour contrast ≥ 4.5:1 for text in **both** themes (check `app-muted` on `app-sunken`).
- `aria-live` for generation progress ("12 of 16 photos ready").
- Touch targets ≥ 44 px on mobile; bottom bars respect `env(safe-area-inset-bottom)`.
- Forms: errors linked via `aria-describedby`.
