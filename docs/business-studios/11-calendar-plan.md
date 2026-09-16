# P19 — The Calendar (Brand Studio)

Status: **built 2026-09-16** (P19.1–P19.7). Publishing (P19.8) stays parked.
Related: [10-tiktok-shop-plan.md](10-tiktok-shop-plan.md) (P17 drops — the Shop-side ancestor of this feature), [phases/phase-12-offer.md](phases/phase-12-offer.md) (the offer this closes).

---

## 1. Why: the promise we sell and the product we ship

What the site says today:

| Where | Claim |
|---|---|
| `OFFER.brand.hero.title` | "Your month of posts, done in 10 minutes." |
| `PLANS.brand_pro.tagline` | "Your whole month of posts, done." |
| `PROMISE` / `OFFER_SHARED.promiseFeed` | "Post 12 Next5 photos in 30 days. If they don't beat your last 12 posts, your next month is free." |
| `OFFER.brand.stack` | "New trend themes every month, ready on the 1st." |

What the app delivers: a **library of 120 photos**, each with a Post Kit and a Scroll-Stop Score. No month. No dates. No "post this one on Tuesday."

We sell a *month of posts* and ship a *pile of photos*. The customer still does the job she was paying us to remove: decide what to post, and remember to post it, twelve or more times. That decision, repeated, is exactly where solo pros drop off — the pattern in the research is that they go quiet the moment work gets busy, and that planning ahead is the single strongest predictor of actually posting ([c2-com](https://www.c2-com.com/real-estate-content-calendar-for-agents), [Icenhower](https://therealestatetrainer.com/social-media-calendar-for-real-estate-agents-free-download/)).

### The five concrete gaps

1. **The guarantee has no instrument.** We require 12 posts in 30 days to claim it, and the product counts zero posts. `parseClaim()` rejects `postsCounted < 12` — a number the customer types from memory. A guarantee whose condition we don't help her meet, or measure, is not a guarantee; it's a liability we can't verify and she can't reach.
2. **Posting cadence is our churn signal and we're blind to it.** A member who posts 3 times in month one churns in month two. We currently learn this at renewal.
3. **Score tips are orphaned.** `scoreDetails.tip` already returns things like *"Post it Tuesday evening with a question in the first line"*, and `bestFor` already classifies each photo as `feed | story | listing | profile | ad`. We generate per-photo timing advice and then have nowhere to act on it.
4. **Shop has a rhythm; Brand — whose entire pitch is the month — does not.** P17 gave Shop `DropSchedule`: a cadence, a weekday, an email, one-click create. Brand has nothing.
5. **`Theme.featuredMonth` is a calendar concept with no calendar.** One dashboard card consumes it. "New themes ready on the 1st" implies a month view that doesn't exist.

### What this is *not*: an auto-publisher

The obvious version of this feature — schedule and post for her — is a trap, on three counts.

**Compliance cost.** Instagram publishing requires a Business/Creator account linked to a Facebook Page plus `instagram_business_content_publish` through App Review: 2–4 weeks per submission, 4–6 weeks end to end ([Meta guide](https://www.getphyllo.com/post/instagram-api-integration-101-for-developers-of-the-creator-economy), [Storrito](https://storrito.com/resources/Instagram-API-2026/)). TikTok's Content Posting API forces every post from an unaudited client to **private-only**, caps it at 5 users per 24h, and passing the audit later does **not** publish the backlog ([TikTok docs](https://developers.tiktok.com/docs/en/content-posting-api-reference-direct-post), [Vorp Labs](https://vorplabs.com/agent-tools/tiktok-content-posting-api)). That's a two-month compliance project per platform before one photo reaches a feed.

**Wrong fight.** Auto-publishing puts us head-to-head with Later, Planoly and Metricool on scheduling, where they are years ahead and cheaper. Their calendars all start **empty and wait for you to fill them**. That's the whole opening: ours arrives **already full**, because we made the photos and wrote the captions. We should compete on "the plan is already made", not on "we press post."

**Wrong user.** Our ICP posts from her phone, between clients. The handoff we need to win is 20 seconds long: save photo → copy caption → open app → paste.

So: **Next5 is not a scheduler. It's the thing that makes the plan and hands you the post at the right moment.** Publishing is P19.8, gated on real demand, Instagram first.

---

## 2. The feature: the Calendar

A month of dated slots, filled automatically from photos we already made, with a phone-first hand-off and a counter that closes the promise loop.

Named **Calendar** (not "Plan") throughout — `src/config/plans.ts` already owns the word "plan" for billing.

### 2.1 It is never empty

When a batch finishes, we already hold, per photo: a score, a `bestFor`, a tip, and (Growth) a hook, caption and hashtags. The filler takes the member's cadence — say Tue/Thu/Sat — and places photos into the next open dates:

- highest **score** first, so her best photo goes out first;
- `bestFor: 'feed'` on her cadence days, `'story'` as an extra same-day slot, **`'profile'` never scheduled** (it's a profile picture, not a post);
- never two photos from the same `sceneId` back to back, so the feed doesn't look repetitive;
- when the tip names a day or an evening, honour it if that slot is free.

She opens the Calendar and the month is already planned. That is the demo, the screenshot, and the reason to renew.

### 2.2 Autopilot, because most people don't like posting

Two different autopilots hide behind one word, and only one of them is blocked:

- **Generating** can be fully automatic. Nothing stops us.
- **Publishing** cannot (§1). Some human action has to carry the photo into her feed.

So the design rule is: **automate everything up to the last twenty seconds, and make those twenty seconds not feel like homework.**

**Generation runs by itself, once she has made one batch by hand.** Monthly credits expire one month after they're granted (`subscriptions.ts:103`) — use-it-or-lose-it. Credits we don't spend for her simply evaporate, so auto-generating is the pro-customer default, not a trap. It switches on after her **first manual batch** (§5.8), so she has seen and approved of the photos before we spend anything on her behalf. Guardrails: it spends the **monthly allowance only** — never top-ups, never an overdraft — it generates to the cadence (3×/week ≈ 12–15 photos, not 120), and a "review before creating" toggle exists for the cautious.

**It stays two weeks ahead of her, not thirty days ahead.** Generating a full month for a new member burns real WaveSpeed money on someone who may post twice and leave. Keeping a two-week buffer self-regulates: her library is always fresh, our cost tracks actual use, and **autopilot pausing is itself the churn alarm** — if she stops posting, we know within a fortnight instead of at renewal.

**Delivery, not reminders.** A reminder says *you haven't done your homework*; a delivery says *here's what we made for you*. Same email, opposite feeling — and the second one is the only one that survives contact with someone who dislikes posting. Therefore:

- **Weekly, not daily.** Four touches a month, each carrying three finished posts. Not twelve nags.
- **Never scold.** No "you missed 2 posts." Missed slots roll forward silently.
- **"Posted" is a by-product, not a chore.** Tapping *Copy caption* and *Save photo* marks the slot posted on its own, with an undo. Someone who dislikes posting also dislikes admin — so we never ask her to tick a box to keep her own guarantee alive.
- **The .ics feed stays**, because it's passive: her slots simply exist in her phone calendar without anything nagging her.

The Post sheet itself is the twenty seconds: photo (Save), hook and caption (Copy), hashtags (Copy), a deep link that opens Instagram or TikTok. Optional paste-the-link field for a stronger promise claim.

### 2.3 The drop box — her real business, not generic photos

This is the larger unlock, and it is what makes the autopilot worth having.

A realtor gets 30 new listings. A spa has treatment rooms and results. That material already arrives in her business — she just never turns it into posts. If she can dump it in one place, the month fills with **specific, timely** posts instead of generic office backdrops:

> She uploads 30 listing photos → 30 planned posts with her in them.
> The spa uploads 6 treatment photos → 6 planned posts with the owner in them.

Every industry splits the same way, which is what makes this shippable:

| Layer | Needs from her | Fills the month |
|---|---|---|
| **Evergreen base** — the existing `THEMES` (market update, meet your agent, tips, behind the scenes) | nothing | always, even on a completely silent account |
| **Timely layer** — the drop box | one upload, whenever she has material | replaces evergreen slots as it arrives |

So **the calendar is never empty whether or not she ever uploads anything**, and it gets dramatically better when she does. That is the honest version of "saves you massive time": one action a month, or none.

Feasibility is good: `inputR2Keys` is already an array and Shop already passes product images through it. Brand passes only identity keys today (`expand.ts:60`), so this is an appended key plus a scene line in the brand composer — not a new pipeline.

### 2.4 Keeping her engaged without nagging

Progress, never guilt. The dashboard shows **"Your feed this month: 7 posted · 3 planned"**, and her Scroll-Stop average over time, so the app reports a scoreboard rather than a to-do list. Hitting 12 is a celebration *and* the moment the guarantee unlocks — the one number worth pushing toward, and it's the same number the promise already uses.

### 2.5 It closes the promise loop

`postsDone / 12` for the rolling 30-day window, on the Calendar, the dashboard and the billing `PromiseCard`. At 12 the claim form unlocks with `postsCounted` and the post links **prefilled** from what she marked as posted.

That does three things at once: it makes the guarantee reachable, it turns a self-report into a near-audited claim, and it gives us posts-per-week as a live retention metric per workspace.

### 2.6 Brand only

Shop does not get a calendar. Its value is bulk creation, consistency and scoring — a seller listing 30 products a week does not need to be told which day to post. `DropSchedule` (P17) already gives Shop its rhythm and stays exactly as it is. The `post_slots` table keeps a nullable `product_id` so a Shop calendar remains possible later without a migration, but nothing in this phase writes it.

---

## 3. Technical plan

### 3.1 Migration — `db/migrations/2026xxxx_calendar.sql`

```
post_schedules   -- mirrors drop_schedules deliberately
  id, workspace_id UNIQUE, active bool,
  weekdays int[],            -- 0–6, e.g. {2,4,6}
  posts_per_week int,        -- 2 | 3 | 5 | 7
  timezone text,             -- IANA, captured from the browser on first save
  auto_fill bool default true,      -- place photos into slots
  autopilot bool default true,      -- and generate them without being asked
  buffer_days int default 14,       -- stay this far ahead, never a full month (§2.2)
  weekly_digest bool default true,  -- "3 posts ready" — a delivery, not a nag
  ics_token text UNIQUE,     -- calendar subscription
  last_filled_at, last_generated_at, created_at, updated_at

post_materials   -- the drop box (§2.3)
  id, workspace_id, r2_key, kind text,       -- listing | room | result | other
  label text null, note text null,           -- "24 Oak St, kitchen"
  used_at timestamptz null, archived_at null,
  created_at

post_slots
  id, workspace_id, schedule_id null,
  scheduled_for date, slot_of_day text,      -- morning | midday | evening
  item_id  -> batch_items null,
  material_id -> post_materials null,        -- what it was built from
  product_id -> products null,               -- reserved; unused in P19 (§2.6)
  platform text,                             -- instagram | tiktok | facebook | linkedin | other
  status text,                               -- planned | posted | skipped
  post_url text null, posted_at timestamptz null,
  caption_override text null,
  source text,                               -- auto | manual | drop
  created_at, updated_at
  INDEX (workspace_id, scheduled_for), INDEX (item_id)
```

### 3.2 Server — `src/server/calendar/`

| File | Contents |
|---|---|
| `schedule.ts` | **pure**: `nextSlotDates(from, weekdays, count, tz)`, `placeItems(items, dates)` with the ordering rules from §2.1. Unit-tested on fixtures, same shape as `drops.ts`. |
| `calendar.ts` | `getCalendar`, `saveSchedule`, `autoFill(workspaceId)`, `markPosted`, `skipSlot`, `moveSlot`, `postsInWindow(workspaceId, days)`. |
| `autopilot.ts` | `runDueAutopilot(now)` — for each workspace under its buffer, build a brand draft (drop-box material first, then the featured theme) and create the batch. Spends the monthly allowance only; stops at `buffer_days`; pauses and flags the workspace when nothing has been posted in 14 days. |
| `materials.ts` | drop box: upload, list, archive, `claimNextMaterial()`. |
| `digest.ts` | `sendWeeklyDigest(now)` — "3 posts ready this week", never "you missed 2". |
| `ics.ts` | token-authed VCALENDAR feed. |

Auto-fill hooks into batch completion via `after()`, next to where scoring already runs, so a finished batch lands in the month without a click. `runDueAutopilot` and `sendWeeklyDigest` both hang off the existing `billing-daily` cron.

Brand generation needs one pipeline change for the drop box: `expandBrand` currently passes `identity.keys` only (`expand.ts:60`). It gains an optional material key appended to `inputR2Keys`, plus a scene line in `composeBrandPrompt` telling the model to place her in that room/property rather than the set's stock location.

### 3.3 Routes

```
GET  /api/app/calendar                 schedule + slots for a range
PUT  /api/app/calendar                 save cadence/timezone/reminders
POST /api/app/calendar/fill            top up or re-plan the month
PATCH /api/app/calendar/slots/[slotId] move | swap photo | skip | mark posted (+ link)
GET  /api/app/calendar/ics/[token]     public, token-authed feed
GET/POST /api/app/calendar/materials   drop box: list, upload
DELETE   /api/app/calendar/materials/[id]
```

### 3.4 UI — `src/components/app/calendar/`

- `CalendarView.tsx` — month grid on desktop, **agenda list on mobile** (the ICP is phone-first).
- `SlotCard.tsx`, `PostSheet.tsx` (the 20-second hand-off), `CadenceCard.tsx`, `ProgressBar.tsx` (7 posted · 3 planned), `DropBox.tsx` (upload + "what this becomes"), plus loading, error and empty states.
- Nav: **Calendar** (lucide `CalendarDays`) between Home and Create, brand only. On the mobile tab bar it takes the Sets slot.
- Dashboard: **"Today's post"** card — the single highest-value card in the app — beside `FeaturedThemeCard`.
- Billing: `PromiseCard` gains the counter and the prefilled claim.

### 3.5 Plan gating

Cadence, autopilot, the drop box and the counter are on **every** brand plan — never gate the thing the guarantee depends on, and never gate the thing that saves the most time. Starter slots carry the photo and the score tip; **captions come from the Post Kit, which is already Growth-only**, so the upsell lands naturally inside the feature instead of behind it. Digest and .ics: all plans.

### 3.6 Marketing — the reason we're doing this

- `OFFER.brand.stack` gains: *"Your month, planned and made for you — $150"* (basis: a month of a VA's content planning).
- `chatgpt.rows` gains: **What to post, and when** — *ChatGPT: you decide and make every post, every time.* / *Next5: your month is planned and the photos are already made.*
- The drop box is its own headline: **"Your listings, with you in them."** It is the clearest "ChatGPT can't do this" moment we have.
- New section on `/brand`: a real screenshot of a filled month.
- The promise copy changes from "tell us in the app" to **"the app counts your 12 posts for you"** — a claim that is now literally true, which is the D10 bar.

### 3.7 Tests

- Unit: `nextSlotDates` across month boundaries; `placeItems` ordering, scene spacing, `profile` exclusion; `postsInWindow`; autopilot buffer maths and the allowance-only spend guard.
- Integration: auto-fill on batch finish; autopilot generates only up to the buffer and never touches top-up credits; a material becomes a slot; copy-then-save marks posted; counter → claim prefill.
- E2E (`tests/e2e/brand-calendar.mjs`): finish a batch → open Calendar → month is full → open a slot → copy → counter reads 1. Second script: upload 3 materials → they appear as planned posts.

---

## 4. Phasing

| | Scope | Notes |
|---|---|---|
| **P19.1** | Migration, pure scheduler, tests | No UI. Lands green. |
| **P19.2** | Routes + auto-fill on batch finish | The calendar fills itself from what she already has. |
| **P19.3** | Calendar UI, Post sheet, dashboard card | The demo. |
| **P19.4** | **Drop box** + brand composer change | Her listings, with her in them. The real time saver. |
| **P19.5** | Autopilot generation + buffer + churn flag | Nothing left to ask her for. |
| **P19.6** | Weekly digest, .ics, promise counter | Closes the loop. |
| **P19.7** | Marketing: offer, `/brand` section, screenshots | The claim becomes true. |
| **P19.8** | *Later, separate decision:* Instagram publishing | Only if members ask. 4–6 weeks of App Review. |

### What shipped

| Piece | Where |
|---|---|
| Migration: `post_schedules`, `post_materials`, `post_slots`, `batch_items.material_id` | `db/migrations/20260920090000_calendar.sql` |
| Pure scheduler | `src/server/calendar/schedule.ts` |
| Calendar service, auto-fill, the counter | `src/server/calendar/calendar.ts` |
| Drop box | `src/server/calendar/materials.ts`, prompt in `composer/blocks.ts`, wired through `expand.ts` |
| Autopilot, allowance guard, churn alarm | `src/server/calendar/autopilot.ts` |
| Weekly delivery + .ics feed | `src/server/calendar/digest.ts` |
| Routes | `app/api/app/calendar/**` |
| UI | `src/components/app/calendar/**`, `dashboard/TodaysPostCard.tsx` |
| Tests | `tests/server/calendar/*` (38 unit/integration), `tests/e2e/brand-calendar.mjs` |

Notes from the build:

- **Autopilot spends `balance.byBucket.plan` only.** Top-ups she bought for something specific are never touched, and there is no overdraft. Activating a subscription already grants the month, which is the allowance autopilot draws down.
- **Marking a post done is inferred** from copying the caption or saving the photo, with an undo — never a checkbox.
- **The promise claim is prefilled** from what the calendar counted, including her post links.
- **`enableAfterFirstBatch`** treats a schedule whose `updatedAt` still equals its `createdAt` as untouched. Once she saves her settings, her choice wins for good.

P19.4 is the one to protect if the phase has to be cut short: a calendar of generic photos is a nice-to-have, a calendar of her actual listings is the product.

---

## 5. Decisions (2026-09-16)

1. **Cadence** — 3×/week, Tue/Thu/Sat, ≈12 posts a month, which is exactly the promise threshold. Progress is shown as a scoreboard, never a to-do list (§2.4).
2. **Mobile tabs** — Calendar takes the Sets slot: Home · Calendar · Create · Library · More.
3. **Brand only.** Shop keeps `DropSchedule`; its value is bulk creation, consistency and scoring (§2.6).
4. **Timezone** — read from the browser, no onboarding question.
5. **Autopilot over reminders** — generate automatically and stay two weeks ahead; one weekly delivery instead of twelve nags; "posted" inferred from copy + save (§2.2).

6. **The drop box is in scope for P19**, as P19.4. It roughly doubles the phase and is worth it: a calendar of generic photos is a nice-to-have, a calendar of her real listings is the product.
7. **Drop-box kinds: `listing` and `room` only.** No `result` / before-after material in the first release — that's the one kind carrying a real compliance edge, and beauty is not the lead ICP anyway (spas lean on video and discount graphics pushed through Facebook ads, not a photo feed). **Real estate is the drop box's first and best case**: a realtor's listings arrive constantly, are already photographed, and are exactly what she should be posting.
8. **Autopilot starts after her first manual batch**, not on day one. She sees what the photos look like and approves of them before we ever spend on her behalf — and the first batch doubles as the signal that she's a real, active member worth generating ahead for.

## 6. Notes for later

- **Beauty & wellness** is still listed in `BRAND.industries` and in the marketing copy. That stays for now — the finding above is about drop-box priority, not a decision to drop the segment. Worth revisiting separately once we have real members.
- **Publishing (P19.8)** stays parked until members actually ask for it.
