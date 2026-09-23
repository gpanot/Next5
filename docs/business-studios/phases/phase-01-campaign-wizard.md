# P1 — Campaign Wizard (`/automation`)

**Size:** XL · **Depends on:** P0B (Template Engine) · **Status:** P1A built, P1B planned · **Written:** 2026-09-23 · **P1A built:** 2026-09-23

Source spec: `automation-page-spec-v3.md` §"PHASE 1". This document is that spec reconciled with
the code that now exists — where the two disagree, the reason is stated.

## Goal

A business picks a goal, reviews the week the Template Engine proposes, supplies what it asks for,
and ends with a scheduled campaign on her calendar. Phase 0B already answers "what should she
post"; Phase 1 is the surface that asks the question and acts on the answer.

## What the review found

Five things in the spec do not survive contact with the codebase. Four are cheap to correct. One
decides whether Phase 1 is one phase or two.

### 1. There is no customer-facing generation engine — the blocker

Spec §8 (Step 6) says "Generate N posts" and shows a review grid of 9:16 cards. Nothing in the
customer app can produce a short-form video or slideshow today:

| Engine | Where it lives | Reachable by a customer? |
|---|---|---|
| Blitz Lab (slideshow/green-screen → mp4 via Remotion) | `app/api/admin/blitz/**` + `blitz-worker/` | **No** — admin token only |
| UGC Lab / UGC Clone (Seedance, Wan 3.0) | `app/api/admin/ugc-lab/**` | **No** — admin token only |
| Batch generation (WaveSpeed) | `app/api/app/batches` | Yes — but it makes **photos**, not video |

`BlitzProject` also has no `workspaceId`: it is a single global admin table, so "her campaign's
posts" has nowhere to live even if the routes were opened up.

This is not a small wiring job. Opening Blitz to customers means per-workspace ownership, credit
metering, quota enforcement, asset scoping, moderation of `isIdentifiablePerson`, and a worker
that serves paying users rather than staff. It is comparable in size to the wizard itself.

**Consequence: Phase 1 splits in two.** See "Phasing" below.

### 2. The route is studio-scoped, not root

Spec §1 says route `/automation`, with `/automations` as the existing list view. Neither exists,
and the app is studio-scoped throughout: `/app/[studio]/calendar`, `/app/[studio]/brand`, built
via `studioHref` (`src/components/app/shell/nav.ts`). A root `/automation` would sit outside the
app shell, outside `WorkspaceProvider`, and outside the studio switcher.

**Corrected:** `/app/[studio]/automation` for the wizard, `/app/[studio]/automations` for the list,
registered in `navFor()` as **Campaigns**.

### 3. The design tokens in the spec are the prototype's, not the app's

Spec §2 keeps the reference prototype's paper/ink palette and Fraunces + IBM Plex Mono type. The
app has its own design system (`docs/design-system.md`, `app-*` tokens: `app-ink`, `app-surface`,
`app-line`, `app-cta`). Following the spec literally would make one page look foreign inside its
own shell.

**Corrected:** the wizard uses the app's design system. The prototype stays a reference for
*layout and interaction* — stepper, choice cards, plan table, three-way source toggle — not colour
and type.

### 4. `goal = 'sell'` has no product source in the Brand studio

Spec §3 gives a product picker when the goal is "sell". `Product` belongs to the Shop studio; a
Brand workspace (realtor, mechanic) has none. Its equivalent is `Listing` for realtors, and
nothing at all for a service business.

**Corrected:** the picker is source-aware — Shop → `Product`, Brand with listings → `Listing`,
Brand without → a free-text "what are you selling this week" line that writes
`campaignSubject`. Goal "sell" is never hidden; only the picker changes.

### 5. "Autosave drafts using the app's existing pattern" — there is no such pattern

No multi-step form in the app autosaves. `createLocalStore` is localStorage only, and would lose a
draft on a device switch.

**Corrected:** the draft *is* the `Campaign` row, `status = 'draft'`, saved on step transition.
Explicit and queryable, and the campaigns list can show unfinished drafts.

## Phasing

**P1A — Plan and schedule (no generation).** The wizard end to end, ending in a scheduled week of
empty `PostSlot` rows, each carrying its template, purpose and asset checklist. She fills them the
way she fills slots today — her own photos and videos, or a batch. This is shippable and useful on
its own: it answers "what do I post this week, and what do I need to shoot", which is the part
nobody can do for themselves.

**P1B — Generation.** Opening a generation engine to customers, then wiring Step 6's "Generate N
posts" and the review grid onto it. Needs its own spec: engine choice, per-workspace ownership,
credit cost per post, quota, moderation.

The split is not a scope cut. P1A is the whole spec except Step 6's generate half, and it is the
half that depends on Phase 0B.

---

## P1A — Plan and schedule

### 1A.0 — Prerequisite fix (before any campaign writes a slot)

- [x] `replanUpcoming` (`src/server/calendar/calendar.ts:231`) re-dates **every** future `planned`
      slot, filtered only by workspace and date. Change the posting weekdays after scheduling a
      campaign and the whole campaign silently moves. Scope the `where` with `campaignId: null`.
- [x] Regression test: change `weekdays`, assert campaign slots keep their dates.

### 1A.1 — Schema

```prisma
model Campaign {
  id            String   @id @default(cuid())
  workspaceId   String
  goal          CampaignGoal          // leads | enquiries | sell
  productId     String?               // Shop
  listingId     String?               // Brand + listings
  channels      String[]              // tiktok, instagram
  campaignSubject String?             // overrides Brand.promoting, this campaign only
  campaignMessage String?             // overrides Brand.offer, this campaign only
  useBrandSubject Boolean @default(true)
  useBrandMessage Boolean @default(true)
  promo         String?
  notes         String?
  postsPerDay   Int      @default(1)
  weeks         Int      @default(1)
  startDate     DateTime @db.Date
  assetMethod   String?
  status        CampaignStatus        // draft | generated | scheduled
  posts         CampaignPost[]
}

/// One piece of content. Posted to every campaign channel, so it owns several PostSlot rows.
model CampaignPost {
  id           String   @id @default(cuid())
  campaignId   String
  dayIndex     Int
  slotOfDay    String                 // morning | midday | evening
  scheduledFor DateTime @db.Date
  templateId   String
  /// Locked at proposal time. Editing the template later never changes this post.
  versionId    String
  purpose      ContentPurpose
  source       ContentSource          // real | mix | generated
  skipped      Boolean  @default(false)
  caption      String?
  slots        PostSlot[]
}
```

`PostSlot` gains `campaignPostId String?` (nullable, indexed). One `CampaignPost` → one row per
channel, because posting can succeed on Instagram and fail on TikTok and each needs its own status
(`SocialPost` already links per `slotId`).

**A 7-day two-channel campaign is 7 `CampaignPost` rows and 14 `PostSlot` rows.** Every count shown
to the user — and the quota in Step 6 — counts posts, never slots.

### 1A.2 — Step 1 · Goal

- [x] Goal single-select: leads / enquiries / sell.
- [x] Source-aware picker for "sell" (finding 4).
- [x] Channel chips, ≥1 required, from the workspace's `SocialConnection` rows where present.
- [x] 9:16 only — `story_9_16` in `src/config/formats.ts`.

### 1A.3 — Step 2 · Campaign

- [x] "What are we promoting?" and "What should people know?" default from `Workspace.promoting`
      and `Workspace.offer` (both added in Phase 0B), each with a **Use Brand information /
      Customize for this campaign** toggle.
- [x] Customize writes `campaignSubject` / `campaignMessage` — campaign-scoped, never back to Brand.
- [x] Promo and notes: free text, campaign-only.

### 1A.4 — Step 3 · Content plan

- [x] Calls `proposePlan()` from `src/server/automation/matching.ts`. **No weekly rhythm in the
      wizard's own code** — the rhythms live in `src/config/contentTemplates.ts`.
- [x] One row per day: day, template name as a content-idea line, purpose, source toggle, skip.
- [x] Swapping a day offers only templates valid for that slot — same purpose, channels the
      campaign uses, audience match. Never a free pillar × format cross.
- [x] Rows returning `widened: true` say so ("no Conversion idea left — using a Trust one"),
      rather than hiding it.
- [x] "Regenerate plan" re-runs the matcher; confirm before discarding manual swaps.
- [x] "Edit strategy" reveals pillar and format as read-only metadata.

### 1A.5 — Step 4 · Cadence

- [x] Posts/day 1–3 → `SLOTS_BY_POSTS_PER_DAY` (morning/midday/evening, already a 1:1 map).
- [x] Length 1–4 weeks, start date, live post count.
- [x] Non-blocking note when posts/day > 1.

### 1A.6 — Step 5 · Assets

- [x] Per day, show that template's real requirements from `assetRequirements`, with each one's
      `fulfilment`: `upload` is hers to supply, `generate` is ours, `library` is a pick.
- [x] Only unmet **required + upload** requirements can block scheduling — `requiredUploads` on
      each `PlanSlot` already isolates exactly this set.
- [x] Missing requirements flag the specific day, not a generic warning.

### 1A.7 — Step 6 · Review and schedule

- [x] Summary: posts, days, channels, and the Yours/Mix/Generated split.
- [x] Schedule writes `CampaignPost` rows and their `PostSlot` rows, then calls `recordUsage()` —
      **on accept only**, never at preview, or regenerating poisons its own rotation.
- [x] "Save as draft" always available and never blocked.
- [x] Generation and the review grid are P1B.

### 1A.8 — Calendar integration

- [x] `autoFill`'s `takenDates` counts campaign slots, so auto-fill never books a photo onto a day
      a campaign owns.
- [x] `sendWeeklyDigests` (`digest.ts`) filters `itemId: { not: null }`, which matches only a
      generated photo — a freshly scheduled campaign would produce an empty "nothing ready" week.
      Widen to "the slot has any content".
- [x] `buildIcs` titles a campaign slot with its template name. Fallback order becomes
      `item.postKit.hook → template name → material.label → generic`.
- [x] `hasGoneQuiet` is left alone: an unposted campaign **should** trip the churn alarm.
- [x] `autoFill` stays `brand`-only (`calendar.ts:115`) — Shop has `DropSchedule`, so a Shop
      campaign writes its own slots and must not rely on auto-fill.

### 1A.9 — Campaigns list

- [x] `/app/[studio]/automations`: drafts, scheduled and finished campaigns; "New campaign" opens
      the wizard. Registered in `navFor()` as **Campaigns**.

### 1A.10 — Mobile first

~90% of use is on a phone, and the spec describes a plan **table**. The table is a desktop
affordance.

- [x] Design at 390px first: the plan is a vertical list of day cards, not a table with columns.
- [x] The stepper is a progress bar plus back/next, not seven tabs across.
- [x] Every control is touch-first; nothing depends on hover.

### What the build added beyond the plan

- **Unschedule.** A booked campaign can be returned to draft, unless part of it is already posted.
  Without it a mistimed campaign could only be abandoned, leaving dead days on her calendar.
- **The digest learned to count booked-but-empty days.** Widening "ready" to include her own
  material was not enough: a freshly scheduled campaign holds no content at all, so the week it
  matters most would have produced no email. `postsReadyEmail` now also reports how many campaign
  days still need her footage, and sends when that count alone is non-zero.
- **`swapCandidates` excludes templates already used elsewhere in the same week**, so swapping can
  never create a duplicate idea the matcher was careful to avoid.

### P1A acceptance criteria

- [x] `replanUpcoming` cannot re-date a campaign slot — proven by test.
- [x] Step 3's plan comes from `proposePlan()`; no rhythm constant exists in wizard code.
- [x] Swapping a day offers only templates valid for that slot.
- [x] Step 5 shows real per-day requirements and distinguishes "you supply" from "we generate".
- [x] Only unmet required uploads block Schedule; Save as draft is never blocked.
- [x] Scheduling writes N `CampaignPost` rows and N × channels `PostSlot` rows, and calls
      `recordUsage` exactly once.
- [x] The campaign appears on the calendar, in the ICS feed with its template name, and in the
      weekly digest.
- [x] A campaign can be built end to end using only global templates, with no workspace override.
- [x] Usable one-handed at 390px.

---

## P1B — Generation (needs its own spec)

Not planned here beyond naming what it must decide:

- Which engine produces a campaign post — Blitz slideshow, UGC Lab video, or both by template type.
- `BlitzProject` (or its successor) gains a `workspaceId`; assets scope to the workspace.
- What a generated post costs, and what meters it. Plans currently meter **photo credits**;
  `postKit` is a boolean. The spec's "Blitz Lab quota" has no config behind it.
- Moderation: `isIdentifiablePerson` is a manual staff flag today.
- Step 6's review grid, per-post regenerate, and editable captions.

## Decisions (2026-09-23)

**Ship P1A alone.** The wizard goes live giving the plan and the shot list. Generation follows.

**Engine is per template, Blitz slideshow by default.** `ContentTemplate` gains
`recommendedEngine` (`blitz_slideshow | ugc_video`), set by hand in the admin Templates tab.
Slideshow is the default because it already renders 9:16 and is cheap; a template whose value
depends on a person talking — "N Tips from a Pro", "Meet the Team" — gets tagged `ugc_video` and
shows a **recommended** badge. The field is added in P1A so the library can be tagged before P1B
needs it; nothing reads it until P1B.

**Metering: photo credits are not spent on campaign posts.**

- *P1A charges nothing.* Nothing is generated, so nothing is metered. Planning and scheduling a
  week is free, gated only by whether the plan includes Campaigns at all.
- *P1B meters a separate monthly post allowance*, `monthlyPosts` on `Plan`, not photo credits.
  Two reasons. A generated post is not one photo — it bundles several images, a render, and
  sometimes a video, so pricing it as "1 credit" misprices it and pricing it as "N credits" makes
  her do arithmetic to find out what a week costs. And photo credits are already promised as
  photos on every plan card; silently draining them to make videos would break that promise.
  A post allowance can be shown honestly: "12 campaign posts a month".
- The existing `CreditLedger` mechanics (grant, reserve, refund, expiry, `bucket`) are reused for
  the post allowance rather than reinvented — `bucket` already separates trial/plan/topup, and
  `getBalance` sums per bucket.
