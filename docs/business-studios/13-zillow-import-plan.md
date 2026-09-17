# P21 — Zillow import (Brand Studio, real estate)

Status: **built** (2026-09-17), flow revised the same day (§2, Z6). Written 2026-09-16.
Builds on: [12-listing-mode-plan.md](12-listing-mode-plan.md) (listings, "we never invent a room").
Spike: [spikes/zillow-import.md](spikes/zillow-import.md).

---

## 1. Why

Most US buyers and sellers use Zillow, so almost every listing an agent has is already there with 20–60 photos.
Today she has to download those photos and upload them again. A pasted link turns that into one step.

Listing mode does not change. The Zillow link is just a faster way to fill a property with photos.
Upload stays a first-class path: not every agent uses Zillow, and some want to use their photographer's originals.

## 2. Decisions (2026-09-16)

| # | Decision | Consequence |
|---|---|---|
| Z1 | **Representation is a self-declaration.** We do not check that the listing agent is her. | No agent matching, no license field in her profile. The existing "I represent this property" tick is the whole gate. |
| Z2 | **The unit is a photo, not a room.** | Copy says "photo" everywhere ("looks per photo"). Room tags stay internal: the prompt label and a hint on weak photos. |
| Z3 | ~~One-button Ready screen after picking~~ — **moved after cleanup (Z7).** | |
| Z6 | **(2026-09-17) Import everything, she cleans up.** Link + "I represent this property" → **Add property** → every gallery photo (up to 60) lands on the property. | No confirm or pick screen. She removes photos with ×, adds her own, or adds removed ones back ("N more on Zillow"). `MAX_ROOMS_PER_LISTING` is 60. |
| Z7 | ~~**(2026-09-17) Ready step after cleanup.** "Done with my photos" opened a one-button card.~~ — **removed (2026-09-17):** the **Generate** button at the bottom of Create is the only way to make photos. | Looks per photo starts at 1. |
| Z4 | **Never remove MLS logos** or other marks burned into a photo. | "Replace with your original" per photo instead. |
| Z5 | **Actor: `maxcopell/zillow-detail-scraper`**, async run + poll, same pattern as the TikTok Shop import. | Mock fixtures for dev and tests; no credits spent locally. |

## 3. The flow

One sheet, opened from "+ Property" in Create and "Add property" on the Calendar.

```
┌ Add a property ───────────────────┐        ┌ 2720 Carolyn Dr SE ───────────────┐
│ Paste your Zillow link   [Paste]  │        │ Just listed · $399,000 · 3 bd …   │
│ ☐ I represent this property.      │  ───▶  │ [Refresh from Zillow] 1 more on Z │
│ [ Add property ]                  │        │ 20 photos · Tap × on the ones you │
│ ─── or ─── Upload photos instead  │        │ don't want to be in.  [+][×][×][×]│
└───────────────────────────────────┘        └───────────────────────────────────┘
```
- **Add property** closes the sheet at once. The property chip shows a spinner and the panel says "Getting your photos
  from Zillow…" (about 20 s) while the page polls `GET …/[id]/import`.
- When the run ends, the server tags the gallery (one vision call, labels only) and downloads every photo, in Zillow's order,
  up to 60. The property is then `ready`.
- Cleanup: × on any photo (removed at once), "+ Photo" for her own, a replace icon on low-quality Zillow copies
  (< 1000 px), and "N more on Zillow" to add removed photos back. Drone shots, bathrooms and close-ups carry their label as a hint.
- Failure: the panel shows the reason with **Try again** and **Remove property**.
- The same Zillow home pasted again opens the property she already has.
- Create starts from the theme that fits the status (§4); the batch count is photos kept × looks per photo.
- Looks per photo starts at 1; **Generate** at the bottom makes the photos (Z7).

## 4. Listing status drives theme and captions

| Zillow data | Theme / Post Kit angle |
|---|---|
| `listingType.isComingSoon` | Coming soon |
| for sale, `daysOnZillow` ≤ 14 | Just listed |
| `listingType.isOpenHouse` | Open house |
| `listingType.isPending` | Under contract |
| `listingStatus = sold` | Just sold |
| otherwise | For sale |

Post Kit may use price, beds, baths and square feet — they are listing facts. The P20 guard still applies: never describe
rooms or finishes that are not visible in the photo.

"Refresh from Zillow" on the property updates status and price (one more run). Suggesting a "Just sold" batch on a status
change is a later autopilot idea, not in this phase.

## 5. Build

### 5.1 Data
`listings` gains:
`source` (`upload` | `zillow`), `zpid` (unique per workspace, nullable), `source_url`, `address` (json),
`price_cents`, `beds`, `baths`, `sqft`, `status`, `days_on_market`, `candidates` (json: `{ id, url, thumbUrl, tag, width? }[]`),
`import_status` (`fetching` | `failed` | `ready`), `import_error`, `run_id`, `imported_at`, `synced_at`.

`post_materials` gains: `source_url`, `width`, `height`, `tag`.

### 5.2 Server
| File | Job |
|---|---|
| `src/server/listings/zillowApify.ts` | Start detail run, get run, get items. Mock mode replays `tests/fixtures/zillow/*.json`. Retries when the Apify memory cap is hit. |
| `src/server/listings/zillowNormalize.ts` | `parseZillowUrl` (→ zpid + clean URL), row → listing fields + candidates, status → theme key |
| `src/server/listings/photoTags.ts` | Tag gallery thumbnails in one call (room labels); untagged on error |
| `src/server/listings/zillowImport.ts` | Start import (attested), finish import (normalize + tag + download every photo), add photos back, refresh |

### 5.3 Routes
| Route | Does |
|---|---|
| `POST /api/app/listings/import` `{ url, attest }` | Validates, reuses an existing zpid, else creates an attested `fetching` listing and starts the run |
| `GET /api/app/listings/[id]/import` | Polls the run; when done stores the facts and downloads every photo |
| `POST /api/app/listings/[id]/zillow` `{ photoIds }` | Adds gallery photos back (removed ones, or new ones a refresh found) |
| `POST /api/app/listings/[id]/sync` | Refresh from Zillow |

The Apify webhook (`/api/webhooks/apify`) can finish imports too; polling from the open sheet is the fallback.
Limit: 20 imports per workspace per day. Imports cost no credits.

### 5.4 Client
| Component | Job |
|---|---|
| `ZillowImportSheet.tsx` + `ZillowLinkStep.tsx` | Link, attest, Add property; `PickPhotosStep.tsx` for "add photos back" |
| `PropertyPanel.tsx` | Composes `ZillowImportStatus` (loading / failed), `ZillowFacts` (status, refresh, more on Zillow) and `PropertyPhotos` (cleanup grid) |
| `ListingPicker.tsx` | "+ Property" opens the sheet; spinner on a loading property; upload path unchanged |

### 5.5 Tests
- `parseZillowUrl`: homedetails links, tracking params, search/building links rejected.
- Normalize the 5 spike listings (for sale, sold, coming soon, luxury, low-res) from fixtures.
- Status → theme mapping.
- Confirm downloads only picked photos; attest required; duplicate zpid reuses the listing.
- The P20 test still holds: every item in a listing batch has a `materialId`.

Size: **M** (3–5 dev-days).

## 5b. After generation (2026-09-17)

| # | Decision | Where |
|---|---|---|
| Z8 | **Recents…** — "Who is it for?" shows Just me, the picked property and + Property only; earlier properties open in a pop-up. | `ListingPicker.tsx`, `RecentPropertiesSheet.tsx` |
| Z9 | **Property photos are added to the calendar by hand.** Each photo of a property batch has **Add to calendar** (next open posting day; tap again to take it off). Auto-fill skips property batches; theme batches still fill in (autopilot depends on it). | `addToCalendar` / `removeFromCalendar` in `calendar.ts`, `POST/DELETE …/items/[itemId]/calendar`, `ResultTile.tsx` |
| Z10 | **Trash icon archives a photo** (`batch_items.archived_at`): hidden from the batch, library, zips, auto-fill; a planned post for it is removed, a posted one stays. | migration `20260923090000_batch_item_archive.sql`, `PATCH …/items/[itemId] { archived }` |
| Z11 | **Library by series**: one card per generation labelled "Zillow · 2720 Carolyn Dr SE", "Property · …", the theme, or "Free photos"; filters All / Properties / Themes; tap opens the series. "All photos" keeps the old grid. | `GET /api/app/library/series`, `LibrarySeriesView.tsx`, `SeriesCard.tsx` |

## 6. Decided after review (2026-09-16)
1. **Virtually staged photos:** the visible AI label stays her choice, as for every property. No extra question.
2. **Photo rights:** covered by our Terms — she must own or have the rights to the photos she uses. No separate legal review.
3. **Zillow terms:** noted. The actor can break without notice; upload stays the fallback, and import failures show in the app.
4. **Realtor.com / Redfin links:** later, if agents ask.

## 7. What shipped

| Piece | Where |
|---|---|
| Migration: listing import columns, nullable `attested_at`, material size/tag/source | `db/migrations/20260922090000_listing_zillow_import.sql` |
| Shared Apify client (TikTok Shop import moved onto it) | `src/server/apify/client.ts` |
| Link parsing, tags, status copy (server + client) | `src/lib/listingPhotos.ts` |
| Actor, normalize, size probe, tagging, import service | `src/server/listings/zillow*.ts`, `imageSize.ts`, `photoTags.ts` |
| Routes | `POST /api/app/listings/import`, `GET …/[id]/import`, `POST …/[id]/zillow`, `POST …/[id]/sync`, `PUT …/rooms/[materialId]` |
| Webhook finishes Zillow runs too | `app/api/webhooks/apify/route.ts` |
| Post Kit uses listing facts (status, price, beds, baths, sqft, city) | `src/server/postKit/postKit.ts` |
| Sheet (link + attest), property panel with loading / failed / cleanup grid | `src/components/app/listings/*` |
| "Looks per photo" copy, theme from status | `BrandCreateFlow.tsx` |
| Tests | `tests/lib/listingPhotos.test.ts`, `tests/server/listings/zillow*.test.ts`, `tests/e2e/brand-listing.mjs`, fixtures in `tests/fixtures/zillow/` |

Notes from the build:
- A Zillow import is a `listings` row in `fetching`/`failed` until its photos are in. `listListings` shows it (so she sees
  progress); `getListing`, which batches and photo routes use, only returns `ready` properties.
- Status → theme only maps to themes that exist today (`open-house`, else `just-listed`). The exact status reaches the
  Post Kit instead. New "Just sold" / "Coming soon" themes would need cover images and scenes.
- Tagging is skipped when `NEXT5_MOCK_GENERATION=true` or there is no OpenAI key; photos then have no room label.
- A refresh never adds photos back: she already cleaned up. New gallery photos appear under "N more on Zillow".
