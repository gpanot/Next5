# Next5 Business Studios — Build Plan

**Status:** Approved for build · **Written:** 2026-09-13 · **Owner:** Guillaume

This folder is the complete plan for adding two B2B products to Next5, launched in
Vietnam first, designed as a US-style product.

| Product | Customer | Job | Route |
|---|---|---|---|
| **Next5 Brand** (Brand Studio) | Realtors, coaches, beauty & wellness pros, finance/insurance advisors — people whose face *is* the business | A fresh month of on-brand photos of themselves for social, listings and website | `/brand` → `/app` |
| **Next5 Shop** (Shop Studio) | TikTok Shop / Instagram / Facebook / Shopee clothing & accessory sellers | On-model photos of every new product, in the shop's consistent look, in every marketplace format | `/shop` → `/app` |
| **Next5 Photos** (existing) | Women, personal Instagram shoots | 5 directed photos per studio | moves from `/` to `/photos` |

Both new products run on the **same engine**: a saved identity (her face, or a Studio
model), an **owned Set** (a consistent visual look), and recurring **Batches** paid
with **credits** from a prepaid plan.

---

## Decisions already made (do not re-litigate)

| # | Decision | Consequence |
|---|---|---|
| D1 | **English-only UI, prices shown in USD, charged in VND** by bank-transfer QR | One FX rate in config (`VND_PER_USD`). Porting to the US later = swap the payment provider only. |
| D2 | **Consumer product moves to `/photos`** and keeps running unchanged (bilingual EN/VI, VND) | New `/` is the business homepage. Existing magic links to `/studio` keep working. |
| D3 | **Prepaid monthly plans (1 / 3 / 6 months) + one-off credit top-ups** | No auto-charge. Credit ledger + monthly grants + renewal reminders. |
| D4 | **Solo accounts in v1**; teams/seats later | Data model has a `Workspace` so teams can be added without migration pain. |
| D5 | **Vietnam launch, US-ready** | Imagery cast mostly Vietnamese / Southeast-Asian women in **internationally neutral** settings — no Saigon landmarks in the new products. |
| D6 | **Payments must be server-verified** (SePay webhook) | The current mock / client-confirmed payment is replaced — including for `/photos`. |
| D7 | **(2026-09-14) Validate demand before real payments.** P2 ships a **mock provider** only | Same `Payment` rows, references, QR sheet and server-side `fulfill()`; a "Simulate transfer" action stands in for the bank. SePay webhook (P2 §2.1, §2.2 sepay.ts) and the `/photos` payment fix (§2.5) are deferred until interest is confirmed. **Amended at launch:** in production a plan choice is an *early-access request* (no bank details) that the admin activates — see P11 notes. |
| D9 | **(2026-09-14) WaveSpeed webhooks instead of a generations cron** | No Vercel Pro needed; lost callbacks are recovered by stale sweeps (batch creation, webhooks, daily cron, open batch page). |
| D8 | **(2026-09-14) Analytics = Vercel Web Analytics** on project `prj_R2toqYAqI6B2BXpTVhQ7HduCrOqW`; Sentry and the per-minute generations cron skipped for now | Page views on every plan; custom funnel events need Vercel Pro to view. Server-side funnel numbers stay in Admin → Overview. |

---

## Documents

| File | What it contains |
|---|---|
| [01-product-spec.md](01-product-spec.md) | Both products in detail: ICPs, features, plans, credits rules, policies, voice & key copy |
| [02-architecture.md](02-architecture.md) | Route map, data model (Prisma + SQL), services, generation pipeline, payments, cron, env vars, security, analytics |
| [03-ux-ui.md](03-ux-ui.md) | US-style design direction, token additions, dark mode, component inventory, wireframes for every screen, state rules |
| [04-image-prompts.md](04-image-prompts.md) | Every new image: target path, size, alt text, generation prompt |
| [phases/](phases/) | 12 build phases + 1 parallel spike, each self-contained with tasks, files, acceptance criteria and a Cursor kickoff prompt |

---

## Phase map

Each phase ships behind the `NEXT5_BUSINESS_ENABLED` flag and leaves `main` deployable.
Sizes: **S** ≈ 1–2 dev-days, **M** ≈ 3–5, **L** ≈ 6–10 (with Cursor assistance).

| Phase | Name | Size | Depends on | User-visible? |
|---|---|---|---|---|
| [P0](phases/phase-00-groundwork.md) | Groundwork: move consumer to `/photos`, split oversized files, config, dark mode, UI primitives | M | — | `/photos` only |
| [SP1](phases/spike-01-garment-fidelity.md) | **Spike (parallel, start day 1):** garment-fidelity test for Shop | S | — | No |
| [P1](phases/phase-01-data-credits.md) | Data model, credit ledger, plans config | M | P0 | No |
| [P2](phases/phase-02-payments.md) | Real payments: SePay QR + webhook, USD→VND, checkout sheet, fix `/photos` payment | M | P1 | Yes (checkout) |
| [P3](phases/phase-03-marketing-site.md) | Marketing: `/`, `/brand`, `/shop`, `/pricing` + images | L | P0 (images: 04) | Yes |
| [P4](phases/phase-04-onboarding.md) | Auth routing, onboarding wizard, consent, identity references, free trial | L | P1, P6 core | Yes |
| [P5](phases/phase-05-app-shell-billing.md) | `/app` shell, dashboard, billing, settings & privacy | M | P1, P2 | Yes |
| [P6](phases/phase-06-generation-engine.md) | Generation engine v2: batches, prompt composer, queue pump, labeling, regen, zip | L | P1 | No (API) |
| [P7](phases/phase-07-brand-studio.md) | Brand Studio features: sets, themes, batches, library, captions | L | P4, P5, P6 | Yes |
| [P8](phases/phase-08-shop-studio.md) | Shop Studio features: products, shop looks, Studio models, compare view | L | P4, P5, P6, SP1 | Yes |
| [P9](phases/phase-09-lifecycle.md) | Lifecycle: monthly grants, expiry, reminders, drop emails, analytics | M | P2, P5 | Yes (email) |
| [P10](phases/phase-10-admin.md) | Admin v2: workspaces, payments, themes & templates, QA queue, metrics | M | P1, P2, P6 | Admin |
| [P11](phases/phase-11-launch.md) | Launch hardening: legal pages, rate limits, SEO/OG, e2e smoke tests, checklist | M | all | Yes |

```
P0 ──► P1 ──► P2 ──► P5 ──┬──► P7 (Brand) ──┐
 │      │                  │                ├──► P9 ──► P10 ──► P11
 │      └──► P6 ──► P4 ────┴──► P8 (Shop) ──┘
 └──► P3 (marketing, parallel after P0)
SP1 (fidelity spike) ─────────► gate for P8
```

**Recommended order for one developer + Cursor:** P0 → SP1 (half-day, in parallel) →
P1 → P2 → P6 → P3 → P5 → P4 → P7 → P8 → P9 → P10 → P11.
(P5 before P4 so the wizard can hand off to a working `/app`.)
**Soft launch Brand after P7** (Shop can follow after P8) if you want revenue earlier.

---

## How to run a phase with Cursor

1. Open the phase file. Read *Goal*, *Out of scope* and *Acceptance criteria* yourself first.
2. Create a branch: `git checkout -b feat/p<N>-<slug>`.
3. Paste the phase's **Cursor kickoff prompt** into Cursor (Agent mode). It tells Cursor
   which docs to read and in which order.
4. Let Cursor work task by task. Tick the checkboxes in the phase file as tasks land
   (commit the ticked file with the code).
5. Before merging: run the phase's *Verification* commands and walk the acceptance
   criteria manually on desktop **and** a phone-width browser, light **and** dark mode.
6. Merge, deploy to a Vercel preview, then production with the flag still **off**
   until the phase that makes it user-facing says to turn it on.

---

## Non-negotiable project rules (Cursor must follow)

These come from the user's global instructions, `AGENTS.md` and `docs/contributing.md`:

- **Next.js 16.3 has breaking changes.** Before writing route handlers, layouts, `after()`,
  caching or metadata code, read the relevant guide in `node_modules/next/dist/docs/`
  (see `AGENTS.md`). Do not rely on memory of older Next.js versions.
- **TypeScript strict, no `any`.** Named exports only (Next.js `page.tsx` / `layout.tsx` /
  `route.ts` default exports are the only exception).
- **Max 600 lines per file, functions under 50 lines.** Split components when over 400 lines.
- **Tailwind CSS only** (v4, tokens in `app/globals.css`). Every new UI supports **dark mode**
  (`dark:` variants), is **mobile-first**, uses `rounded-xl`, `shadow-sm`, 4/8px spacing grid,
  and smooth transitions on interactive elements.
- **Every page/async view has loading skeletons, error states and empty states.**
- **Images:** never reference a path that is not in `public/images/manifest.json`. Never use
  gradient divs, colored boxes or emoji as stand-ins for photos. Photos are generated from
  [04-image-prompts.md](04-image-prompts.md); icons, logos, patterns are hand-written SVG.
- **Use `label-caps`** utility for all uppercase tracked labels (never `uppercase tracking-…`).
- **Database changes:** add a dbmate SQL migration in `db/migrations/` **and** mirror it in
  `prisma/schema.prisma`, then `npm run db:migrate && npm run generate`.
- **Paid APIs** (WaveSpeed, OpenAI) must honour `isMockGeneration()` so local dev costs $0.
- **Never trust the client for money.** Payment status, credit balance and plan state are
  read and written on the server only.

---

## Risks tracked across phases

| Risk | Where handled |
|---|---|
| Garment fidelity not good enough for Shop | SP1 gate before P8; "Doesn't match" free redo in P8; QA queue in P10 |
| Face likeness complaints | Free regen with reason (P6), 3 identity references (P4), likeness QA (P10) |
| Vietnam AI Law (Art. 11, in force 2026-03-01) — AI images of real people must be labeled | Embedded XMP/IPTC label on every output + optional visible mark (P6); legal review in P11 |
| TikTok Shop AIGC rules (images must match the real product, AIGC label) | Compare view + seller education + visible-label toggle (P8) |
| Face/biometric data handling | Explicit consent record, deletion in settings (P4/P5); Illinois BIPA review before any US launch (P11) |
| Payment mismatch (wrong amount / missing memo) | Webhook matching rules + admin unmatched queue + manual confirm (P2, P10) |
| Vercel cron frequency (per-minute cron needs a paid plan) | On-demand pump from the client + cron fallback (P6) |
| Generation cost creep from regenerations | Regen caps, cost logged per batch (P6), metrics (P10) |
