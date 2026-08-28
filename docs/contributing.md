# NEXT5 Photos — Contributing Guide

> Rules and conventions every contributor must follow to keep the codebase and
> visual output consistent. Read this before touching any UI file.

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [File & Component Conventions](#2-file--component-conventions)
3. [Styling Rules](#3-styling-rules)
4. [Adding a New Page Section](#4-adding-a-new-page-section)
5. [Adding a New UI Primitive](#5-adding-a-new-ui-primitive)
6. [Updating Design Tokens](#6-updating-design-tokens)
7. [Adding Icons](#7-adding-icons)
8. [Data & Copy](#8-data--copy)
9. [Accessibility Checklist](#9-accessibility-checklist)
10. [Quick Checklist Before PR](#10-quick-checklist-before-pr)

---

## 1. Project Structure

```
next5-landing/
├── app/
│   ├── globals.css          ← Design tokens (@theme) + global utilities
│   ├── layout.tsx           ← Root layout: fonts, metadata
│   └── page.tsx             ← Page composition — imports sections in order
├── src/
│   ├── components/
│   │   ├── ui/              ← Reusable primitives (Button, Icons, …)
│   │   ├── layout/          ← Site-wide layout (Header, Footer, Logo)
│   │   ├── sections/        ← Page sections (Hero, HowItWorks, …)
│   │   └── booking/         ← Booking modal and all its sub-parts
│   │       ├── ui/          ← Booking-specific atoms (Field, StepFooter, …)
│   │       └── steps/       ← One file per booking step
│   ├── data/                ← Content / static data (site.ts, routes.ts, …)
│   ├── hooks/               ← Custom React hooks
│   ├── lib/                 ← Pure utility functions (date, format)
│   ├── services/            ← External service calls (payment.ts)
│   └── types/               ← Shared TypeScript types
├── public/
│   └── images/              ← Static images (avatars/, polaroids/)
└── docs/
    ├── design-system.md     ← Token reference (this doc's source of truth)
    ├── components.md        ← Component catalog
    └── contributing.md      ← This file
```

---

## 2. File & Component Conventions

### Naming

| Item | Convention | Example |
|---|---|---|
| Component files | `PascalCase.tsx` | `RouteCard.tsx` |
| Hook files | `camelCase.ts` prefixed `use` | `useScrolled.ts` |
| Data / util files | `camelCase.ts` | `routes.ts`, `format.ts` |
| CSS | Single file — `globals.css` | — |

### Component exports

- **Named exports only** — no `default export` for components.
- Every component file exports exactly what it contains, nothing more.
- Co-locate types with their component when they're not shared. Move to `types/` only if used in 2+ files.

### 'use client' directive

Add `'use client'` only when the component uses a React hook or browser API. Keep as many components as possible as React Server Components (no directive).

| Has hooks / events? | Directive |
|---|---|
| No | Omit — default is RSC |
| Yes | `'use client'` at line 1 |

---

## 3. Styling Rules

### Rule 1 — Tokens only, no raw values

```tsx
// ✅ Correct
<div className="bg-accent text-ink border-line" />

// ❌ Wrong
<div style={{ background: '#d89873', color: '#221f1c' }} />
<div className="bg-[#d89873]" />
```

Exception: documented one-offs in `design-system.md § 2 Hardcoded one-offs`. If you add a new one-off, document it there immediately and mark it for tokenisation.

### Rule 2 — Use `label-caps` for all uppercase label text

```tsx
// ✅
<span className="label-caps text-[10px] font-medium">Book now</span>

// ❌
<span className="uppercase tracking-[0.18em] text-[10px] font-medium">Book now</span>
```

### Rule 3 — Universal page container

Every full-width section's inner content must use:

```
mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10
```

Never change the max-width or the padding breakpoints.

### Rule 4 — Responsive first, desktop second

Write mobile styles first, then layer `sm:` and `lg:` overrides.

### Rule 5 — No `style={}` for layout

Use Tailwind utilities. `style={}` is acceptable only for:
- Dynamic values that can't be expressed as static Tailwind classes (e.g., a JS-computed height)
- Chart or canvas inline config

### Rule 6 — className composition

For multi-condition class strings use array join:

```tsx
const cls = [
  'base classes here',
  condition ? 'active-class' : 'inactive-class',
  extraClassName,
].join(' ');
```

Never use template literals for conditional classes — they break static analysis.

### Rule 7 — Transitions

- Standard: `transition-all duration-300` or `transition-colors duration-300`
- Images: `transition-transform duration-700` (slower for a cinematic feel)
- Modal: use the named utilities `animate-fade-in`, `animate-sheet-in` from `globals.css`
- Always honour `prefers-reduced-motion` — new keyframe animations must be gated

---

## 4. Adding a New Page Section

1. Create `src/components/sections/MySection.tsx`
2. Use `<section id="my-section" className="scroll-mt-20 bg-<token> py-14 sm:py-16 lg:py-20">`
3. Inner content: universal container (see Rule 3)
4. Add heading with `<SectionHeading>` if appropriate
5. Import and add to `app/page.tsx` in the correct visual order
6. If the section has a nav link, add to `navLinks` in `src/data/site.ts`
7. Document the section in `docs/components.md`

---

## 5. Adding a New UI Primitive

1. Create `src/components/ui/MyComponent.tsx`
2. Export as named export
3. Accept a `className?: string` prop for extension (pass it to the root element)
4. Keep state out — if it needs state, ask whether it belongs in a higher-level component
5. Document it in `docs/components.md` with props table and usage example

---

## 6. Updating Design Tokens

All tokens live in `app/globals.css` inside the `@theme {}` block.

**Adding a colour token:**
1. Choose a semantic name (e.g., `--color-accent-light`) not a visual name (`--color-warm-peach`)
2. Add `--color-my-token: #value;` to `@theme`
3. Use as `bg-my-token`, `text-my-token`, `border-my-token` in Tailwind (v4 auto-generates utilities)
4. Document in `docs/design-system.md § 2`

**Adding a custom utility:**
```css
@utility my-utility {
  /* CSS properties */
}
```

**Do not:**
- Remove or rename existing tokens without a full codebase search and replacement
- Add tokens that duplicate existing ones with a different name

---

## 7. Adding Icons

All icons live in a single file: `src/components/ui/Icons.tsx`.

**Rules:**
- `viewBox="0 0 24 24"` always
- Use the `Svg` wrapper for stroke icons — it applies `strokeBase` automatically
- Colour via `currentColor` only — never hardcode a colour inside the SVG path
- For filled icons (e.g., Star, filled Heart): pass `fill="currentColor"` at the `<svg>` level
- Export as `MyNameIcon` with `Icon` suffix
- Add to the table in `docs/design-system.md § 7`

```tsx
export const MyIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="..." />
  </Svg>
);
```

---

## 8. Data & Copy

All site content (nav links, feature bullets, step descriptions, routes, photographers) lives in `src/data/`.

| File | Contents |
|---|---|
| `site.ts` | Nav links, hero features, How It Works steps, avatar/polaroid sources |
| `routes.ts` | Photo route objects (`PhotoRoute` type) |
| `photographers.ts` | Photographer profiles |
| `photos.ts` | Hero photo and photo sources |
| `imagery.ts` | Image catalogue |
| `availability.ts` | Available time slots |

**Rules:**
- Never hardcode copy directly in a component — source it from the data layer
- Keep all `as const` assertions on tuples / literal arrays for type inference
- `readonly` on all arrays exposed from data files

---

## 9. Accessibility Checklist

Before shipping any UI change:

- [ ] All interactive elements reachable via keyboard (`Tab`, `Enter`, `Space`)
- [ ] `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent` on every interactive element
- [ ] Decorative images use `aria-hidden="true"`
- [ ] Meaningful images have descriptive `alt` text
- [ ] Icon-only buttons have `aria-label`
- [ ] Toggle buttons use `aria-pressed`
- [ ] `aria-invalid` and `aria-describedby` on form inputs with errors
- [ ] Modal traps focus (`useFocusTrap` hook) and restores on close
- [ ] Body scroll locked while modal is open (`useLockBodyScroll`)
- [ ] `aria-label` on all `<nav>` elements (Primary, Mobile primary, Footer)
- [ ] Lists that are logically ordered use `<ol>`, unordered use `<ul>`
- [ ] Colour contrast: text on `muted` (`#6e655c`) on `page` (`#fff`) = 4.65:1 ✓

---

## 10. Quick Checklist Before PR

```
[ ] No raw hex / pixel values outside @theme or documented one-offs
[ ] label-caps used for all uppercase tracking text
[ ] Universal container used in every new section
[ ] 'use client' only where hooks/events are needed
[ ] New icons follow Svg wrapper convention
[ ] New copy sourced from src/data/, not hardcoded
[ ] Accessibility checklist passed
[ ] docs/ updated if adding a token, component, or section
```

---

*Last updated: August 2026*
