# NEXT5 Photos — Design System

> **Single source of truth for every visual decision in the project.**  
> All tokens live in `app/globals.css` (`@theme` block). Never hard-code a hex value or
> a px size directly in a component — always reference a token or a documented scale value.

---

## Table of Contents

1. [Brand Identity](#1-brand-identity)
2. [Color Tokens](#2-color-tokens)
3. [Typography](#3-typography)
4. [Spacing & Layout](#4-spacing--layout)
5. [Shadows & Borders](#5-shadows--borders)
6. [Motion & Animation](#6-motion--animation)
7. [Iconography](#7-iconography)
8. [Imagery](#8-imagery)

---

## 1. Brand Identity

| | |
|---|---|
| **Brand name** | NEXT5 Photos |
| **Tagline** | "Your next 5 Instagram photos" |
| **Market** | Saigon (Ho Chi Minh City), Vietnam |
| **Audience** | Women 22–38, travel & lifestyle |
| **Tone** | Warm, premium, effortless, approachable |
| **Visual mood** | Film-inspired, warm neutrals, editorial calm |

### Logo

```tsx
// src/components/layout/Logo.tsx
<span className="font-serif text-2xl font-medium tracking-[0.22em]">NEXT5</span>
<span className="label-caps mt-1 block text-[8px] opacity-80">Photos</span>
```

- Cormorant Garamond serif, wide letter-spacing (`0.22em`)
- Adapts to `text-ink` (scrolled) or `text-white` (hero overlay) via a `className` prop
- Never stretch, recolor outside these two states, or use on accent backgrounds

---

## 2. Color Tokens

All tokens are defined in `app/globals.css` inside `@theme {}` and consumed as Tailwind utilities.

### Surface / Background

| Token | CSS variable | Value | Usage |
|---|---|---|---|
| `page` | `--color-page` | `#ffffff` | Default page background |
| `surface` | `--color-surface` | `#fdfbf8` | Slightly warm alternative background |
| `surface-alt` | `--color-surface-alt` | `#f5f1ea` | Alternating section background (How It Works) |
| `cream` | `--color-cream` | `#f7f4f0` | Footer background |

### Text

| Token | CSS variable | Value | Usage |
|---|---|---|---|
| `ink` | `--color-ink` | `#221f1c` | Primary text, headings |
| `muted` | `--color-muted` | `#6e655c` | Secondary text, captions, meta |
| `on-dark` | `--color-on-dark` | `#ffffff` | Text on dark (`ink-block`) backgrounds |
| `on-dark-muted` | `--color-on-dark-muted` | `#cfc6bb` | Secondary text on dark backgrounds |

### Brand Accent

| Token | CSS variable | Value | Usage |
|---|---|---|---|
| `accent` | `--color-accent` | `#d89873` | Primary CTA button, highlights |
| `accent-strong` | `--color-accent-strong` | `#c37d55` | Hover state of accent, eyebrow labels |
| `gold` | `--color-gold` | `#a9825e` | Price display, premium elements |

### Dark Surface

| Token | CSS variable | Value | Usage |
|---|---|---|---|
| `ink-block` | `--color-ink-block` | `#1a1714` | Dark button background, dark card (FinalCta) |

### Stroke / Dividers

| Token | CSS variable | Value | Usage |
|---|---|---|---|
| `line` | `--color-line` | `#e9e1d6` | Borders, horizontal rules, card borders |

### Hardcoded one-offs (document before removing)

| Raw value | Context | Preferred token when extracted |
|---|---|---|
| `#eee0d1` | Step number badge background (HowItWorks) | `--color-badge-bg` |
| `#e8cfb5` | Hero italic em tag colour | `--color-accent-light` |

---

## 3. Typography

### Font Families

| Role | Tailwind class | CSS variable | Fallback stack |
|---|---|---|---|
| **Serif / Display** | `font-serif` | `--font-serif` → Cormorant Garamond | Times New Roman, serif |
| **Sans / Body** | `font-sans` (default) | `--font-sans` → Inter | ui-sans-serif, system-ui, sans-serif |

Both are loaded via `next/font/google` in `app/layout.tsx` (or wherever the root layout is) and injected as CSS variables `--font-cormorant` and `--font-inter`.

### Type Scale

| Role | Size | Font | Class pattern | Notes |
|---|---|---|---|---|
| **H1 — hero** | 42 / 56 / 64 / 70 px | Serif | `font-serif text-[42px] sm:text-[56px] lg:text-[64px] xl:text-[70px]` | `leading-[1.04] font-light` |
| **H2 — section** | 26 / 32 / 34 px | Serif | `font-serif text-[26px] sm:text-[32px] lg:text-[34px]` | `uppercase tracking-[0.1em] font-normal` |
| **H2 — dark CTA** | 30 / 36 / 40 px | Serif | `font-serif text-[30px] sm:text-[36px] lg:text-[40px]` | `leading-[1.15] font-light` |
| **H3 — card title** | 16 px | Serif | `font-serif text-[16px] tracking-[0.07em] uppercase` | Route card headings |
| **H3 — step label** | 11 px | Sans, caps | `label-caps text-[11px] font-medium` | How It Works step titles |
| **Body** | 15 / 16 px | Sans | `text-[15px] sm:text-base leading-relaxed` | Main body copy |
| **Body small** | 13 / 13.5 px | Sans | `text-[13px] sm:text-[13.5px]` | Nav links, footer links, subtitles |
| **Caption / meta** | 11.5 / 12.5 px | Sans | `text-[11.5px]` or `text-[12.5px] leading-[1.55]` | Route card meta, descriptions |
| **Label caps** | 10 / 10.5 px | Sans, caps | `label-caps text-[10px] font-medium` | Buttons, badges, nav CTA |
| **Price** | 19 px | Serif | `font-serif text-[19px]` | Route card price |
| **Logo** | 24 / 26 px | Serif | `font-serif text-2xl sm:text-[26px] tracking-[0.22em]` | NEXT5 logotype |

### `label-caps` utility

Defined in `globals.css`:

```css
@utility label-caps {
  text-transform: uppercase;
  letter-spacing: 0.18em;
}
```

Use on buttons, badge pills, step labels, and any ALL-CAPS interface text. **Never write `uppercase tracking-[0.18em]` separately** — always use `label-caps`.

---

## 4. Spacing & Layout

### Container

```
max-w-[1240px] mx-auto px-5 sm:px-8 lg:px-10
```

This is the universal page container. Every section uses it. Never deviate.

### Section vertical rhythm

| Section type | Mobile | Tablet | Desktop |
|---|---|---|---|
| Standard section | `py-14` | `py-16` | `py-20` or `py-24` |
| With `scroll-mt` | `scroll-mt-20` | | |

### `rounded` values in use

| Radius | Tailwind | Context |
|---|---|---|
| `rounded-full` | pill | Buttons (default), avatar rings, badge pills |
| `rounded-xl` | 12 px | Route cards |
| `rounded-2xl` | 16 px | Dark CTA block (FinalCta) |
| `rounded-lg` | 8 px | Button `rounded="lg"` variant, booking step button |

---

## 5. Shadows & Borders

### Card shadow

```
shadow-card → 0 1px 2px rgb(34 31 28/0.05), 0 8px 24px -12px rgb(34 31 28/0.18)
```

Defined in `@theme` as `--shadow-card`. Used on route cards and any raised surface.

### Card hover shadow

```
shadow-[0_20px_40px_-20px_rgb(34_31_28/0.35)]
```

Applied on `group-hover:` — the card rises slightly and casts a deeper shadow.

### Border colour

Always `border-line` (`#e9e1d6`). Semi-transparent overlays on dark surfaces use `border-white/20`, `border-white/45`, etc.

---

## 6. Motion & Animation

### Principles

- All transitions use `duration-300` (300 ms) with `ease-out` or CSS `cubic-bezier(0.22, 1, 0.36, 1)` for sheets
- Hover transforms are subtle: `scale-[1.03]`, `translate-x-1`, `-translate-y-1`
- Respect `prefers-reduced-motion` — the two modal animations are gated in `globals.css`

### Named animations (globals.css)

| Utility | Keyframe | Easing | Use |
|---|---|---|---|
| `animate-fade-in` | `opacity: 0 → 1` | `ease-out 0.25s` | Modal backdrop |
| `animate-sheet-in` | `opacity 0, translateY(24px) scale(0.985) → default` | `cubic-bezier(0.22,1,0.36,1) 0.35s` | Booking modal panel |

### Common transition patterns

```tsx
// Button hover lift (Header "Book now")
hover:scale-[1.03] transition-transform duration-300

// Arrow nudge (Button withArrow, RouteCard)
group-hover:translate-x-1 transition-transform duration-300

// Card hover lift
hover:-translate-y-1 transition-all duration-300

// Nav underline grow
after:w-0 hover:after:w-full after:transition-all after:duration-300

// Image zoom on card hover
group-hover:scale-105 transition-transform duration-700   ← images use 700ms
```

---

## 7. Iconography

All icons live in `src/components/ui/Icons.tsx`.

### Base spec

```tsx
const strokeBase = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};
// viewBox: "0 0 24 24"
```

### Size conventions

| Context | Size class | Example |
|---|---|---|
| Hero feature row | `h-5 w-5` | TicketIcon, SunIcon … |
| Button arrow | `h-3.5 w-3.5` | ArrowRightIcon |
| Route card meta | `h-3.5 w-3.5` | MapPinIcon, ClockIcon |
| How It Works step | `h-9 w-9` | Step icons |
| WhatsApp (header) | `h-5 w-5` | WhatsAppIcon |
| WhatsApp (footer) | `h-4 w-4` | WhatsAppIcon |
| Hamburger / close | `h-6 w-6` | MenuIcon, CloseIcon |

### Available icons

`ArrowRightIcon`, `SparkleIcon`, `WhatsAppIcon`, `TicketIcon`, `SunIcon`, `CameraIcon`,
`CloudIcon`, `HeartIcon`, `MapPinIcon`, `ClockIcon`, `StarIcon`, `GiftIcon`,
`PhoneCheckIcon`, `CalendarIcon`, `CardIcon`, `PhotoIcon`, `MenuIcon`, `CloseIcon`,
`ChevronDownIcon`

### Adding a new icon

1. Add a named export to `Icons.tsx` using the `Svg` wrapper (inherits `strokeBase`)
2. Keep `viewBox="0 0 24 24"`
3. Use `stroke="currentColor"` — never hard-code a color inside the SVG
4. For filled icons (e.g. `HeartIcon` filled state, `StarIcon`) pass `fill="currentColor"` at the `<svg>` level

---

## 8. Imagery

### Photo treatment

- All images are rendered through `<PlaceholderImage>` which falls back to a tonal placeholder while loading
- Hero image uses `loading="eager"`, all others use lazy loading (default)
- Aspect ratios: route cards `aspect-[1/1.05]` (portrait)

### Overlay gradients (hero)

```
Mobile: bg-gradient-to-b from-black/70 via-black/55 to-black/80
Desktop: bg-gradient-to-r from-black/85 via-black/50 via-45% to-transparent
         + bg-gradient-to-t from-black/55 via-transparent to-black/30 (overlay layer)
```

### Avatar stack

Rendered by `<AvatarStack>`. Ring colour adapts to background:
- On light: `ring-page` (white)
- On dark `ink-block`: `ring-ink-block`

---

*Last updated: August 2026*
