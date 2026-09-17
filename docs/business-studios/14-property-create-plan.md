# P22 — Create for a property: occasion and style instead of set and theme

Status: **built 2026-09-17.**
Related: [12-listing-mode-plan.md](12-listing-mode-plan.md) (never invent a room), [13-zillow-import-plan.md](13-zillow-import-plan.md) (status, photo tags).

## 1. Why

Once a property is picked, Set and Theme stop meaning what their labels say — and the prompt contradicts itself.

- **Set** carries a place (stock locations, lighting) and her look (outfit, pose energy, brand colours). The
  property photo replaces the place, so only her look is used. Its brand-colour line also asks for colour
  "in the décor", which decorates her listing.
- **Theme** scenes are a place plus an action, assigned to her photos by position, not by room. Her
  front-exterior photo could be told "Reviewing floor plans on a kitchen island"; other scenes ask for a balcony
  railing or a vase on a dining table. The same prompt says "do not redecorate".

## 2. Decisions

1. **"Who is it for?" is step 1** (shipped `ebce121`).
2. **"Just me" keeps Set and Theme unchanged.** We choose the place there, so both still mean something.
3. **A property replaces them with:**
   - **What's happening?** — Coming soon · Just listed · For sale · Open house · Under contract · Just sold.
     Required.
   - **Your style** — outfit and pose energy only. One line with Change, defaulting to her latest set's look.
4. **The occasion is picked for her only when Zillow says it.** A Zillow home preselects from its listing status.
   **An uploaded home has nothing selected: she picks, we don't guess.** Off-market Zillow homes also start empty.
   The choice is per batch and not remembered, because a home moves from listed to sold.
5. "For sale" is added to the five proposed: a Zillow home on the market for weeks is not "just listed", and
   calling it that would be a small misrepresentation of its own.

## 3. How a property photo is described to the model

The scene comes from **the photo's room + the occasion**, never from a theme list.

| Part | Source | Rule |
|---|---|---|
| Room pose | the photo's tag (front, porch, kitchen, living room, bedroom, yard…), 3 poses per room for up to 3 looks | Only uses what is already in the photo, phrased "if there is one" for furniture. Never opens a door, moves or adds anything |
| Occasion | the chosen occasion | Expression and gesture; the only prop allowed is one she holds (plain keys) |
| Style | outfit + pose energy | Brand colours go on her outfit only, never the room |
| Guardrail | always | Keep the property exactly as photographed |

**Uploaded photos get tagged too.** Today only Zillow imports are tagged. After an upload, the same vision tagger
runs in the background; an untagged photo falls back to room-neutral poses.

The Post Kit receives the occasion for every property batch — uploads included, not only Zillow homes.

## 4. Build

| Area | Change |
|---|---|
| Migration | `batches.occasion` |
| Shared | `src/lib/listingOccasions.ts` — occasions, labels, `occasionForStatus` |
| Composer | `composer/listingScenes.ts` (room poses, occasion directions) and `composer/listing.ts` (`composeListingPrompt`); the material branch leaves `composeBrandPrompt` |
| Expansion | Listing mode needs no set or theme: identity from the workspace, style from the draft or her latest set |
| Draft | Listing mode: `occasion` required; `wardrobe`, `poseEnergy` optional; `setId`, `themeId` not required |
| Tagging | Tag uploaded room photos after upload |
| Post Kit | `look` = occasion label for property batches; occasion reaches the writer for uploads too |
| Create | Property path: Who → What's happening? → Looks per photo → Your style → Formats. Ready card shows the occasion picker inline when none is chosen |
| DTO | `ListingDto.occasion` replaces `themeId` |
| Tests | composer, expansion, draft, e2e |

## 5. What shipped

| Piece | Where |
|---|---|
| Occasions, labels, Zillow status mapping | `src/lib/listingOccasions.ts` |
| Room poses (3 per room tag + neutral) and occasion moods | `src/server/generation/composer/listingScenes.ts` |
| Property prompt with the property guardrail | `src/server/generation/composer/listing.ts` |
| `brand_property` draft; occasion required, never assumed | `src/server/generation/draft.ts` |
| Property expansion with no set and no theme | `expandProperty` in `src/server/generation/expand.ts` |
| `batches.occasion` | `db/migrations/20260924090000_batch_occasion.sql` |
| Uploaded photos tagged by room in the background | `tagUntaggedRooms` in `src/server/listings/listings.ts`, rooms route |
| Post Kit mood and facts from the occasion, uploads included | `src/server/postKit/postKit.ts` |
| Create: What's happening? · looks · Your style; hint instead of an error | `BrandCreateFlow.tsx`, `OccasionPicker.tsx`, `StyleLine.tsx`, `CreditSummaryBar.tsx` |
| Ready card: occasion picked inline when missing | `ListingReadyCard.tsx` |
| Tests | `tests/server/listings/{listings,prompt,zillowImport}.test.ts`, `tests/e2e/brand-listing.mjs` |

Tests that hold the line: a property batch contains no theme scene text; every property prompt ends with the
property guardrail; any pose naming furniture a home might not have says "if there is one"; no pose opens a door or
adds a vase, sign or balcony; `parseDraft` rejects a property batch without an occasion.

Notes from the build:
- An older open tab still sends `brand_theme` with a listing; it is routed to the property parser, so it also needs
  an occasion.
- `batches.set_id` and `theme_id` are null for property batches. The zip names those photos by room (`kitchen-2`).
- "Your style" falls back to her latest set's outfit and energy, then the template defaults.
