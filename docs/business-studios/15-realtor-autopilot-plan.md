# P23 — Realtor Autopilot (Campaigns, reworked for real estate)

Status: **Phase A built 2026-11-12** (Just listed, 3-step flow, slideshows + listing videos, calendar). Phase C2 built 2026-11-12 (Market update playbook, "Where do you sell?", `market_snapshots` cache, neighborhood cache). Phases B, C, D, E not built.
C2 notes: market update cards are designed stat cards (no photos), 1 hook + up to 4 stats + CTA; a stat is kept only with a live source URL and a fresh date; unpaid users see a locked card that opens Billing (the sample carousel is not built); one post per tap — the weekly repeat comes with the Phase D Sunday job. Verified 2026-11-12: Smyrna GA, Austin TX, Banning CA each got 6 sourced stats.
Phase A notes: approve books the days as `planned` and starts making at once (per-day approve on the calendar comes later); nothing is charged yet (listing videos were already free); the deterministic Fair Housing blocklist shipped early (the nano layer is still Phase B); the neighborhood beat already uses `gpt-5.4-mini` + web search (§4.7).
Replaces for realtors: the 8-step campaign wizard at `/app/brand/automation` ([phase-01-campaign-wizard.md](phases/phase-01-campaign-wizard.md)).
Related: [11-calendar-plan.md](11-calendar-plan.md) (the calendar we fill), [12-listing-mode-plan.md](12-listing-mode-plan.md) (no invented interiors), [13-zillow-import-plan.md](13-zillow-import-plan.md) (where listings come from), [../realtor-video-presets.md](../realtor-video-presets.md) (Editorial + Rate this house videos).

---

## 1. Why

Next5 now sells to realtors only (plus TikTok Shop). The Campaigns wizard was built for a generic small business:

| Step today | What it asks | Why it misses a realtor |
|---|---|---|
| Goal | Get leads / Get enquiries / Sell something | A realtor always wants leads. The real question is "what is happening this week?" |
| Message | Brand info or custom subject + offer | The listing already holds the facts (address, price, beds, baths, sqft, status). |
| Plan | A week from the Template Engine | Generic pillars. No idea of a listing's life (coming soon → open house → sold). |
| Cadence | Weeks × posts per day | The moment sets the length: a launch is 7 days, an open house is 3. |
| Footage | Upload clips / product photos / generate | A realtor has listing photos, not footage. Generated interiors are a legal risk (P20). |
| Generate, Review, Book | | Fine, but 8 steps before value. |

What we keep: **semi-automatic gap filling**. Next5 proposes, she approves, the calendar fills. That is the part the user likes, and the part competitors (Later, Planoly, Metricool) do not have: their calendars start empty.

## 2. The idea in one line

**The calendar shows empty days. One tap fills them with a realtor playbook. Listing videos anchor the plan, slideshows fill the days between.**

## 3. User flow (phone first, 390px)

### 3.1 Entry points

1. **Autopilot page** (renamed from "Campaigns"; route stays `/app/brand/automations`).
   - Top: coverage bar, "22 of the next 30 days planned".
   - Card per active listing with no content: "123 Oak St — Just listed, nothing planned. **Plan launch week**".
   - Primary button: **Fill empty days**.
   - List of past and current playbooks below (same list as today, new labels).
2. **Calendar** (`/app/brand/calendar`): an empty day shows a small "Fill" chip that opens the same sheet, preselected to that date.
3. **Listing import done** (Zillow import): the success state offers "Plan this listing's launch week".
   **Zillow sync status change** (e.g. flips to `just_listed`, `open_house`, `sold`): **suggest only, never auto-start.** Show a card on the Autopilot page and a line in the next recap email: "123 Oak St is now Just listed — plan launch week?". One tap opens Step 2 with the playbook preselected.
4. **Weekly autopilot email** (§3.4).

### 3.2 Three steps instead of eight

**Step 1 — What's happening?** One question, big cards:

| Card | Needs | Default length |
|---|---|---|
| Just listed | a listing (pick or paste Zillow URL) | 7 days |
| Open house | a listing + date and time (two ways, §3.2.1) | 3 days, ending on the open house day |
| Price drop | a listing + new price | 3 days |
| Just sold | a listing (status sold or typed) | 2 days |
| Market update | her market area (§4.6) | 1 post, weekly or monthly |
| No listing this week | nothing | fills every empty day in the next 7 days |

If a listing's Zillow status is known, preselect the matching card (`coming_soon`/`just_listed` → Just listed, `open_house` → Open house, `sold` → Just sold).

#### 3.2.1 Open house date and time — both options

1. **From Zillow** when the import or sync has open house data: prefilled, shown as "From Zillow: Sat Nov 15, 1–3pm", editable.
2. **Typed** in Step 1 when Zillow has none, or she changes it: date + start + end time pickers.

Store the result in `Campaign.eventAt` / `eventEndAt` with `eventSource` = `zillow | typed`. If a later Zillow sync changes the time, do not overwrite a typed value; show "Zillow now says 2–4pm — update?".

**Step 2 — Your plan.** Day cards on the real dates (reuse `PlanStep` layout). Each card: weekday, format icon (video or slideshow), one-line idea, thumbnail when ready. Actions per day: swap idea, skip day, move day. Days already filled on the calendar are shown greyed and never overwritten.

**Step 3 — Approve.** One button: "Approve and make my posts". Cost line in credits above it. On approve: generate (listing videos via `realtorVideo/jobs.ts`, slideshows via the slideshow engine), posts land on the calendar as `review`, same as prospect packs (review before generate). She approves each day on the calendar or in the 8am recap email.

No Message, Cadence or Footage step. Facts come from the listing and Brand profile; photos come from the listing gallery; length comes from the playbook.

### 3.3 "Fill empty days" without a listing

Finds empty days in the next 7 days (or 14 for paid plans), and fills them with evergreen beats (§4.5). If she has an active listing with no content, ask first: "Promote 123 Oak St in these days too?" — Yes mixes in listing beats, No stays evergreen.

### 3.4 Weekly autopilot

Opt-in toggle on the Autopilot page: "Every Sunday, plan my empty days for next week."

- Sunday 6pm local: find empty days next week, draft them with the right playbook (active listing beats first, evergreen after), status `review`.
- Email: "Next week is planned — 5 posts ready to approve." Links to the calendar.
- **Never spends credits on its own.** Drafts are plans (ideas + captions). Generation starts on her approve, same rule as Shop `DropSchedule`.

## 4. Playbooks

A playbook is a fixed list of beats. Each beat = day offset + format + idea template. The generator writes the idea and caption from listing facts + Brand profile. Beats are code (a typed const), not admin-editable in v1.

Format legend: **V** = listing video (Editorial or Rate this house, existing presets). **S** = slideshow (Brand Cast or listing photos). Photos rule in §5.

### 4.1 Just listed (7 days)

| Day | Format | Beat |
|---|---|---|
| 1 | S | Coming soon teaser: 3 best photos, address hidden, "Guess the price?" |
| 2 | V (Editorial) | Just listed — the anchor post |
| 3 | S | Room by room: 6 rooms, one line each, real photos only |
| 4 | V (Rate this house) | "Rate this house 1–10" — engagement |
| 5 | S | Neighborhood: what is 5 minutes away (§4.7; location = listing address; no school ratings) |
| 6 | S | "3 things buyers miss on a tour" using this house as example |
| 7 | S | Still available / Open house reminder / Under contract (picks by current status) |

### 4.2 Open house (3 days, last day = open house day)

| Day | Format | Beat |
|---|---|---|
| −2 | V (Editorial) | Open house this weekend, date and time on the end card |
| −1 | S | "What to look for at an open house" (5 checks) |
| 0 | S | Today, address + hours, "Comment TOUR for a private showing" |

### 4.3 Price drop (3 days)

| Day | Format | Beat |
|---|---|---|
| 1 | V (Editorial) | New price, old price struck through |
| 2 | S | What this price buys in this zip (only if we have real comps; else skip) |
| 3 | V (Rate this house) | "Worth it now?" |

### 4.4 Just sold (2 days)

| Day | Format | Beat |
|---|---|---|
| 1 | S | Sold: photo + days on market (real number from listing, else omit) |
| 2 | S | "Thinking of selling? DM VALUE for a free home value" — Brand Cast face |

### 4.5 Evergreen (no listing)

Rotating pool, no repeat inside 30 days. All slideshows, generated scenes allowed (no property shown as a listing).

**Face: both modes.**
- Agent picked a Brand Cast avatar → her face on hook and CTA slides, scenes with her in them.
- No avatar → faceless: real-looking local scenes (streets, homes from outside, coffee shops, keys on a table) and text-led slides. Same beats, same CTAs.
- Evergreen never blocks on the avatar. The faceless mode is not a fallback error state; it is a normal output.

Pool:
- Buyer myth / seller myth
- "Mistakes first-time buyers make"
- Day in the life of an agent (Brand Cast mode only; faceless mode skips it)
- Neighborhood spotlight (§4.7; location = her market area)
- "What $X buys in {city}" — only with real listings she owns or sourced comps, else skipped
- Client story (only if she typed one in Brand profile)

Market update is its own playbook (§4.6), not part of this pool.

### 4.6 Market update (weekly or monthly carousel)

People love these: they feel updated on what is going on, can talk about it, and share it. One of the best-performing realtor formats. So it gets its own slot, not a random evergreen pick.

- **Format:** small carousel of stats, 5–6 slides. Slide 1 hook ("{City} housing market — November 2026"), slides 2–5 one stat each (big number + one plain line: what it means for buyers / sellers), last slide CTA ("DM VALUE for what your home is worth now").
- **Cadence:** **weekly by default** (every Monday); she can switch to monthly (first Monday) or off. Weekly autopilot always reserves that day for it.
- **Location:** her market area — city or county + state, up to 3 zips or neighborhoods. Asked once (§4.8).
- **Stats wanted (pick the 4 with data):** median sale price and change, median days on market, active inventory and change, new listings, mortgage rate (30-yr fixed), sale-to-list ratio, % of homes sold over asking.
- **Data:** `gpt-5.4-mini` via the OpenAI Responses API **with the `web_search` tool on**. The model alone has no current numbers and will invent them, so web search is required, not optional.
  - Output: flat top-level JSON keys, per stat: `value`, `change`, `period`, `sourceName`, `sourceUrl`, `asOf`.
  - Accept a stat only if it has a `sourceUrl` and a recent `asOf`. Weekly-moving stats (mortgage rate, active inventory, new listings) need `asOf` within 14 days. Monthly-reported stats (median sale price, days on market, sale-to-list) may be up to 45 days old and are labeled with their own period on the slide ("Oct 2026"). Drop the rest.
  - Weekly data is thinner, so each week leads with what changed: at least 1 weekly-moving stat per carousel, and never the exact same 4 stats + values as last week (rotate the angle: buyers, sellers, rates, inventory).
  - Fewer than 3 accepted stats → skip this update, do not pad. Log the miss.
  - Prefer sources in this order when the search returns several: Redfin Data Center, Realtor.com research, Zillow research, local MLS / Realtor association monthly report, Freddie Mac PMMS (rates only).
  - Last slide footnote and caption: "Source: Redfin, Oct 2026" (source names + period).
- **Cache:** one research call per market area per period, shared across workspaces with the same area. Stored in `MarketSnapshot`.
- **Fair Housing guard** runs on the slide lines too (no "best area for…" phrasing).

### 4.7 Neighborhood beat — "what is 5 minutes away"

- **Data:** `gpt-5.4-mini` with `web_search` on. Input: the location (listing address for §4.1, her market area for evergreen). Output: 5 places (name, type, approx. minutes by car or on foot, `sourceUrl`).
- Allowed types: parks, coffee, groceries, restaurants, gyms, trails, transit, shopping. Not allowed: schools ratings, places of worship, "safe" or demographic claims (Fair Housing).
- Distances as "about 5 min drive"; no exact claims we cannot check.
- Cache per address / area for 90 days.

### 4.8 Asking the location

- Listing beats: location = listing address, nothing to ask.
- Evergreen + market update: ask once, the first time either runs. One field, "Where do you sell?" — city + state, optional zips or neighborhoods (max 3). Stored on the workspace (`Workspace.marketArea`), editable in Brand profile. Prefill from the city of her imported listings when she has some.

## 5. Photos and compliance rules

1. **Listing beats use real listing photos only.** No generated interiors, no restyled rooms, no virtual staging (P20, NAR Article 12, California AB 723). If a beat needs a room the gallery lacks, drop that slide, never invent it.
2. **Brand Cast faces** may appear on listing beats only on hook or CTA slides, never placed inside the listing's rooms.
3. **Evergreen beats** may use generated scenes (Brand Cast pipeline, `photoRules.ts`), but never caption a generated house as a real address or listing.
4. **Fair Housing guard** on every caption, slide text and voiceover script, enforced at write time like the Blitz pitch guard:
   - Block familial-status, religion, race, disability, national-origin, sex steering. Examples to block: "perfect for families", "great for young couples", "safe neighborhood", "walking distance to church", "exclusive community", "ideal for empty nesters".
   - Rewrite to property facts: "3 bedrooms", "fenced yard", "0.4 miles to Main St park".
   - Two layers: a phrase blocklist (cheap, deterministic) + one nano LLM check on the full text. Fail = regenerate once, then drop the beat and log it.
5. **Brokerage disclosure**: caption footer from Brand profile ("Listed by {agent}, {brokerage}"). Required field before the first listing playbook; ask once.
6. **No number we cannot source.** Days on market, price, beds come from the listing. Market stats and neighborhood places come from `gpt-5.4-mini` + web search with a source URL per item (§4.6, §4.7); no source = dropped.

## 6. CTAs (realtors pay for leads)

Each playbook ends its captions with one keyword CTA, picked by beat:

| Beat type | CTA |
|---|---|
| Listing | "Comment TOUR and I'll send you the details" |
| Open house | "Comment RSVP" |
| Sold / seller | "DM VALUE for a free home value" |
| Buyer evergreen | "DM BUYER for my first-time buyer checklist" |

Keyword list stored on the workspace so a later DM auto-reply feature can read it. No auto-reply in v1.

## 7. Data model (additive only)

`Campaign` already has `listingId`. Add:

```prisma
enum CampaignPlaybook {
  just_listed
  open_house
  price_drop
  just_sold
  market_update
  evergreen
  @@map("campaign_playbook")
}

model Campaign {
  // ...existing
  playbook      CampaignPlaybook? // null = old generic wizard campaign
  eventAt       DateTime?  @map("event_at")      // open house start
  eventEndAt    DateTime?  @map("event_end_at")
  eventSource   String?    @map("event_source")  // zillow | typed
  newPriceCents Int?       @map("new_price_cents")
  autopilot     Boolean    @default(false)       // drafted by the weekly job
}

model Workspace {
  // ...existing
  /// { city, state, zips?: string[], neighborhoods?: string[] } — "Where do you sell?"
  marketArea Json? @map("market_area")
}

/// One web-searched research result per area + period, shared across workspaces.
model MarketSnapshot {
  id        String   @id @default(cuid())
  /// normalized "city|state|zips" key
  areaKey   String   @map("area_key")
  /// market | neighborhood
  kind      String
  /// "2026-11" (monthly) | "2026-W46" (weekly) | "nbhd" (90-day cache)
  period    String
  /// accepted items only, each with sourceName, sourceUrl, asOf
  items     Json
  costUsdMicros Int? @map("cost_usd_micros")
  createdAt DateTime @default(now()) @map("created_at")
  @@unique([areaKey, kind, period])
  @@map("market_snapshots")
}

model CampaignPost {
  // ...existing
  format         String   @default("slideshow") // slideshow | listing_video
  beatKey        String?  @map("beat_key")      // e.g. "just_listed.room_by_room"
  listingVideoId String?  @map("listing_video_id")
}

model AutopilotSchedule {
  id           String    @id @default(cuid())
  workspaceId  String    @unique @map("workspace_id")
  active       Boolean   @default(false)
  weekday      Int       @default(0)   // 0 = Sunday, workspace local time
  horizonDays  Int       @default(7)   @map("horizon_days")
  /// off | weekly | monthly — reserves a Monday slot for §4.6
  marketUpdate String    @default("weekly") @map("market_update")
  nextRunAt    DateTime? @map("next_run_at")
  lastRunAt    DateTime? @map("last_run_at")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")
  workspace    Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  @@index([active, nextRunAt])
  @@map("autopilot_schedules")
}
```

`CampaignPost.templateId` / `versionId` are required today. Realtor beats either map to seeded `ContentTemplate` rows (one per beat, `audience` realtor) or the columns become nullable. **Prefer seeded templates** — keeps the Template Engine, swap list and admin views working.

Migration: dbmate on Railway before merge, then `prisma generate` (house rule).

## 8. Server pieces

| Piece | Where | Notes |
|---|---|---|
| Playbook defs | `src/lib/realtorPlaybooks.ts` | Typed const: beats, offsets, formats, CTA. Pure, unit tested. |
| Gap finder | `src/server/calendar/gaps.ts` | Empty dates in `[from, from + horizon)` across calendar items + scheduled campaign posts. |
| Planner | `src/server/campaigns/realtorPlan.ts` | Playbook + listing + gaps → `CampaignPost[]` drafts. Never writes over a filled day; shifts a beat to the next free day, drops it past the window. |
| Copy writer | reuse `realtorVideo/script.ts` for V beats; slideshow engine for S beats | Fair Housing guard wraps both. |
| Local research | `src/server/realtor/localResearch.ts` | `gpt-5.4-mini` + `web_search` for market stats (§4.6) and nearby places (§4.7). Validates source + date, writes `MarketSnapshot`, cost to meter. |
| Fair Housing guard | `src/server/compliance/fairHousing.ts` | Blocklist + nano check, flat top-level JSON keys (nano skips nested fields). |
| Generate on approve | existing `realtorVideo/jobs.ts` + slideshow jobs | One approve can queue up to 2 videos + 5 slideshows; respect `JOB_SLOTS`. |
| Weekly job | Railway cron, hourly, picks `AutopilotSchedule.nextRunAt <= now` | Drafts only, no credits. Sends email. |

## 9. Credits

- Plan (ideas + captions): free, cap 3 plans/day on unpaid.
- Listing video: existing price per video.
- Slideshow: existing price per slideshow.
- **Market update: paid plans only.**
  - Unpaid: the Market update card in Step 1 shows a lock and "Weekly market update for {city} — on paid plans", with one sample carousel (a past `MarketSnapshot` for a demo city, clearly labeled sample). Tap → upgrade.
  - Unpaid weekly autopilot does not reserve the Monday slot and never runs the research call, so no OpenAI spend on free workspaces.
  - On paid plans the research call is shared per area and period (`MarketSnapshot`), so cost per workspace drops as more agents share a city.
- Approve screen shows the total before spending. Out of credits → approve what fits, rest stays `review` with "Top up to make these".

## 10. What we remove or hide for realtors

- Goal step, Message step, Cadence step, Footage step.
- "Sell something" goal and product picker (Shop keeps the old wizard).
- "I will upload clips / film these shots" — realtors are not asked to film in v1.

Old Brand campaigns keep opening in the old wizard (`playbook = null`).

## 11. Phases

| Phase | Scope | Done when |
|---|---|---|
| A | Playbook defs, seeded templates, schema, Just listed only, 3-step flow from Autopilot page | Paste Zillow URL → 7 days on calendar as `review` → approve → 2 videos + 5 slideshows render |
| B | Fair Housing guard + brokerage disclosure | Blocklist test suite passes; sample of 50 generated captions has 0 flagged phrases |
| C | Open house (Zillow + typed time), Price drop, Just sold, Evergreen (face + faceless), "Fill empty days", calendar "Fill" chip | Every empty day in a test month can be filled in 2 taps |
| C2 | Market update carousel + neighborhood beat, `marketArea` question, `MarketSnapshot` | 3 test cities each get ≥ 3 sourced stats; every stat on a slide has a working source URL dated inside the window |
| D | Weekly autopilot + email | Sunday job drafts next week for a realtor test workspace, email lands, no credits spent |
| E | Coverage bar, listing cards with "nothing planned" | Page shows real coverage % on test workspaces |

Phase A alone is the demo: **one Zillow link → a full week of posts**.

## 12. Metrics

- % of next-30-days covered per active realtor workspace (target ≥ 60%).
- Plans approved / plans proposed (target ≥ 50%).
- Time from Zillow import to first approved week (target < 3 minutes).
- Weekly autopilot opt-in rate and approve rate.
- Fair Housing guard hits per 100 captions (should trend to near 0 after prompt tuning).

## 13. Decisions (2026-11-12)

1. **Open house time:** both — prefilled from Zillow when present, typed in Step 1 otherwise (§3.2.1).
2. **Neighborhood beat:** `gpt-5.4-mini` with web search; location = listing address, or her market area asked once (§4.7, §4.8).
3. **Evergreen face:** both — Brand Cast face when she picked an avatar, faceless otherwise (§4.5).
4. **Zillow status change:** suggest only, never auto-start (§3.1).
5. **Market update:** its own stats carousel, `gpt-5.4-mini` with web search, every stat sourced and dated, fewer than 3 stats = skip (§4.6).
6. **Market update cadence:** weekly by default, every Monday; monthly or off as options.
7. **Market update is paid only** (§9).

## 14. Open questions

None right now.
