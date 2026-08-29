# NEXT5 Photos — Component Catalog

> Every reusable component documented with its props, variants, and usage patterns.  
> See [`design-system.md`](./design-system.md) for the underlying token reference.

---

## Table of Contents

- [UI Primitives](#ui-primitives)
  - [Button / ButtonLink](#button--buttonlink)
  - [SectionHeading](#sectionheading)
  - [AvatarStack](#avatarstack)
  - [PlaceholderImage](#placeholderimage)
  - [Icons](#icons)
- [Layout](#layout)
  - [Logo](#logo)
  - [Header](#header)
  - [Footer](#footer)
- [Sections](#sections)
  - [Hero](#hero)
  - [SocialProofBar](#socialproofbar)
  - [HowItWorks](#howitworks)
  - [PhotoRoutes + RouteCard](#photoroutes--routecard)
  - [PolaroidStack](#polaroidstack)
  - [FinalCta](#finalcta)
- [Booking — Structure](#booking--structure)
  - [BookingModal](#bookingmodal)
  - [BookingProgress](#bookingprogress)
- [Booking — UI Atoms](#booking--ui-atoms)
  - [StepHeading](#stepheading)
  - [StepLayout / StepActions](#steplayout--stepactions)
  - [PriceTag](#pricetag)
  - [ChoiceChip](#choicechip)
  - [DirectorChoiceCard](#directorchoicecard)
  - [DirectorNote](#directornote)
  - [Field](#field)
  - [Calendar](#calendar)
  - [BookingSummary](#bookingsummary)
- [Booking — Studio Reveal (Confirmed step)](#booking--studio-reveal-confirmed-step)
  - [StudioReveal](#studioreveal)
  - [ShotTile](#shottile)
  - [ClosingNote](#closingnote)

---

## UI Primitives

### Button / ButtonLink

`src/components/ui/Button.tsx`

The single button primitive for all CTAs. Renders as `<button>` or `<a>` depending on the component used. Both share the same variant + size logic.

#### Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `variant` | `'accent' \| 'dark' \| 'outline'` | `'accent'` | Visual style |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Padding + font size |
| `withArrow` | `boolean` | `false` | Appends animated `ArrowRightIcon` |
| `fullWidth` | `boolean` | `false` | `w-full` |
| `rounded` | `'full' \| 'lg'` | `'full'` | Border radius |
| `className` | `string` | `''` | Extra Tailwind classes |
| All native `<button>` / `<a>` attrs | | | Spread through |

#### Variants

| Variant | Background | Text | Hover |
|---|---|---|---|
| `accent` | `bg-accent` (#d89873) | white | `bg-accent-strong` (#c37d55) |
| `dark` | `bg-ink-block` (#1a1714) | white | `bg-ink-block/85` |
| `outline` | transparent | white | `bg-white/10`, full white border |

> `outline` is only legible on dark/image backgrounds (hero overlays, dark modals).

#### Sizes

| Size | Padding | Font |
|---|---|---|
| `sm` | `px-4 py-2.5` | `text-[10px]` |
| `md` | `px-6 py-3` | `text-[11px]` |
| `lg` | `px-8 py-4` (→ `sm:px-9 sm:py-4.5`) | `text-xs` |

#### Shared behaviour

- `label-caps` utility always applied (uppercase, `letter-spacing: 0.18em`)
- `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`
- `disabled:cursor-not-allowed disabled:opacity-45`

#### Usage examples

```tsx
// Primary CTA
<ButtonLink href="#routes" size="lg" withArrow>Explore photo routes</ButtonLink>

// Dark CTA (e.g., header "Book now" — inline, not via Button component)
<ButtonLink href="#routes" variant="dark" size="md">Book now</ButtonLink>

// Booking step confirm
<Button variant="accent" size="md" fullWidth onClick={onNext}>Continue</Button>

// Outline on dark
<Button variant="outline" size="sm">Cancel</Button>
```

---

### SectionHeading

`src/components/ui/SectionHeading.tsx`

Centred section title used in light-background sections.

#### Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `title` | `string` | required | Rendered as `<h2>` |
| `subtitle` | `string` | `undefined` | Optional sub-line |
| `className` | `string` | `''` | Wrapper extra classes |

#### Style spec

- `h2`: `font-serif text-[26px] sm:text-[32px] lg:text-[34px] uppercase tracking-[0.1em] font-normal text-ink leading-tight`
- `subtitle`: `mt-3 text-[12.5px] sm:text-[13.5px] text-muted`

```tsx
<SectionHeading title="How it works" />
<SectionHeading title="Our photo routes" subtitle="Every route is curated for the best light." />
```

---

### AvatarStack

`src/components/ui/AvatarStack.tsx`

Overlapping circle portraits for social proof.

#### Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `sources` | `readonly string[]` | required | Image paths (max 5 looks good) |
| `size` | `'sm' \| 'md'` | `'md'` | `h-7 w-7` or `h-9 w-9` |
| `ringClassName` | `string` | `'ring-white'` | Ring colour adapts to background |

#### Ring colour rules

| Background | `ringClassName` |
|---|---|
| `page` / `cream` (light) | `ring-page` or `ring-cream` |
| `ink-block` (dark) | `ring-ink-block` |

```tsx
// Social proof bar (cream background)
<AvatarStack sources={avatarSources} size="md" ringClassName="ring-cream" />

// Final CTA (dark background)
<AvatarStack sources={avatarSources.slice(0, 4)} size="sm" ringClassName="ring-ink-block" />
```

---

### PlaceholderImage

`src/components/ui/PlaceholderImage.tsx`

Image with graceful fallback. Renders `<img>` when src resolves; renders a tonal gradient placeholder with a `PhotoIcon` on error.

#### Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `src` | `string` | required | Primary image URL |
| `fallbackSrc` | `string` | `undefined` | Tried before placeholder |
| `alt` | `string` | required | Accessible alt text |
| `label` | `string` | `undefined` | Shown in placeholder state |
| `className` | `string` | `''` | Wrapper div (controls size / aspect) |
| `imageClassName` | `string` | `''` | `<img>` classes (zoom, object-position) |
| `tone` | `'light' \| 'dark'` | `'light'` | Placeholder gradient palette |
| `loading` | `'lazy' \| 'eager'` | `'lazy'` | `loading="eager"` only for above-fold |

#### Tone values

| Tone | Gradient |
|---|---|
| `light` | `#efe6da → #e2d3c3 → #d8c6b4` (warm sand) |
| `dark` | `#3a322b → #282220 → #1d1815` (deep charcoal) |

```tsx
// Hero (eager, dark tone)
<PlaceholderImage src={heroImage} alt="…" tone="dark" loading="eager"
  className="absolute inset-0 h-full w-full"
  imageClassName="object-[62%_center] lg:object-center" />

// Route card
<PlaceholderImage src={route.image} alt={`${route.title} photo route`}
  label={route.imageLabel}
  className="aspect-[1/1.05] w-full"
  imageClassName="transition-transform duration-700 group-hover:scale-105" />
```

---

### Icons

`src/components/ui/Icons.tsx`

All icons are 24×24 SVG, `stroke="currentColor"`, `strokeWidth={1.5}`, rounded caps/joins.
Coloured by `text-*` on the parent or the icon itself. Never embed a hex colour inside an icon.

Full icon list with typical usage:

| Export | Typical context |
|---|---|
| `ArrowRightIcon` | Button arrow, route card CTA row |
| `SparkleIcon` | Hero badge |
| `WhatsAppIcon` | Header icon button, footer link |
| `TicketIcon` | Hero feature (venue fees) |
| `SunIcon` | Hero feature (best light) |
| `CameraIcon` | Hero feature, How It Works step 4 |
| `CloudIcon` | Hero feature (weather reschedule) |
| `HeartIcon` | Route card save/favourite (has `filled` prop) |
| `MapPinIcon` | Route card meta |
| `ClockIcon` | Route card meta |
| `StarIcon` | Social proof star rating (filled, `fill="currentColor"`) |
| `GiftIcon` | Available for promo / gift contexts |
| `PhoneCheckIcon` | How It Works step 1 |
| `CalendarIcon` | How It Works step 2, date picker |
| `CardIcon` | How It Works step 3 |
| `PhotoIcon` | How It Works step 5, image placeholder |
| `MenuIcon` | Mobile nav open |
| `CloseIcon` | Mobile nav close, modal close |
| `ChevronDownIcon` | Expandable rows, accordions |

---

## Layout

### Logo

`src/components/layout/Logo.tsx`

Wordmark-only logotype. Always a link to `#top`.

#### Props

| Prop | Type | Default |
|---|---|---|
| `className` | `string` | `'text-white'` |

Two states only:

```tsx
<Logo className="text-white" />  // Hero / transparent header
<Logo className="text-ink" />    // Scrolled header, footer
```

---

### Header

`src/components/layout/Header.tsx`

Fixed top navigation. Transparent over hero, becomes `bg-page/90 backdrop-blur-md` after scroll ≥ 60 px (via `useScrolled` hook). Mobile menu toggle with slide-down nav.

Key classes:
- Container: `h-18 max-w-[1240px] px-5 sm:px-8 lg:px-10`
- Nav links: `text-[13px]` with animated underline
- WhatsApp icon button: `h-10 w-10 rounded-full border`
- CTA pill: `label-caps rounded-full bg-ink-block px-6 py-3 text-[10px]`

Mobile menu: `border-t border-line bg-page`, links as `font-serif text-lg`.

---

### Footer

`src/components/layout/Footer.tsx`

Minimal three-column footer (Logo / Nav + WhatsApp / Copyright) on desktop; stacked on mobile.

Background: `bg-cream`, top border: `border-t border-line`.

---

## Sections

### Hero

`src/components/sections/Hero.tsx`

Full-bleed image hero with dual gradient overlay, headline, feature list, and CTA.

Layout spec:
- `min-h-[620px] lg:h-[92vh] lg:max-h-[860px]`
- Content container: `max-w-[640px]`
- Headline: `font-serif text-[42px] sm:text-[56px] lg:text-[64px] xl:text-[70px] leading-[1.04] font-light text-white`
- Italic accent line: `text-[#e8cfb5] italic` (target token: `--color-accent-light`)
- Feature grid: `grid-cols-2 sm:flex` gap pattern, icons `h-5 w-5 text-white/80`

---

### SocialProofBar

`src/components/sections/SocialProofBar.tsx`

Thin bar between sections. `bg-cream border-y border-line`. Renders star rating + avatar stack + "Loved by 200+" copy side by side.

---

### HowItWorks

`src/components/sections/HowItWorks.tsx`

Numbered 5-step flow on `bg-surface-alt`. Steps use `<ol>` with `grid-cols-1 sm:grid-cols-2 lg:grid-cols-5`.

Step anatomy:
- Badge circle: `h-8 w-8 rounded-full bg-[#eee0d1] font-serif text-[13px]`
- Icon: `h-9 w-9 text-ink strokeWidth={1.2}`
- Connector: dashed `h-px border-t border-dashed border-ink/25` + arrow head, visible only at `lg:`
- Title: `label-caps text-[11px] font-medium text-ink`
- Description: `text-[11.5px] leading-[1.6] text-muted`

---

### PhotoRoutes + RouteCard

`src/components/sections/PhotoRoutes.tsx` + `src/components/sections/RouteCard.tsx`

Grid of route cards. Each card is an `<article>` with:

```
rounded-xl border border-line bg-page shadow-card
hover:-translate-y-1 hover:shadow-[0_20px_40px_-20px_rgb(34_31_28/0.35)]
transition-all duration-300
```

Card anatomy:
- Overlay hit-target `<button>` at `z-10` for full-card clickability
- Image: `aspect-[1/1.05]` with `group-hover:scale-105 duration-700`
- Route number badge: `h-8 w-8 rounded-full bg-white/95 font-serif text-[12px]`
- Heart save button: `h-8 w-8 rounded-full bg-white/95 z-20` (above hit-target)
- Title: `font-serif text-[16px] tracking-[0.07em] uppercase text-ink`
- Description: `text-[12.5px] leading-[1.55] text-muted`
- Meta row: icon `h-3.5 w-3.5 text-ink/55`, text `text-[11.5px] text-muted`
- Price: `font-serif text-[19px]` — value in `text-gold`, unit `text-ink`
- CTA row: `label-caps inline-flex rounded-lg bg-ink-block text-[10px] text-on-dark`

---

### PolaroidStack

`src/components/sections/PolaroidStack.tsx`

Decorative stacked polaroid photos for the FinalCta section.

---

### FinalCta

`src/components/sections/FinalCta.tsx`

Dark-background CTA block inside `bg-page` section.

Block: `rounded-2xl bg-ink-block px-6 py-12 lg:px-14`

Typography:
- Headline: `font-serif text-[30px] sm:text-[36px] lg:text-[40px] leading-[1.15] font-light text-on-dark`
- Subline: `text-[14px] sm:text-[15px] text-on-dark-muted`

---

## Booking — Structure

### BookingModal

`src/components/booking/BookingModal.tsx`

Full-screen modal (`presentationStyle="fullScreen"` equivalent via portal). Renders backdrop + sheet panel.

- Backdrop: `animate-fade-in`
- Panel: `animate-sheet-in`
- Close button uses `CloseIcon`

### BookingProgress

`src/components/booking/BookingProgress.tsx`

6-segment progress bar shown at the top of the modal. Hidden on the `confirmed`
step — there is no further progress to make.

- Current segment: `bg-accent`; completed: `bg-accent/45`; upcoming: `bg-line`
- Segment height: `h-[3px]`
- Desktop (`sm:`) shows a `label-caps text-[8.5px]` caption under every segment,
  so the user can see the whole journey and where they are in it
- Mobile shows one line instead: `Step n of 6 · Label`
- A visually hidden `aria-live` line announces each step change
- Transition: `transition-colors duration-500`

---

## Booking — UI Atoms

### StepHeading

`src/components/booking/ui/StepHeading.tsx`

Modal step title block.

| Prop | Type | Notes |
|---|---|---|
| `eyebrow` | `string?` | `label-caps text-[9.5px] text-accent-strong` |
| `title` | `string` | `font-serif text-[26px] sm:text-[30px] uppercase tracking-[0.08em]` |
| `subtitle` | `string?` | `text-[13px] sm:text-[13.5px] text-muted` |

### StepLayout / StepActions

`src/components/booking/ui/StepLayout.tsx`

The shell every booking step renders through. The scroll area and the action bar
are **siblings in a flex column**, not nested — a `sticky bottom-0` footer inside
the scroller pins itself over whatever is mid-scroll beneath it, which used to
hide the email field on `upload` and the booking ID on `confirmed`.

| Prop | Type | Notes |
|---|---|---|
| `children` | `ReactNode` | Scrolling content |
| `footer` | `ReactNode?` | Persistent action bar; never overlaps content |
| `centered` | `boolean?` | Vertically centres short steps |

- Resets scroll to the top on mount, so each step starts at its heading
- Footer respects `env(safe-area-inset-bottom)`

`StepActions` is the standard footer body: `hint` on the left (price or
reassurance), `children` on the right (the CTA). Stacks on mobile.

**Every step that has a primary action must supply one** — the price and the CTA
stay on screen at all times, including on `studio`, `preview` and `purchase`
where they previously sat below the fold.

### PriceTag

`src/components/booking/ui/PriceTag.tsx`

Consistent price display for action bars.

| Prop | Type | Notes |
|---|---|---|
| `amountVnd` | `number` | Rendered via `formatVnd` |
| `note` | `string?` | Supporting line, `text-[11.5px]` |
| `tone` | `'light' \| 'dark'` | `dark` for use on `ink-block` |

### ChoiceChip

`src/components/booking/ui/ChoiceChip.tsx`

Multi-select option used by the `intention` step.

- Selected: `border-accent-strong bg-accent/12` + filled check disc + `aria-pressed`
- Unselected: `border-line bg-surface` + empty ring
- Laid out on a grid (1 / 2 / 3 columns), never `flex-wrap` — ragged rows read as
  broken rhythm at this size

### DirectorChoiceCard

`src/components/booking/style/DirectorChoiceCard.tsx`

One of the two creative directors offered on the `style` step.

**Two controls, not one** — they cannot nest, so the card itself is a plain `div`:
- The work area opens the portfolio full screen at `initialScale={2}`
- The name row selects the director (`aria-pressed`)

- Selected: `border-accent-strong bg-accent/[0.06]` + filled check disc
- The portfolio asset is a **square 3×3 contact sheet on white**. Show it whole
  (`aspect-square`, capped at `max-w-[272px]`, on a white panel) — any landscape
  crop slices the middle row of photos in half
- Routes with no `portfolioImage` fall back to a three-frame strip
- **No expand/zoom badge.** That a photo opens full screen is understood; a
  hover chip only adds furniture. Same on `StudioGallery`.

### DirectorNote

`src/components/booking/preview/DirectorNote.tsx`

The director's note on the preview shot — avatar, message, script signature.
This is what makes the step read as a studio rather than a generator: the shot
arrives with a reason attached, in a named person's voice.

- Copy is generated server-side by `gpt-4o-mini` via `/api/director-note`
- Holds its own height with a skeleton while the note is in flight, so the panel
  never pops in and shifts the column
- **Never given the scene name.** Scene names live in local route data, not in
  the Airtable prompt that produced the image, so a note naming a location could
  confidently describe somewhere the shot isn't. It talks about craft and the
  feeling she picked — both of which are true by construction.
- With no `OPENAI_API_KEY` the API returns a written fallback; the panel is
  identical either way

### Field

`src/components/booking/ui/Field.tsx`

Labelled text input with error state.

- Label: `label-caps text-[9px] font-medium text-muted`
- Input: `rounded-xl border bg-page px-4 py-3 text-[14px] text-ink`
  - Default border: `border-line`
  - Focus border: `focus:border-ink/40`
  - Error border: `border-accent-strong`
- Error message: `text-[11.5px] text-accent-strong`

Full ARIA wiring: `aria-invalid`, `aria-describedby` pointing to `{id}-error`.

### Calendar

`src/components/booking/ui/Calendar.tsx`

Custom month calendar for the date-selection step.

### BookingSummary

`src/components/booking/ui/BookingSummary.tsx`

Readonly summary panel showing selected route, date, photographer, and price.

---

## Booking — Studio Reveal (Confirmed step)

The `confirmed` step is the payoff of the whole flow — she's already paid and
waited, so it renders as an arrival at her own studio space, not an order
receipt. `ConfirmedStep.tsx` orchestrates scene generation (unchanged) and
composes the three pieces below.

### StudioReveal

`src/components/booking/confirmed/StudioReveal.tsx`

The mosaic gallery of all 5 shots, in the same wide-lead-plus-four-portraits
layout as `StudioGallery` — one visual language for "a set of studio photos"
everywhere on the site.

| Prop | Type | Notes |
|---|---|---|
| `route` | `PhotoRoute` | For shot count, scene labels, and the download filename slug |
| `bookingId` | `string` | Used in the zip filename |
| `shotUrls` | `readonly (string \| null)[]` | Index 0 = shot 1 (the preview). `null` = still generating |

- Opens any ready shot full screen via `ImageLightbox` (same lightbox used elsewhere — no new pattern)
- "Download all 5 photos" is disabled until every shot is ready; bundles them client-side into a `.zip` via `downloadAllAsZip` (`src/lib/download.ts`) and shows "Preparing your download…" while zipping
- Individual shots that fail to fetch are skipped from the zip rather than failing the whole bundle

### ShotTile

`src/components/booking/confirmed/ShotTile.tsx`

One frame in the mosaic. **Two controls, not one** — same constraint as
`DirectorChoiceCard`: the "open full screen" hit-target covers the whole tile,
and the per-shot download button is a sibling positioned over it, not nested
inside it (buttons can't nest). The download button is later in the DOM, so it
naturally paints — and receives clicks — above the open button where they
overlap.

- Not-yet-ready shots reuse the existing blurred-placeholder treatment from the old shot-progress strip
- Ready shots: click anywhere to open the lightbox, or the small circular icon (top-right) to download that one photo via `downloadFile`

### ClosingNote

`src/components/booking/confirmed/ClosingNote.tsx`

The director's sign-off once the full set is ready, shown in the aside panel.
Visually identical to `DirectorNote` (avatar, quoted note, script signature)
but static — it reuses the director's existing `signature` copy rather than
calling the `/api/director-note` endpoint, since this moment doesn't need a
generated note, just a warm close.

---

## Downloads

`src/lib/download.ts` — pure client-side helpers, used only from the studio
reveal today.

- `downloadFile(url, filename)` — fetches the image as a blob and saves it under `filename`. Necessary because shot URLs are cross-origin (R2 / the generation CDN); a plain `<a download>` is silently ignored by browsers for cross-origin hrefs. Falls back to opening the URL in a new tab if the fetch fails (e.g. no CORS headers on the source).
- `downloadAllAsZip(files, zipName)` — bundles multiple shots into one `.zip` with `jszip`, skipping any that fail to fetch, and returns `{ succeeded, failed }`.

---

*Last updated: August 2026*
