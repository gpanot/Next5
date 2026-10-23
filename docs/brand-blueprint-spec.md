# Spec: Brand Blueprint page (calls the script generator)

**Status:** ready for Claude Code
**Date:** 2026-10-23
**Repo:** `next5-landing` (put this file at `next5-landing/docs/brand-blueprint-spec.md`)
**Reference prototype:** `brand-blueprint-prototype.html` (put it next to this file). It is a working single-file page. Treat it as the behavior reference, not as code to paste in. Rebuild it in the repo's own stack and design system.
**Script generator MVP:** a separate standalone Node app (`script-generator-mvp`: `rules.js`, `server.js`, `public/index.html`), not inside this repo. The owner will give you its folder path. If it is not available, use the prompt in the prototype's `buildPrompt()` as the starting rulebook and say so.

---

## 0. How to work on this

1. Map the codebase first. The paths below come from `next5-labs-campaign-gap-analysis.md` (updated 2026-09-23) and `next5-ugc-suite.md`. Confirm each one and write down any difference before you start.
2. Build in the order of section 11. Each step must leave `npx tsc --noEmit` clean.
3. Follow existing conventions:
   - dbmate SQL migrations under `db/migrations/` (reversible), and the matching model in `prisma/schema.prisma`.
   - `authedRoute` + session + `requireWorkspace` for user-side API routes. `app/api/app/campaigns/route.ts` is the reference.
   - Files under 600 lines.
   - No `/api/admin/*` for anything customer-facing.
4. Check the existing **UGC Lab Hook Builder and Script Flow** (`src/components/labs/ugcLab/`, plus whatever server code backs them) before writing new hook or script code. Reuse shared pieces where it is clean, and do not fork a second hook generator without saying why. The new generator is format-aware (talking, carousel, B-roll) and works from the creator's own facts, whereas Script Flow writes from a character image. Keep the two separate unless merging is clearly simpler.
5. Ask before making any of the decisions listed in section 12.

---

## 1. Goal

Give a customer a guided page that takes them from nothing to **seven scripts they can record**:

1. Find topics to talk about (brand tree: Skills, Passions, Story).
2. Choose a format per day (talking head, carousel, non-talking B-roll).
3. Plan 7 days (branch + topic + format).
4. Generate a script for each day with the **script generator**.
5. Record from a teleprompter view.

This turns the script generator MVP into something a Next5 user touches, and gives the autopilot vision (see `next5-product-handoff-medium.md`) a front door: topics and formats chosen here are the same inputs a future campaign plan needs.

### Non-goals (this spec)

- No video rendering. Do not call UGC Lab, UGC Clone, Blitz Lab or Blitz Slideshow.
- No posting, scheduling or analytics.
- No campaign wiring (gap analysis steps 4 to 7). Only keep the door open (section 9).
- No payments. Credits are an open decision (section 12).

---

## 2. Content and IP note (read before copy is written)

The framework (three pillars, topic + format, three formats, three criteria, a mixed 7-day pattern) comes from a creator course. The prototype paraphrases it closely. Before this ships to customers:

- Rewrite all UI copy in Next5's own words. Do not reproduce slide text, example captions or the creator's name in the product.
- Do not copy the course's example posts. Use neutral or vertical-specific examples (realtor, TikTok Shop seller).
- Keep the structure if you like it, but treat the exact wording as something to replace.

The script generator rules must stay original, as already established in the MVP (`rules.js`).

---

## 3. User flow

One route, six steps, one step visible at a time, progress saved server-side. Mobile first (the user side is roughly 90 percent phone). Desktop is a centered single column, max width about 880px.

| # | Step | What the user does | Output stored |
|---|---|---|---|
| 1 | My Brand | Reads the tree and the "topic + format" idea. Sees the tree fill in live. | none |
| 2 | Topics | Types one topic per line under Skills, Passions, Story. Optional 60 second timer. Two prompt questions per pillar. | `topics` |
| 3 | Formats | Reads the three formats and good vs bad format. | none |
| 4 | Criteria | Reads three checks: strong hook, real value, re-hooks. | none |
| 5 | Plan + scripts | Fills the About card once. Per day: branch, topic (from own bank), format, optional hook idea, optional "details only you know", then writes a script. Ticks the three checks. | `about`, `plan[]` |
| 6 | Blueprint | Reviews everything as text. Copies it. | none |

### Pillar prompt questions (use these exactly in meaning)

- Skills: What do people ask me about? What am I learning right now?
- Passions: What do I spend my own money **or time** on? Who drives my purpose?
- Story: How did I get here? What did I used to believe?

### Default 7-day pattern

| Day | Branch | Format |
|---|---|---|
| 1 | Skill | Talking head |
| 2 | Story | B-roll with text |
| 3 | Skill | Carousel |
| 4 | Skill | Talking head |
| 5 | Passion | Carousel |
| 6 | Skill | B-roll with text |
| 7 | Story | B-roll with text |

All editable per day.

### Day status (drives the green "ready" state)

1. No topic: "Pick a topic"
2. Topic, no script: "Write the script"
3. Script, checks not all ticked: "Run the checks"
4. Script and all three checks: "Ready to record"

Header shows "N of 7 days ready to record".

---

## 4. Data model

Add one table, workspace scoped from day one (this is the lesson from gap 1 in the gap analysis: do not ship a global table).

```sql
-- db/migrations/<timestamp>_brand_blueprints.sql  (dbmate, with a down)
create table brand_blueprints (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  created_by    uuid not null references users(id),   -- confirm the real users table and id type; match the FK style of 20261011090000_lab_workspace_scope.sql
  topics        jsonb not null default '{"skills":"","passions":"","story":""}',
  about         jsonb not null default '{"aud":"","off":"","cred":"","voice":""}',
  plan          jsonb not null,                        -- 7 day objects, see below
  step          smallint not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index brand_blueprints_workspace_idx on brand_blueprints(workspace_id);
```

- One active blueprint per workspace for now. Enforce in code (get-or-create), not with a unique index, so a "start over" can archive instead of delete later.
- Add the Prisma model to `prisma/schema.prisma` to match.
- `topics.*` are raw text, one topic per line. Parse on read. Cap each at 4000 chars.
- `plan` day shape (validate with Zod on every write):

```ts
type Pillar = "skills" | "passions" | "story";
type BlueprintFormat = "talking" | "carousel" | "broll";

type PlanDay = {
  pillar: Pillar;
  format: BlueprintFormat;
  topic: string;          // chosen from the topic bank
  hookIdea: string;       // optional, max 200
  notes: string;          // "details only you know", optional, max 400
  checks: [boolean, boolean, boolean];
  script: Script | null;
};

type Script = {
  title: string;
  hook: { visual: string; onScreen: string; spoken: string };
  beats: Array<{
    label: string; spoken: string; onScreen: string; visual: string; rehook: string;
  }>;
  cta: string;
  caption: string;
  tips: string[];
};
```

Autosave: debounce 600ms, `PATCH` the whole changed field. Use optimistic concurrency (`updated_at` or a version int) so two open tabs do not overwrite each other silently.

---

## 5. Script generator integration

This is the core of the work. The MVP lives in a separate standalone Node app (`script-generator-mvp`: `rules.js`, `server.js`, `public/index.html`). Do not call it over HTTP. **Port its logic into the repo** so it runs server-side, inside the same auth, tenancy and cost tracking as everything else.

### 5.1 Port

Create `src/server/scriptGenerator/`:

- `rules.ts` (from `rules.js`): principles, structures, formats, goals, output schema, system prompts. Keep it as the single place to tune script quality.
- `generate.ts`: `generateScript(input): Promise<Script>` using a **forced tool call** so output is always structured JSON, as the MVP does.
- `hooks.ts`: `generateHooks(input): Promise<Hook[]>` (the hook stacking layer: 3 variants across angles such as contrarian, pain, stakes, proof, mistake).
- `refine.ts`: `refineScript({ script, instruction })` with the prompt-only scope guard from the MVP.
- Types shared with the client in `src/lib/scriptGenerator/types.ts`.

`generateScript` must be callable headlessly with plain inputs. The gap analysis (gap 4) needs exactly this shape for campaigns later.

### 5.2 Input mapping (blueprint to generator)

| Blueprint field | Generator input |
|---|---|
| `plan[i].format` | `format`: `talking` to `talking_head`; `carousel` and `broll` need new format entries (see 5.3) |
| `plan[i].topic` | `message` (the idea of the post) |
| `about.aud` | `audience` |
| `about.off` | added to `message` context |
| `about.cred` | `credibility` (optional, the MVP already has this) |
| `about.voice` | new optional `voice` field in the prompt |
| `plan[i].pillar` | new optional `pillar` field (Skill, Passion, Story) steering the angle |
| `plan[i].hookIdea` | `hook` seed. If empty, the generator writes the hook. |
| `plan[i].notes` | new `facts` field: the only personal details the model may use |
| (none) | `goal`: default `attract`; `structure`: default `ai_choose` |

### 5.3 Gaps in the MVP to close

- **Formats:** the MVP is built around talking head. Add `carousel` (5 to 7 slides, each slide is one beat, `onScreen` is the slide text up to about 14 words, `spoken` is empty) and `broll` (about 15 to 25 seconds, one shot per beat, `onScreen` is the line over the shot up to about 12 words, `spoken` is empty). The prototype's `FORMAT_BRIEF` is a working draft of both.
- **Schema:** the MVP's beat schema has `spoken`, `onScreen`, `rehook`. The page needs `visual` per beat and `hook.visual`, plus `caption` and `tips`. Extend the schema and the validator. Keep the MVP's 3 beat minimum for talking head. Carousel needs 5 to 7 beats, B-roll 3 to 6.
- **Facts rule (important):** the model must never invent facts, numbers, results, names or personal stories. It uses only `about` and `notes`. Where a personal detail is needed and missing it writes a bracketed placeholder such as `[the moment you decided to quit]`. This matters most on Story days. The UI must make placeholders visible (see 7.3).
- **Style rule:** no em dashes in generated text (already in the MVP prompts, keep it and add a post-check that strips or rejects them).
- **Hook stacking:** the first 3 seconds carry a visual, an on-screen line and a spoken line that each add something and point at one promise. Re-hook roughly every 8 to 10 seconds (talking head) or on every slide or shot after the first.

### 5.4 Hook selection

The MVP asks the user to pick one of 3 hook variants before the script. The prototype skips this (one call, hook inside the script). Support both:

- Default: one click, the script includes a hook.
- Optional "Show me hook options" link on a day calls `generateHooks`, shows 3 cards (angle, on-screen line, spoken line, first frame), and passes the chosen one into `generateScript` as `hook`.

Confirm with the owner whether hook selection should be required or skippable (open decision 12.2). Build it skippable unless told otherwise.

---

## 6. API

All routes under `app/api/app/blueprint/`, using `authedRoute` + `requireWorkspace`. No admin routes. Every query filters by the caller's `workspace_id`.

| Method + path | Purpose | Body | Response |
|---|---|---|---|
| `GET /api/app/blueprint` | Get or create the workspace blueprint | none | blueprint |
| `PATCH /api/app/blueprint` | Save changed fields (`topics`, `about`, `plan` day patches, `step`) | partial, with version | blueprint |
| `POST /api/app/blueprint/days/:i/script` | Generate a script for day `i` (0 to 6) | `{ hook?: Hook }` | `Script` (also saved to the day) |
| `POST /api/app/blueprint/days/:i/script/refine` | Change the current script | `{ instruction: string }` | `Script` (saved) |
| `POST /api/app/blueprint/days/:i/hooks` | 3 hook options | none | `{ hooks: Hook[] }` |

Rules:

- Build the generator input on the **server** from the stored blueprint. The client sends only the day index (and an optional chosen hook), never the prompt inputs. This keeps the tenancy boundary and stops prompt injection through the request body.
- Validate the model output with the Zod `Script` schema. On failure return a typed error (`SCRIPT_INVALID`) and let the client offer "Try again". Never loop retries server-side more than once.
- Cap input lengths: topics 4000 chars per pillar, `about` fields 200 each, `notes` 400, `instruction` 300.
- Rate limit per workspace (suggest 30 script calls per hour, tune later). Return `429` with a retry hint.
- Record cost for each model call in the same style as `UgcVideo.costUsdMicros` (new `script_generations` table or a column set, your call, but record it). It will be needed for the credits decision.
- Generation can take 20 to 60 seconds. Either stream, or return when done and keep the client showing progress with a Stop button. Do not time out below 90 seconds. If the route runs on a serverless limit, say so and propose the fix instead of silently shortening the prompt.

---

## 7. UI

### 7.1 Placement

New page in the customer app, for example `/app/blueprint`, linked from the main app navigation. Confirm the real route prefix for user-side pages first. Follow how existing app pages are composed under `src/components/app/` (for example `src/components/app/automation/`). Put the feature in `src/components/app/blueprint/` and keep every file under 600 lines.

Suggested split: `BlueprintPage.tsx` (step shell), `steps/` (one file per step), `BrandTree.tsx`, `TopicBank.tsx`, `DayCard.tsx`, `ScriptView.tsx`, `Teleprompter.tsx`, `useBlueprint.ts` (load, autosave, version handling), `useScriptGeneration.ts` (call, stop, error mapping).

### 7.2 Design

Use the app's existing design tokens and components. The prototype's colors and fonts are placeholders for the idea, not the target look. Requirements that matter:

- Mobile first. One column under 640px. The tree stacks its three branches on phones.
- Sticky step bar that scrolls horizontally on phones.
- Both light and dark themes if the app supports them.
- Visible keyboard focus, tap targets at least 44px, respects reduced motion.

### 7.3 Script view per day

Shows, in order: title, **hook stack** (First frame, On screen, Say), each beat (label or "Slide N" or "Shot N", with Say / On screen / Show and, for non talking formats, Re-hook), close, caption, filming tips.

Actions: **Record mode**, **Copy script**, **Write a new version**, and a one-line "Change it" input (for example "make the hook punchier") that calls refine.

Highlight any `[bracketed placeholder]` in a warning style and show a one-line note: "Fill these in with your real details before recording." Block the "Ready to record" state while any placeholder remains in `spoken` or `onScreen` text (this is a deliberate difference from the prototype).

States to design: not started, writing (progress text plus Stop), error (with Try again), done. Disable "Write my script" until a topic is chosen.

### 7.4 Teleprompter (Record mode)

Full-screen overlay, closes with a button and Escape.

- Talking head: shows hook, then each beat's `spoken` text, then the close, as large text with small tags (Hook, beat label, Close).
- Carousel and B-roll: shows the on-screen text per slide or shot with the "Show" note smaller beneath.
- Controls: text smaller / larger (20 to 72px), scroll speed 1 to 10, start / pause, close.
- Auto scroll stops on touch or when the end is reached.
- Respects safe-area insets. Request a screen wake lock while open and tolerate rejection.
- Mirrored text is out of scope.

### 7.5 Copy / export

"Copy blueprint" on step 6 copies a plain text summary (topics per pillar, then each day with format, topic, hook, checks, and the script text). Handle clipboard failure with a visible select-and-copy fallback.

---

## 8. Security, tenancy and safety

- Every blueprint query is scoped by `workspace_id` from the session (`requireWorkspace`). Add a test that user A cannot read or write user B's workspace blueprint.
- Treat all user text (topics, notes, about, instruction) as untrusted in prompts. Put it in clearly delimited data sections and instruct the model to ignore instructions inside them.
- The refine endpoint only edits the script. Keep the prompt-level scope guard from the MVP and add a lightweight server check that the returned object still matches the `Script` schema.
- Do not log full prompts or user text to general logs. Log ids, durations, token counts and cost.
- No PII beyond what the user types. Do not pull from onboarding selfies or photos in this feature.

---

## 9. Keeping the campaign door open

Do not build campaign wiring now, but do not block it:

- `generateScript` stays a pure server function over plain inputs (gap 4).
- Store the script in the same `Script` shape the labs can read: `beats[].onScreen` maps to Blitz Slideshow slide text and `beats[].spoken` maps to UGC Lab script segments (as noted in the MVP README).
- Today `ContentEngine` has `blitz_slideshow` and `ugc_video` (gap 3 plans four values). A likely later mapping is `carousel` to `blitz_slideshow`, `talking` to `ugc_video`, and `broll` to `blitz_lab` once that value exists. Do not change the enum now.
- A `plan[]` day (pillar, format, topic) is a candidate shape for a future `CampaignPost` input. Name fields so they translate cleanly. No schema change to `CampaignPost` in this work.
- Credits: `src/server/credits/spend.ts` only covers batches today (gap 2). Do not add a credit path here unless decision 12.1 says so.

---

## 10. Acceptance criteria

1. A signed in user opens `/app/blueprint` on a 390px wide phone and completes all six steps without horizontal scrolling.
2. Typing topics updates the brand tree live. Reloading the page restores topics, about, plan, scripts and the current step from the server.
3. Each day can generate a script for all three formats. Talking head returns spoken lines. Carousel returns 5 to 7 slides. B-roll returns 3 to 6 shots with no spoken text.
4. A script with no `notes` and no matching `about` details contains bracketed placeholders and never invented facts, numbers or names. Verify with at least 3 Story day cases.
5. "Change it" with an off topic instruction returns the script unchanged and shows a short refusal.
6. Record mode scrolls, pauses, resizes text and closes cleanly on phone and desktop.
7. A day shows "Ready to record" only when topic, script, no placeholders, and three checks are all true.
8. A second workspace cannot read or modify the first workspace's blueprint (automated test).
9. Rate limit and invalid model output both produce a visible, recoverable error, not a blank state.
10. `npx tsc --noEmit` clean, no new lint errors, migration applies and rolls back.

### Tests to write

- Unit: input mapping (section 5.2), Zod schemas, day status function, placeholder detector, teleprompter text builder.
- API: auth required, tenancy, validation caps, rate limit, invalid model output handling (mock the model client, as the MVP did with a mock API server).
- One end to end happy path with the model mocked.

---

## 11. Build order

1. Map the repo. Write a short list of confirmed paths and any differences from this spec.
2. Migration + Prisma model + Zod schemas + `GET`/`PATCH` routes + `useBlueprint` autosave.
3. Page shell, step bar, steps 1 to 4 (static content, brand tree, topic bank with timer).
4. Port the script generator (`rules.ts`, `generate.ts`, `refine.ts`, `hooks.ts`), add `carousel` and `broll` formats, extend the schema, add facts and placeholder rules. Test with a mock model.
5. Script routes (generate, refine, hooks) with limits, validation, cost recording.
6. Step 5: About card, day cards, script view, status logic, optional hook options.
7. Teleprompter.
8. Step 6: blueprint summary and copy.
9. Tests, tsc, lint, then a manual pass on a phone.

---

## 12. Open decisions (ask before building the affected part)

1. **Credits:** should script generation spend credits or be free for now? Recommendation: free with rate limit in v1, record cost so the reserve and settle path (gap 2) can be added later.
2. **Hook selection:** required before every script, or skippable? Recommendation: skippable (one click default).
3. **Where it lives in navigation:** top level item, or inside the Calendar / Campaign area?
4. **Vertical presets:** pre-fill example topics and the About card for realtors and TikTok Shop sellers? Recommendation: add later, once the base flow is live.
5. **Model and tier:** which model and effort for script generation, and whether refine uses a faster tier.
6. **Single vs multiple blueprints per workspace:** this spec assumes one active blueprint.
7. **Copy ownership:** who rewrites the UI text per section 2 before launch.

---

## 13. Reference: what the prototype does that the build must keep

- Brand tree renders from the topic text, three branches, chips per topic.
- 60 second timer on the topics step (start / reset, no forced stop of typing).
- Topic selector per day lists only topics from the bank, and a removed topic is flagged rather than silently dropped.
- Script prompt rules the prototype already uses: one idea per video, stacked hook, re-hook cadence, conversational short sentences, no filler openers, never invent facts, bracket placeholders, no em dashes, format specific length limits.
- Copy buttons never claim success when the clipboard is blocked.
- Reset requires a second tap to confirm.
