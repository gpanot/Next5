# Next5 Onboarding — UI/UX Brief

> **Purpose:** This document describes the current state of the onboarding wizard so a designer or LLM can audit and optimise the UX.  
> **Product lines covered:** `brand` (brand studio) and `shop` (shop studio). Steps 3 & 4 differ between the two; all others are shared.  
> **Live URL:** `https://next5.giinger.com/start/brand` (brand) or `/start/shop` (shop)

---

## Architecture at a glance

```
/start/[product]  →  <OnboardingWizard product="brand|shop">
                        ├── <Stepper>        (header — horizontal steps desktop, "Step N of M" mobile)
                        └── <StepCard>       (shared card shell — title, sub-title, children, footer)
                             └── [Step component]
```

- **State machine:** A single integer (`onboardingStep`) lives on the server (DB). The client advances it via `PATCH /api/app/onboarding/step`. The wizard derives `current` from the server value; a `viewStep` override allows going back.
- **Back navigation:** Shown only between steps 3–5 (skips the consent step if already given, and hides on step 6 = plan).
- **Progress indicator:** `<Stepper>` at the top — horizontal labelled dots on desktop, compact "Step N of M" on mobile.
- **Step labels (always 6):** `['Account', 'Consent', 'Your photos', 'Your look', 'Free photos', 'Plan']`

---

## The 6 Steps

### Step 1 — Account (`AccountStep.tsx`)
**Component file:** `src/components/app/onboarding/AccountStep.tsx`  
**URL trigger:** First load of `/start/brand` or `/start/shop`

#### What it does
Creates the user account and the studio workspace. Handles three sub-cases:
1. **New visitor** — full form: email, first name, business/shop name, Instagram/TikTok/Facebook handle, industry or product category.
2. **Returning visitor (magic link clicked)** — form pre-filled from a localStorage draft; auto-submits if draft + session exist.
3. **Signed-in user adding a second studio** — no form at all; auto-creates the workspace from the existing profile and shows a "Setting up…" skeleton.

#### Current UI structure
- `<StepCard>` with title *"Let's set up your Brand Studio"* / *"Let's set up your Shop Studio"* and sub *"Takes about 3 minutes. Your first photos are free. No card needed."*
- **Form fields** (grid 2-col on sm+):
  - Email (hidden if already signed in)
  - First name (required)
  - Business name / Shop name (optional)
  - Instagram, TikTok or Facebook handle (optional)
  - *"What do you do?"* / *"What do you sell?"* — `<ChipGroup>` of industry / shop-category pills
- **CTA footer:** `Continue` button
- **Edge case banners:**
  - Expired magic link: amber info paragraph
  - Signed-in email display + "Not you?" link

#### Pain points / things to review
- 5 fields on a first screen can feel long — consider progressive disclosure or splitting email + name / business details.
- The chip group (industry/category) has no visual weight distinction between selected and unselected on small screens.
- "Optional" helper text is small and grey — easy to miss.
- No explicit step title/number visible in the card itself (only in the stepper above).

---

### Step 2 — Consent (`ConsentStep.tsx`)
**Component file:** `src/components/app/onboarding/ConsentStep.tsx`

#### What it does
Collects three checkboxes before any AI processing begins. If the user already gave consent (e.g. they're adding a second studio), this step is auto-skipped silently.

#### Current UI structure
- `<StepCard>` with title *"A few things before we start"* and sub *"We take your photos and your face seriously. Here is exactly what we do."*
- **Three `<Checkbox>` items:**
  1. *"These are photos of me"* — face processing consent (required for brand; optional for shop but shown if user will wear the products).
  2. *"I understand my photos are AI-generated"* — AI labelling consent (required).
  3. Terms of Service, Privacy Policy, AI & face data (required) — inline links open new tab.
- **CTA footer:** `Agree and continue` — disabled until all required checkboxes are ticked.

#### Pain points / things to review
- Checkbox 1 (face consent) is shown to shop users even when they pick a Studio model — the copy says "only needed if you'll wear the products yourself" but it still takes up space and can confuse.
- The three items look identical in weight; the key commitments (face data, AI labels) could benefit from visual hierarchy.
- No visual explanation of what "AI label" means for a normal user.
- The "Agree and continue" button being permanently disabled until all boxes are checked gives no feedback on which items are still needed.

---

### Step 3 — Your photos

> **Differs by product line.**

#### Brand — `BrandIdentityStep.tsx`
**Component file:** `src/components/app/onboarding/BrandIdentityStep.tsx`

##### What it does
Uploads 3 selfies that train the face model. At least 1 is required to continue.

##### Current UI structure
- `<StepCard>` with title *"Add three selfies"* and sub *"These teach Next5 what you look like. Three angles give the most accurate results."*
- **3 × `<PhotoSlot>`** labelled "Facing the camera", "Turned slightly left", "Turned slightly right" — tap/click to open camera/file picker.
- **Guide images row** — small thumbnails showing what good selfies look like (`GuideImages.tsx`).
- If the user already has identity photos: they can skip (Continue) or replace.
- **CTA footer:** `Continue`

##### Pain points / things to review
- Three slots in a row on mobile means each is very small (~100 px) — hard to confirm the photo is good.
- Guide images are small and may not be visible enough.
- No real-time feedback on photo quality (lighting, blur, angle).
- "Replace" action is implicit (just upload again) — not clear to users.

---

#### Shop — `ShopModelStep.tsx`
**Component file:** `src/components/app/onboarding/ShopModelStep.tsx`

##### What it does
The user chooses who will wear their products: themselves (upload selfies + a full-body photo) or a Studio model (pick from a grid of ~30 models).

##### Current UI structure
- `<StepCard>` with title *"Who wears your products?"* and sub *"Wear them yourself — your customers know your face — or pick a Studio model."*
- **2-option toggle** (card-style buttons): "Wear it yourself" (2 selfies + 1 full-body photo) vs "Studio model" (30 models, 6 per market).
- If **"Wear it yourself"** selected: `<SelfieFields>` appears below — selfie upload slots.
- If **"Studio model"** selected: `<ModelGrid>` — filter chips by ethnicity (All / [markets]), then a 3-col grid of model cards with face image, name, age, description. Selected model gets an accent ring + check badge.
- **CTA footer:** `Continue` — disabled until a selfie is ready or a model is selected.

##### Pain points / things to review
- The two mode cards ("Wear it yourself" / "Studio model") look similar — the distinction could be stronger visually.
- Studio model grid can be long with no pagination or search.
- Ethnicity filter chips can overflow on narrow screens.
- No preview of what "wearing it yourself" photos will look like in the final output.

---

### Step 4 — Your look

> **Differs by product line.**

#### Brand — `BrandSetStep.tsx`
**Component file:** `src/components/app/onboarding/BrandSetStep.tsx`

##### What it does
The user picks a visual style template and (optionally) customises it. This becomes their default "style" for all future photo batches.

##### Current UI structure
- `<StepCard>` with title *"Pick your style"* and sub *"Your style is your signature look. Every batch uses it, so your feed stays consistent."*
- **`<TemplateGrid>`** — 3-col grid of style template thumbnails; selecting one triggers a style options panel below.
- **`<StyleOptions>`** — appears inside a sunken panel when a template is selected; shows customisation options (colour, mood, etc.).
- If the user already has a style set, they can skip (Continue) or replace.
- **CTA footer:** `Save my style` (if a template is picked) or `Continue` (if skipping).

##### Pain points / things to review
- Template thumbnails are small in a 3-col grid — hard to evaluate aesthetic quality.
- No hover/expand preview for templates.
- The style options appearing inline below can be missed (requires scrolling on mobile).
- "Every batch uses it" is important — but the consequence of the choice isn't clearly telegraphed.

---

#### Shop — `ShopLookStep.tsx`
**Component file:** `src/components/app/onboarding/ShopLookStep.tsx`

##### What it does
Combines picking a style template AND adding the first product in one step. The product can come from an imported TikTok Shop or be added manually.

##### Current UI structure
- `<StepCard>` with title *"Pick your shop look and your first product"* and sub *"Your look keeps every product photo consistent. Pick one product to try it for free."*
- **`<TemplateGrid>`** — 3-col grid (only shown if no style is set yet).
- **`<SegmentedControl>`** — "Import from my TikTok Shop" vs "Add one by hand".
- If **"Import from TikTok Shop"** selected: `<StoreImportPicker>` (product picker from connected store).
- If **"Add one by hand"** selected: a sunken grid with:
  - `<PhotoSlot>` — front photo of the product (plain background required)
  - Product name (required), category `<Select>` (required), colour (optional)
  - Guide images below
- **CTA footer:** `Continue` — disabled until a template (or existing style) + product are both selected.

##### Pain points / things to review
- This step has the most cognitive load of all 6: style choice + product addition in one card.
- If TikTok Shop is not connected, the "Import" tab is still shown (likely falls back to an empty state or error).
- The photo slot ("one item, plain background") hint is very brief — users often submit non-compliant photos.
- Category dropdown has no search; if the list is long it's hard to navigate on mobile.
- Two required decisions (look + product) compound the risk of drop-off here.

---

### Step 5 — Free photos (`TrialStep.tsx`)
**Component file:** `src/components/app/onboarding/TrialStep.tsx`

#### What it does
Generates 3 free AI photos using the identity/model + style chosen in previous steps. The user can redo any photo for free. This step is the "aha moment" of the product.

#### Current UI structure
- `<StepCard>` with title *"Create your 3 free photos"* (before generation) or *"Your free photos"* (after).
- **Before generation:**
  - A `<Sparkles>` icon, a note *"It takes about a minute. You can redo any photo for free."*, and a `Create my free photos` button.
- **During generation:** `<Progress>` — a 3-stage progress list ("Studying your photos", "Setting up your look", "Directing your photos") with animated dots + "N of M photos ready" counter.
- **After generation:** 3 × photo tiles in a 3-col grid with:
  - Score badges (quality score per photo)
  - "Redo" button (free redos available)
  - Retry button for failed photos
  - Below: best-scored photo's "Post Kit" panel — AI caption, hashtags, score card — as a preview of the Growth tier feature.
- **CTA footer:** `Continue` (only after generation starts).

#### Pain points / things to review
- The `Create my free photos` CTA sits below a lot of text — it's not immediately obvious this is a button to press.
- The 3-stage progress list is informative but static-looking; a real progress bar or animated fill might feel more alive.
- If generation takes > 60 s, users may abandon — no estimated wait time shown.
- The post-kit "best photo" panel at the bottom is a paywall preview but appears without any explicit "this is a preview" framing — could create confusion.
- Failed photos show an inline error but no retry CTA in the main flow.
- On mobile the 3-col photo grid is small.

---

### Step 6 — Plan (`PlanStep.tsx`)
**Component file:** `src/components/app/onboarding/PlanStep.tsx`

#### What it does
Presents paid subscription plans. Payment is optional — users can skip to their workspace for free.

#### Current UI structure
- `<StepCard>` with title *"Keep creating every month"* and sub *"Prepaid by bank transfer. Nothing renews automatically."*
- **`<TermToggle>`** — monthly vs annual billing toggle (shared with marketing pricing page).
- **Plan cards grid** (2-col sm / 3-col lg):
  - Each card: plan name, price per month, credits/month + total billed, `Choose [Plan]` button.
  - Most popular plan highlighted with accent border + ring.
  - Pre-selects the plan passed via `?plan=` URL param (e.g. from the marketing page).
- **`<CheckoutSheet>`** — slides up when a plan is chosen; handles bank transfer checkout flow.
- **CTA footer (ghost variant):** *"Not now — go to my workspace"* — skips checkout and completes onboarding.

#### Pain points / things to review
- "Prepaid by bank transfer" is an unusual payment model; it's mentioned only in the subtitle and may cause confusion or trust issues.
- "Nothing renews automatically" is reassuring but positioned low and easy to skip.
- The skip CTA ("Not now") is a ghost button in the footer — less visible, but arguably correct to de-emphasise; still, users who are ready to pay need to clearly distinguish it from the plan CTAs.
- No free tier explanation — users who clicked "Not now" don't know what they get for free.
- No summary of what they've set up so far ("you're almost there, here's what you built").

---

## Shared components referenced in all steps

| Component | File | Role |
|---|---|---|
| `StepCard` | `onboarding/StepCard.tsx` | Rounded card shell with title, subtitle, children, footer |
| `Stepper` | `ui/Stepper.tsx` | Horizontal step indicator (desktop) / compact label (mobile) |
| `AppButton` | `ui/AppButton.tsx` | Primary/secondary/ghost CTA button |
| `Field` | `ui/Field.tsx` | Label + input wrapper with helper and error text |
| `TextInput` | `ui/TextInput.tsx` | Styled text input |
| `ChipGroup` | `ui/Chip.tsx` | Multi-select pill group (industry/category) |
| `Checkbox` | `ui/Checkbox.tsx` | Checkbox with rich label |
| `PhotoSlot` | `app/shared/PhotoSlot.tsx` | Tap-to-upload image slot with preview |
| `TemplateGrid` | `app/sets/steps/TemplateGrid.tsx` | 3-col selectable style template grid |
| `SkeletonText` / `SkeletonGrid` | `ui/Skeleton.tsx` | Loading placeholders |

---

## Design tokens used (Tailwind classes)

| Token | Meaning |
|---|---|
| `text-app-ink` | Primary text |
| `text-app-muted` | Secondary / helper text |
| `text-app-accent` | Brand accent (links, active states) |
| `bg-app-panel` | Card background |
| `bg-app-sunken` | Inset / sub-panel background |
| `border-app-line` | Default border |
| `text-app-danger` | Error text |
| `bg-app-cta` / `text-app-cta-ink` | CTA button fill |

---

## Known UX gaps (summary for the LLM)

1. **Step 1 is heavy** — 5 fields on first load. Consider splitting email collection from profile details, or lazy-loading non-essential fields.
2. **No progress feedback within steps** — only the stepper shows macro progress; there's no micro-feedback (e.g. "2 of 3 selfies added").
3. **Step 4 (Shop) combines two decisions** — style + product in one card causes the highest cognitive load in the flow.
4. **Step 5 has no time estimate** — the "aha moment" generation can feel long without a countdown.
5. **Step 6 doesn't recap** — users arrive at the plan screen with no summary of what they just built.
6. **Mobile photo grids are small** — 3-col grids result in ~100 px tiles on a 375 px screen; consider 2-col or full-width cards for photos.
7. **Back button is hidden on steps 1–2 and 6** — correct behaviour but may confuse users who expect it.
8. **Consent checkboxes have no partial-state feedback** — the CTA stays disabled with no hint of which boxes are still unticked.
9. **"Bank transfer" payment model** — non-standard; needs more explanation or trust signals at step 6.
10. **No exit intent handling** — refreshing or navigating away during step 3–5 may lose progress; only step 1 uses localStorage draft.
