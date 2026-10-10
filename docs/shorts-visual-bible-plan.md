# Shorts Visual Bible: production plan

Status: steps 1-6 and the admin UI built 2026-10-10 (not yet checked on a paid run). Plan written 2026-10-09. Based on the A/B tests on EQL Apparel and Porsche (same scripts and voices, new images only).
The test code lives in `scripts/tmp-visual-ab/` and gets deleted once this ships.

## Problem

Shorts photos use the profile's one-line audience and a global documentary look, so they drift off-brand:

- `cast.ts` forces "vary ages, genders, ethnicities" on every beat. EQL (women aged 22-35) got women in their 40s and 50s.
- `photoStyle` (who, where, wardrobe) is cut to "colors and mood only" in `cast.ts` and `photoPrompt()`.
- `tone` never reaches the image prompts. The fixed `PHOTO_STYLE` ("candid documentary, slight imperfection") makes
  premium brands look cheap.
- `SHOT_TYPES` leans toward offices and desks, which fit neither apparel nor cars.
- Each beat is planned alone, and nothing keeps the person or the product the same from one beat to the next.

## What the tests showed

| Version | Result |
|---|---|
| Current production | Off-ICP people, off-tone settings (driveway in a polo for Porsche, a kitchen counter for EQL) |
| Visual Bible + storyboard | Right persona and tone. Problems: catalog poses, detergent shown in a bedroom, a body with no legs, garbled badges, the car model changing between beats |
| + action, setting and framing rules + QA check | Setting and anatomy fixed. The QA check was too strict on real brand logos |
| + anchor reference image + tuned QA | Same person and same product in all 7 beats for both brands; all 14 photos passed QA on the first try |

Cost per short at production settings: photos about $0.22 (7 photos plus 1 anchor, FLUX.2 at $0.028 each), the QA
checks a few cents, and Seedance clips about $2.30-2.50. Prompts and QA add almost nothing to the cost.

## Target pipeline

```
Brand profile ──► Visual Bible (once per brand, stored, editable in admin)
                        │
Script beats ──► Storyboard (1 call: shot, setting, person, product for each beat)
                        │
                Anchor photo (main character + hero product, no references)
                        │
        Beat photos (FLUX.2 + anchor in input_urls) ──► QA check (vision) ──► 1 retry
                        │
                Clips (unique frame keys) ──► Render
```

## Steps

### 1. Stale-frame fix (done 2026-10-09)

`photoStep` now writes `frame-<idx>-<runTag>.jpg`. reAPI served a cached first frame for a reused R2 path, so after a
photo re-run, the clips animated the old photos. Old frame files stay in R2 (cleanup is optional).

### 2. Visual Bible on the brand profile

- New type `VisualBible` in `types/admin/companyIntel.ts`, stored as `BrandProfile.visualBible?` (optional: old
  profiles fall back to today's behavior).
- Flat string keys (nano drops nested fields): `business_category`, `hero_product`, `primary_subject`,
  `person_age_range`, `person_look`, `wardrobe`, `environments`, `visual_style`, `product_visibility`,
  `shot_vocabulary`, `consistency_rules`, `avoid`, `design_story`.
- New `server/companyIntel/visualBible.ts`: one gpt-5.4-mini vision call over up to 5 site photos (the hero image plus
  `<img>` tags from the homepage, skipping logos, crests and icons) and the profile text. Prompt: the one in
  `scripts/tmp-visual-ab/bible.ts`, including these rules:
  - `hero_product` names the brand, model and color. Without it, the anchor drew a Mercedes instead of a Porsche.
  - `environments` are real-life places at the brand's price level, not mostly a photo studio.
  - `visual_style` is always bright daylight. Run the same banned-light filter as `cleanPhotoStyle`.
- Build it lazily: the first time a short is made for a workspace, if the profile has none, then save it on the
  profile. Auto Slideshow can read it later.
- Admin: show it on the shorts page with editable fields, so one manual fix covers every future short.

### 3. Storyboard replaces `cast.ts`

- One call per short. Flat keys `beat_N_shot | setting | person | product`.
- Rules that worked in the tests:
  - One main character described the same way in every beat; only the outfit may change. A second person only when the
    line needs one, and within the persona.
  - Variety comes from the scene: never the same shot type twice in a row, at least 3 settings.
  - Action beats: the line's key object or action is in the frame (the detergent bottle and cap in her hands).
  - The setting follows the action ("would a real person do this here?"): washing happens at a sink or in a laundry
    room, never in a bedroom.
  - Framing: a close-up has no person, or only hands or a natural crop. A full person only in medium or wide shots,
    with the body complete.
  - No labels, signs, text, prices or numbers. No light words in settings.
- Drop the global `SHOT_TYPES` rotation. Use the bible's `shot_vocabulary`.

### 4. Shot plans share the context (`visuals.ts`)

- Each beat's planner gets the bible block, the full storyboard and its own row (prompt: `SHOT_SYSTEM` in the test
  script).
- `photoPrompt()`: the shot, then `Photographic style: <bible.visual_style>`, in place of `PHOTO_STYLE`. Keep the text
  sanitizer.
- Keep today's prompts when a profile has no bible.

### 5. Anchor and reference images (`media.ts`)

- `makePhoto(prompt, meter, refs?: string[])`: when refs are given, send `input_urls` (public HTTPS, max 8; same
  price). The Gemini fallback ignores refs.
- The anchor is made first: a full-body photo of the main character beside (or wearing) the `hero_product`, in a plain
  bright setting. Store it as `shorts/<id>/anchor-<runTag>.jpg` and keep its key on the short.
- Every beat prompt ends with: "Keep the SAME person (face, hair, build) and the SAME <hero_product> as the reference.
  Change only place, pose, framing and action."
- Known side effect: early beats copied the anchor's standing pose. Add "a different pose and framing from the
  reference" to the beat prompt.
- Later: a real product photo as a second reference, when the brand has a clean one (a product page or an upload). The
  Porsche homepage only had crest close-ups.

### 6. QA check after each photo

- A gpt-5.4-mini vision call with the photo and the anchor. Prompt: `QA_SYSTEM` in `scripts/tmp-visual-ab/ref.ts`.
- Reject only for: anatomy errors, collage or split frame, a place that makes no sense for the action, garbled or
  invented text or logos (the brand's real marks spelled correctly are fine), identity drift from the anchor, and on
  action beats a missing key object. Never reject a hook or payoff for being "too abstract".
- On reject: one retry with the QA `fix` sentence added. Keep the better photo either way, so the short never fails
  on QA. Save `qa: {ok, problem}` on the beat and show it in the admin beat panel.
- reAPI's content filter can flag a prompt at random: retry once.

### 7. Rollout

- Put it behind a per-short flag (`visualMode: 'bible' | 'classic'`) on the create panel, default `bible` after one
  manual check.
- No new database column: the bible lives in the profile JSON and the flag in the short's `inputs` JSON.
- Files touched: `brand.ts`, `cast.ts` (replaced), `visuals.ts`, `media.ts`, `pipeline.ts`, `companyIntel.ts` types, a
  new `visualBible.ts`, `qa.ts`, and the shorts admin UI (bible editor, QA badge). Each file stays under 600 lines.
- Unit tests: bible parsing and cleaning, flat-key storyboard parsing, ref prompt building, QA fallback when the call
  fails.

## Out of scope, noticed during the tests

- EQL evidence lines are in Vietnamese ("designed in Vietnam"). Next5 is US-only, so the script grounding should filter
  non-English or non-US claims.
- Old frame files from earlier runs stay in R2. Clean them up later if storage matters.
