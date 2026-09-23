# P0B — Template Engine

**Size:** L · **Depends on:** Phase 0A (`next5-phase0a-output.md`) · **Blocks:** Phase 1 (Campaign Wizard, `/automation`)
**Status:** Built · **Written:** 2026-09-23 · **Built:** 2026-09-23

## Goal

Build the warehouse the Campaign Wizard will sell from: a populated, queryable content-template
library, plus one function that turns `(workspace, goal, channels)` into a 7-slot week of real
templates with no human picking any of them.

Success test: a Next5 team member, using only an admin tool and a test call, can produce a sensible
7-day content plan for any signed-up business. If that works, Phase 1 is a form over a solved
problem. If it doesn't, Phase 1 is a form over an empty warehouse.

## Out of scope

Customer-facing wizard, content generation, publishing, performance-based ranking, self-serve
template editing. `performance` columns exist but stay null and are never read by matching.

## Decisions locked (do not re-litigate)

| # | Decision | Consequence |
|---|---|---|
| B1 | **ICP is per-workspace, read from Brand** — realtor, steel trader, garage all valid. No fixed niche list. | Templates seed as global and vertical-neutral. Vertical specificity lives in *variable values* (`SERVICE_PROVIDER` = "mechanic" / "listing agent"), pulled from Brand — never in separate per-niche template sets. |
| B2 | **B2B / B2C / Both is captured at signup step 2** and editable later on the Brand page. | `Workspace.audienceType`. Drives the primary matching filter. Step 2 is `ConsentStep.tsx` (labelled "Your Business"), so no step is inserted and `onboardingStep` numbering is unchanged. |
| B3 | **`Format` entity is cut for v0.** | Phase 0A produced 18 formats for 18 templates — a 1:1 taxonomy that groups nothing. Stored as a flat `formatSlug` string on the template. Re-add a table only when a real many-to-one grouping exists. |
| B4 | **`Interest` is dropped from the purpose enum and the weekly rhythm.** | Zero of the 18 templates carry it; the day-2 slot was unfillable. Rhythms are rewritten without it. |
| B5 | **Seed source of truth is a versioned JSON file**, not hand entry in the admin CRUD. | Reviewable in diff, re-runnable, and the 18 canonical write-ups in 0A §5 transcribe directly into it. |
| B6 | **Phase 1 reuses `PostSlot` / `PostSchedule`**, it does not invent parallel scheduling tables. | 0B's matching engine returns a shape that maps onto `PostSlot` rows. See §"Phase 1 compatibility". |
| B7 | **English-only template copy.** | Vietnamese was test-only. No localisation fields in the schema. |
| B8 | **Model prefix is `Content*`.** | `SetTemplate` and `BlitzTemplate` already exist. A bare `Template` model would be a third meaning of the same word. |
| B9 | **Variables and asset requirements hang off the template *version*, not the template.** | Editing either one produces a new version, so a generated plan can never be mutated underneath itself. This is what makes spec §0B.3 versioning actually buildable. |
| B10 | **All 18 templates ship `ACTIVE` on day 1.** | Person-on-camera was the only reason 0A §9 held 8 of them back, and it is not a constraint: we own talking-head footage, and the UGC Lab generates video with Seedance 2.5 or Wan 3.0 (`src/config/ugcLab.ts`). 18 actives also clears the spec's 15–20 acceptance bar. |

## Taxonomy normalisation (Phase 0A output → schema)

Phase 0A's write-ups are in spec shape but use free text in three places. These resolve once, in 0B.0.

**Purpose.** 0A `Goal:` lines are multi-valued free text (`Trust → Enquiry`, `Awareness + Trust (B2B)`).
The enum is `AWARENESS | TRUST | ENQUIRY | CONVERSION | ENGAGEMENT | RETENTION` — `INTEREST` dropped
per B4, `RETENTION` added because Template 12 needs it. Each template carries `purposes[]` (all it
serves) plus `primaryPurpose` (used for slot ranking).

**Asset kind.** 0A uses 13 tokens; the v3 spec enum lists 8, and the two sets only partly overlap.
The final enum is their union (16): `PERSON_ON_CAMERA`, `PRODUCT_FOOTAGE`, `PRODUCT_IMAGE`,
`LOCATION_FOOTAGE`, `CUSTOMER_PHOTO`, `CUSTOMER_FOOTAGE`, `LOGO`, `ON_SCREEN_TEXT`,
`BEFORE_AFTER_PHOTO`, `BEFORE_FOOTAGE`, `AFTER_FOOTAGE`, `DEMONSTRATION`, `SPEC_SHEET_BROLL`,
`TRENDING_AUDIO`, `SCREEN_RECORDING`, `GENERIC_SELFIE`.

**Audience.** Templates 09, 10 and 13 are explicitly B2B in 0A. Every template gets
`audience: B2C | B2B | BOTH`, matched against `Workspace.audienceType`.

Asset requirements do a second job here: they are the real guard against a bad vertical match.
"Warehouse Tour" requires `LOCATION_FOOTAGE`, which a realtor does not have, so it filters itself out
without any niche whitelist.

## Data model

```prisma
enum AudienceType    { B2C B2B BOTH }
enum ContentPurpose  { AWARENESS TRUST ENQUIRY CONVERSION ENGAGEMENT RETENTION }
enum TemplateStatus  { DRAFT ACTIVE ARCHIVED }
enum AssetKind       { /* the 16 above */ }

model ContentPillar {
  id, slug @unique, name, description, position
  templates ContentTemplate[]
}

model ContentTemplate {
  id, slug @unique
  legacyId         Int?      // 1..18, so existing consumers keep resolving
  name, pillarId, formatSlug
  audience         AudienceType  @default(BOTH)
  platforms        String[]      // ["tiktok","instagram"]
  purposes         ContentPurpose[]
  primaryPurpose   ContentPurpose
  workspaceId      String?       // null = global, owned by Next5
  parentTemplateId String?       // set when cloned as a workspace override
  activeVersionId  String?
  status           TemplateStatus @default(DRAFT)
  timesUsed        Int  @default(0)   // performance stub — never read by matching
  avgEngagementScore Float?           // performance stub — stays null in this phase
  versions ContentTemplateVersion[]
  @@index([workspaceId, status])
}

model ContentTemplateVersion {
  id, templateId, version Int
  hookPattern      String
  beats            Json    // [{ label, guidance, bgPrompt? }] — ordered structure
  suggestedSlides  Json    // [{ text, bgPrompt }] — kept verbatim; Blitz depends on it
  keywords         String[]        // drives matchPhase0ATemplate(hook)
  variables        TemplateVariable[]
  assetRequirements TemplateAssetRequirement[]
  @@unique([templateId, version])
}

model TemplateVariable {
  id, versionId, key, label
  type   String   // text | image | number | url
  source String   // brand | campaign | manual
  required Boolean, defaultValue String?, position Int
}

model TemplateAssetRequirement {
  id, versionId, kind AssetKind, required Boolean, minCount Int, notes String?
  fulfilment String  // upload | library | generate — how this asset can be satisfied
}

model TemplateUsage {
  id, workspaceId, templateId, versionId, purpose ContentPurpose
  plannedFor DateTime, campaignId String?, createdAt
  @@index([workspaceId, templateId, plannedFor])
}
```

`beats` and `suggestedSlides` are deliberately two fields, not one. The 0A structures run 4–6 beats
while the Blitz slideshow renders 3–4 slides; they are not 1:1 today, and collapsing them would
break `generate-slides`.

`TemplateUsage` exists in 0B, not Phase 1, because the spec's "don't propose the same template on
consecutive weeks" rule is otherwise untestable before a wizard exists.

## Work packages

Sequencing is strict: 0B.0 gates everything else.

### 0B.0 — Taxonomy pass (doc only, no code)
- [x] Map all 18 templates: `purposes[]` + `primaryPurpose` from the free-text `Goal:` lines.
- [x] Map every 0A asset token to the 16-value `AssetKind` enum.
- [x] Assign `audience` per template.
- [x] Assign `formatSlug` per template (flat string, per B3).
- [x] Set `fulfilment` per asset requirement (`upload | library | generate`). `PERSON_ON_CAMERA`,
      `DEMONSTRATION` and the before/after kinds are `generate`-capable via the UGC Lab; `LOGO`
      and `CUSTOMER_PHOTO` are not.
- [x] Day-1 `ACTIVE` set: all 18 (decision B10). 0A §9's 10-template recommendation is superseded.
- Done when: every template has an unambiguous row and no free text remains anywhere.

### 0B.1 — Schema + migration
- [x] Add the enums and six models above.
- [x] `Workspace.audienceType AudienceType?` (null until answered).
- [x] Verify no name collision with `SetTemplate` / `BlitzTemplate`.
- Done when: migration applies clean on a copy of production and existing models are untouched.

### 0B.2 — Seed
- [x] `prisma/seed/contentTemplates.json` — 6 pillars, 18 templates, each with v1, variables and
      asset requirements, transcribed from 0A §5.
- [x] Idempotent seed step keyed on `slug`, safe to re-run.
- Done when: the DB returns 6 pillars and 18 templates, and no template has an empty variable or
  asset-requirement list.

### 0B.3 — Retire `src/lib/phase0aTemplates.ts`
The hardcoded 355-line constant is the current source of truth for four consumers:
`Researcher.tsx:94`, `ResearchCard.tsx:72`, `BlitzSlideshowTab.tsx:295`, `generate-slides/route.ts:109`.
- [x] Move keyword matching server-side, preserving the `matchPhase0ATemplate(hook)` contract.
- [x] Keep `legacyId` resolving, because `generate-slides` passes a numeric `templateId` — moving
      straight to cuid breaks that route.
- [x] Delete the constant once all four consumers read from the DB.
- [x] **Every place a template is recommended must also state what that template requires.**
      Today the recommendation is a bare template name. It must render the version's asset
      requirements — e.g. "needs: 1 person-on-camera · optional logo" — plus each requirement's
      `fulfilment`, so the reader sees at a glance whether it is an upload, a library pick, or a
      Seedance / Wan 3.0 generation. Sites: the template disclosure in `ResearchCard.tsx:73`
      (`templateOpen`), the suggestion in `Researcher.tsx:94`, and the slide panel in
      `BlitzSlideshowTab.tsx:295`.
- Done when: all four consumers still work, each recommendation shows its requirements and how
  each one can be satisfied, and the file is gone.

### 0B.4 — Brand inputs for matching
- [x] `Workspace`: `audienceType`, `promoting`, `offer`, `positioning`, `geography`.
- [x] Signup step 2 (`ConsentStep.tsx`): add the B2B / B2C / Both question next to `industry`;
      persist via the existing `PATCH /api/app/onboarding/step` qual-data path.
- [x] Brand page (`BrandView.tsx`): show and allow editing of `audienceType`, `promoting`, `offer`.
- [x] Extend the website-extraction pass (`anglesExtractor`) to propose `audienceType`, `promoting`
      and `offer` as defaults the user can correct.
- [x] Backfill: existing workspaces default to `BOTH` until answered.
- Done when: the fields persist, are editable, and the matching service reads them.

### 0B.5 — Matching engine (the real deliverable)
`src/server/automation/matching.ts` — a pure service with no UI imports, called by Phase 1 later.

```ts
proposePlan(input: {
  workspaceId: string;
  goal: 'leads' | 'enquiries' | 'sell';
  channels: Platform[];
  weeks: 1 | 2 | 3 | 4;
  postsPerDay: 1 | 2 | 3;
  startDate: string;
}): Promise<PlanSlot[]>

type PlanSlot = {
  date: string; slotOfDay: 'morning' | 'midday' | 'evening';
  purpose: ContentPurpose; templateId: string; versionId: string; version: number;
  platforms: Platform[]; assetRequirements: AssetRequirementDto[]; requiredUploads: AssetRequirementDto[];
  widened: boolean;
};
```

Filter order, applied per slot:
1. `status = ACTIVE`.
2. `platforms` intersects `channels`.
3. `audience` matches `Workspace.audienceType` (`BOTH` always matches).
4. Slot purpose is in `purposes[]`; `primaryPurpose` match ranks higher.
5. Workspace override (`workspaceId` match) beats the global default.
6. Rotation: deprioritise anything in `TemplateUsage` for this workspace within the last 14 days.
7. Deterministic tiebreak, so the same input yields the same plan.

Default rhythms (a tunable constant, `Interest` removed per B4):

| Goal | Mon | Tue | Wed | Thu | Fri | Sat | Sun |
|---|---|---|---|---|---|---|---|
| leads | Awareness | Awareness | Trust | Trust | Enquiry | Trust | Conversion |
| enquiries | Awareness | Trust | Enquiry | Trust | Enquiry | Engagement | Conversion |
| sell | Awareness | Trust | Conversion | Enquiry | Conversion | Trust | Conversion |

Fallback rule: if a slot has zero candidates, widen to any purpose in `purposes[]` before ever
returning an empty slot, and record that the slot was widened.

- Done when: unit tests cover empty-candidate fallback, override precedence, audience filtering,
  asset-requirement exclusion, and no-repeat across two consecutive weeks.

### 0B.6 — Admin CRUD
- [x] `app/api/admin/content-templates/**` — create, edit, duplicate, archive, including variables
      and asset requirements.
- [x] Clone a global template into a workspace override (`workspaceId` + `parentTemplateId` set).
- [x] Editing an `ACTIVE` template writes a new `ContentTemplateVersion` and repoints
      `activeVersionId`; older versions stay readable forever.
- [x] Admin UI: the **Templates** tab in `/admin`
      (`src/components/admin/business/templates/`). Lists the library grouped by pillar with
      status/override filters; edits metadata in place; edits content as a new version; duplicates,
      archives, and clones a workspace override; shows version history.
- [x] Do not hardcode "only Next5 staff may write here" in a way that is painful to unwind —
      self-serve editing is a known future extension.
- Done when: an override created in the UI is picked up by matching with no restart, and a plan
  generated against v1 still reports v1 after the template is edited to v2.

### 0B.7 — Acceptance run
- [x] 3 test workspaces (one B2C service, one B2B supplier, one realtor) × 3 goals = 9 plans,
      generated with no human picking templates: `npm run acceptance:templates`.
- [x] Result: **9 plans, 7 slots each, no repeats inside a week.** 3 of the 63 slots are flagged
      `widened` — all in the B2C mechanic's conversion-heavy weeks (see "Known library gap").

## Phase 1 compatibility (`PostSlot`) — planned now, built in Phase 1

Reuse is viable. Verified against `prisma/schema.prisma` and `src/server/calendar/`.

**Already compatible:**
- `PostSlot.itemId` is nullable, and Postgres treats NULLs as distinct in
  `@@unique([workspaceId, itemId])` — so many campaign slots with no `BatchItem` coexist fine.
- `slotOfDay` is `morning | midday | evening`: exactly three values, mapping 1:1 onto the wizard's
  `postsPerDay: 1 | 2 | 3`.
- `scheduleId` is nullable, so campaign slots need not belong to the recurring schedule.
- `platform` already accepts `tiktok` (`PLATFORMS` in `calendar.ts:23`).
- `captionOverride` exists, so generated captions need no new column.

**Changes Phase 1 must make:**
- Add nullable `campaignId`, `templateVersionId`, `purpose` and a generated-content pointer
  (e.g. `blitzProjectId`) to `PostSlot`.
- Add `'campaign'` to the `source` vocabulary (currently `auto | manual | drop`).

**Breaker found — must be fixed before campaign slots are written:**
`replanUpcoming` (`src/server/calendar/calendar.ts:231`) re-dates *every* future slot with
`status: 'planned'`, filtered only by workspace and date. If a user changes their recurring posting
weekdays after a campaign is scheduled, every campaign slot silently moves. The `where` clause must
be scoped — `campaignId: null`, or `source: { not: 'campaign' }` — as part of Phase 1's first task.

**Decided (2026-09-23):**
- **`autoFill`'s `takenDates` counts campaign slots.** Auto-fill must not book a photo onto a day a
  campaign already owns.
- **A campaign post is one piece of content on every selected channel.** Phase 1 writes one
  `PostSlot` row per channel, sharing a campaign-post id, because posting can succeed on Instagram
  and fail on TikTok and each needs its own status. A 7-day two-channel campaign is therefore
  **7 content pieces and 14 slot rows** — Step 6's quota counts pieces, not rows.
  `proposePlan` returns `platforms: Platform[]` per slot to match.
- **The weekly digest must count campaign slots.** `sendWeeklyDigests` filters
  `itemId: { not: null }`, which only matches a generated photo, so a freshly scheduled campaign
  would produce an empty "nothing ready" week. Widen it to "the slot has any content".

**Also decided (2026-09-23) — these are Phase 1 implementation tasks:**

- **The ICS title uses the template name.** `buildIcs` falls back through
  `item.postKit.hook → material.label → 'Your Next5 post'`. A campaign slot has neither of the
  first two, so a whole scheduled week would read "Post: Your Next5 post" seven times in her
  calendar — worse than useless, since she cannot tell the days apart. Add the campaign slot's
  template name to the front of that fallback chain. Once generation fills the slot, the generated
  hook is the better title, so the order becomes
  `item.postKit.hook → template name → material.label → generic`.

- **An unposted campaign does trip `hasGoneQuiet`.** No change to the rule: 4+ past `planned`
  slots and nothing posted in 14 days pauses autopilot and raises the churn alarm. A member who
  scheduled a campaign and then posted none of it is exactly the member that alarm exists to
  catch — arguably more so than one who never scheduled anything, because she tried and stopped.
  Excluding campaign slots would blind the alarm to the clearest churn signal we have.

- **`autoFill` stays `brand`-only.** The early return at `calendar.ts:115` is deliberate, not an
  oversight: auto-fill books *generated portrait photos* onto open days, which is a Brand Studio
  concept. Shop has its own `DropSchedule`. A Shop campaign therefore writes its slots directly and
  never relies on auto-fill — so Phase 1 must not assume `autoFill` runs for Shop, and the Step 6
  scheduling path has to create Shop campaign slots itself.

## Acceptance criteria — Phase 0B done

- [x] 0B.0 taxonomy table signed off; no free-text goals and no unmapped asset tokens remain.
- [x] Tables exist and hold 6 pillars and 18 templates with variables and asset requirements populated.
- [x] Admin CRUD supports create, edit, duplicate, archive, including variables and assets — API
      and UI (the **Templates** tab in `/admin`).
- [x] Editing an active template does not change what an already-generated plan referenced.
- [x] A workspace override can be cloned from a global template and wins in matching.
- [x] Matching returns a valid 7-slot plan for 3 workspaces × 3 goals, with no empty slot.
- [x] Every active template's asset requirements are concrete enough for Phase 1 Step 5 to render
      without guessing.
- [x] B2B / B2C / Both is captured at signup and editable on the Brand page.
- [x] `src/lib/phase0aTemplates.ts` is deleted and all four former consumers are green.
- [x] Every template recommendation in the app states the template's asset requirements and each
      one's `fulfilment` — no bare template name anywhere.
- [x] All 18 templates are `ACTIVE`.
- [x] `timesUsed` / `avgEngagementScore` remain unread by matching.

## What the build changed from the plan

Two decisions were made while building, because the acceptance run disproved the plan's version.

**An override replaces its parent, it does not sit beside it.** The first override test produced a
plan containing both the customised template and the global one it was cloned from — two slots on
the same idea. `applyOverrides` in `src/server/templates/repository.ts` now hides a global template
from any workspace that overrides it. Other workspaces still see it.

**Variety is given up last, not first.** The plan said a slot should relax to "a template already
used in this plan" before relaxing the purpose. The acceptance run showed why that is wrong: the
`sell` rhythm asks for `conversion` three times, few B2C templates serve it, and the mechanic's week
came back with the same "24-Hour Pledge" video three times. The relax order in `pickForSlot` now
prefers a fresh template with a different purpose over repeating one, and flags the slot `widened`.

## Known library gap

`conversion` is thin for B2C businesses: only "24-Hour Pledge" carries it as a primary purpose, with
"If They Won't, We Will" secondary. Every `widened` slot in the acceptance run traces back to this.
It is not a bug — the matcher degrades exactly as intended — but the first expansion wave should add
two or three B2C conversion templates rather than more awareness ones.

## Not applied yet

The migration `db/migrations/20261009090000_content_templates.sql` has been applied to the local
test database only. Production needs `npm run db:migrate` followed by `npm run db:seed:templates`.

## Deferred

Self-serve template editing for business users. Performance-based ranking (needs publishing and
analytics first). LinkedIn as a channel. Anything past content generation in the core product loop.
