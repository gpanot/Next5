# Realtor listing video presets (test, 2026-11-11)

These presets turn listing photos into 15-second 9:16 videos with no face on camera. Each preset is a mix of Brand Nat style codes. Only the codes that work without a talking head are used.

Code: `src/remotion/realtor/` (it has its own Remotion entry, so the Blitz `Root.tsx` is not touched). Test listing: 2720 Carolyn Dr SE, Smyrna GA (zpid 14312548), taken from the cached `blitz_listing_runs` scrape.

Render:

```bash
npx -y -p @remotion/cli@4.0.526 remotion render src/remotion/realtor/index.tsx RealtorSplit out/realtor/RealtorSplit.mp4
```

## Photo constraint

- Zillow serves these photos at most 1024×681 (the `-p_f` URL variant). The scrape stores the `uncropped_scaled_within_1536_1152` variant, which is 800×532 for this listing. Swap to `-p_f` to get about 28% more pixels.
- A full-bleed 9:16 crop is upscaled about 2.8× and keeps only about 37% of the width. You can see it is soft at full size.
- Layouts that keep photos landscape (Split, Scrapbook) stay near native resolution and show the whole room.

## Shot plan: 20 to 30 photos → 7 beats

A 15 s video has 6 beats of about 2.1 s, plus a 2.5 s end beat. A 30 s video can use 10 to 12 beats.

1. Tag every photo with the existing `photoTags.ts`. The tags are exterior, porch, living, kitchen, bedroom, bathroom, yard, aerial, detail, and so on.
2. Fill the beats in walk-through order, best photo in each bucket:
   - hook: the best exterior or porch photo
   - living
   - kitchen
   - feature: the room the description brags about (brick wall, fireplace, pool). Find it from the listing description.
   - primary bedroom
   - yard
   - end: an aerial or map photo with the location line, price and CTA
3. Use at most one photo per bucket. Kitchen may have two in Split (as a pair). Drop near-duplicate angles.
4. Skip floor plans, close-up details, second and third bedrooms, and the hall bath. Use them only if a bucket is empty.
5. Split layout pairs: put a related photo underneath the beat photo, such as the ensuite under the primary bedroom.
6. Copy for each beat (kicker + title + note) comes from the facts and the description, through one LLM call. The tour CTA keyword is the same for all.

## Presets

| # | Preset | Nat codes | Photo handling | Feel | Status |
|---|---|---|---|---|---|
| 1 | Editorial Cover | X16 H10 C7 M4 G1 S3 | full-bleed, slow alternating pans, crossfades | premium, magazine | built |
| 2 | Split Stack | L2 H5 C5 V11 M1 M3 S1 | 2 landscape photos stacked, info band in the middle, hard cuts with a punch-in | fast, info-dense, sharp | built |
| 3 | Scrapbook Tour | L3 H4 V21 G7 M3 S1 | tilted white-border cards drop and stack on a butter canvas, handwritten notes with arrows | warm, friendly, first-time buyers | built |
| 4 | Apple Facts | G4 V13 P3 V15 L5 | photo in the top band, iOS widgets for beds/baths/sqft, price counts up, "Offer accepted"-style banner | clean, data-led | spec only |
| 5 | Payoff Punch | H5 C2 V6 M1 M2 S1 | full-bleed, one bold word per beat, zoom-blur transitions, a huge price word at the end | high energy, investor deals | spec only |

### 1. Editorial Cover
- Hook (0–2.1 s): masthead with "JUST LISTED" in heavy caps, the city in a giant thin serif, a tracked "3 BD · 2 BA · 1,350 SQFT" line and an italic serif strapline. It lifts away at 2.6 s.
- Room beats: tiny tracked kicker ("UPDATED"), then the room title in big serif italic, rising from a mask. Bottom scrim. Warm grade with vignette.
- End: aerial photo darkened, location line, price in big serif, "Comment TOUR for a tour" placed above the map pin.

### 2. Split Stack
- Two landscape photos at 1080×700, one at the top and one at the bottom. A dark band of 520 px sits in the middle, inside the TikTok safe zone.
- Hook: a yellow box "JUST LISTED" plus a "$399,000 · 3 bd · 2 ba" line.
- Beats: a lowercase kicker plus a white pill with the keyword, and progress dots at the top of the band. Each photo starts at 110% zoom and settles to 100%.
- End: location line plus a yellow "Comment "TOUR"" pill.

### 3. Scrapbook Tour
- A butter canvas (#F6E7B4). Each beat drops a tilted, taped polaroid card. Older cards stay underneath, slightly darkened.
- Hook: a thin italic serif "just listed" over a bold rounded "a mile from the battery".
- Beats: a bold rounded room word under the card, and a handwritten note above it with a drawn arrow ("office or TV room").
- End: a dark price sticker and a handwritten CTA.

## Round 2: formats built for TikTok and Reels (2026-11-11)

Feedback on round 1:
- Split is too hard to see on a phone.
- Editorial's text is good, but the panning moves too much.
- Scrapbook's cards are too small.

Rules for round 2:
- Photos are big: a 4:5 window (1080×1350) over a blurred copy of the same photo, or full screen.
- Motion is a slow push-in only. No panning.
- Text stays in the safe zone: y 230 to 1480, x 60 to 940. The right rail and the bottom caption area stay clear.
- Text uses the native TikTok look (TikTok Sans, a white box behind each line).
- Each video ends with comment bait.

| Composition | Format | Hook | Pace | Comment bait |
|---|---|---|---|---|
| RealtorWhatYouGet | "What $399K gets you in Smyrna, GA". The header stays on the whole video. 10 photos with a room label each. | header from frame 1 | about 1.2 s cuts with a white flash | Comment "TOUR" |
| RealtorGuessPrice | "Guess the price". Fact chips build up during the tour, then the price counts up big at the end. | "Guess the price 👀" | 2 s beats | "how close were you? 👇" |
| RealtorRateHouse | "Rate this house 1–10". A green checklist ticks room by room. The end shows 1–10 bubbles. | header from frame 1 | 2 s beats | "drop a number" |
| RealtorScrapbookBig | Scrapbook v2. A 1000 px 4:5 polaroid per beat, the previous card tilted behind it, a handwritten tape label. | italic + bold rounded title | 2 s beats | handwritten CTA |
| RealtorEditorial (v2) | Same text as round 1. No panning, a 1.00→1.04 push, captions lifted into the safe zone. | magazine masthead | 2 s crossfades | Comment TOUR |

## Round 3: voiced 25 s versions (2026-11-11)

The user picked **Editorial v2** and **Rate this house**.

Audio comes from `scripts/realtor-test/make-audio.ts`:
- Voice: the Shorts Gemini TTS pipeline (`synthesize`), with Whisper read-back and word timings.
- Music: one Lyria 3 Clip per preset ($0.04 each).
- Checks: `check-voice.ts` transcribes the final take, to catch words the voice added. Director's notes leak into the speech, so keep them to a few words.
- "TOUR" in capitals was read wrong. Use lowercase "tour" in the scripts.

Mix:
- The voice starts 0.2 s in, at full volume.
- The music sits at 0.14 to 0.20 of full volume and fades out over the last second.
- SFX are local Pixabay files in `public/realtor-test/sfx`.
- The final file is normalised to -14 LUFS with ffmpeg `loudnorm`.

| Composition | Voice | Music | Cuts | Effects |
|---|---|---|---|---|
| RealtorEditorialVoiced | Sulafat (warm woman) | acoustic guitar + felt piano, 92 BPM | on the sentence that names each room (8 beats + end) | warm light-leak crossfade, whoosh on each cut, small tracked-caps subtitles synced to each word, price counts up with a sparkle, chime on the CTA |
| RealtorRateVoiced | Achird (friendly man) | bright pop, 112 BPM | on each sentence | each spoken "Check" ticks the row, with a ping, a green ✓ stamp and a photo punch-in; big captions with the active word in yellow; 1–10 bubbles pop on "number" |

Beats are found from word timings (`wordAt`). The voice script and the beat list must name the same rooms in the same order.

## Round 4: automated pipeline (2026-11-11)

```bash
npx tsx --env-file=.env.local scripts/realtor-test/make-listing-video.ts <zillow url | zpid> [editorial,rate]
```

The steps, in order:
1. **Listing.** Read it from the `blitz_listing_runs` cache. If it is not there, `scrapeListing.ts` scrapes it with Apify and stores the result.
2. **Tags.** `photoTags.ts` tags the photos (one vision call).
3. **Shot plan.** `src/server/realtorVideo/shotPlan.ts` picks the beats:
   - hook: exterior or porch
   - location: a second exterior, porch, aerial or yard photo
   - rooms, up to 6: living, kitchen, feature (a second living or dining room), bedroom, bath, yard
   - end: aerial, otherwise an exterior
   - Within each bucket, the first photo in Zillow gallery order wins. Photos are upgraded to `-p_f` (1024 px).
4. **Script.** `src/server/realtorVideo/script.ts` makes one gpt-5.4-mini vision call. It returns flat keys: the location line, the hook line, a charm sentence, and per room a sentence, kicker, title and rate item. Each spoken sentence maps to exactly one beat. Fixed lines (opener, price, CTA) are built in code.
5. **Voice.** `synthesize` records the voice: Sulafat for Editorial, Achird for Rate, with **no director's notes**. The whole take is then transcribed. If a word was added or skipped, it is recorded again, up to 3 times.
6. **Props.** `src/server/realtorVideo/build.ts` sets each beat start to the first word of its sentence. Duration = max(25 s, voice + 2 s).
7. **Render.** Remotion renders with `--props`, then the file is normalised to -14 LUFS.

Output goes to `out/realtor/<zpid>/`. Shared music and SFX are in `public/realtor/`.

Cost: about $0.03–0.07 per pair of videos (TTS and Whisper). The music is reused.

Lessons learned:
- Director's notes get spoken (4 of 14 sentences, and once in a final take). Do not use them.
- A capitalised "TOUR" at the end of a sentence was misheard. "Comment tour for a private showing." reads cleanly.

## Not done yet
- Sound. There is no music or SFX yet. The S codes are planned: S3 bed for Editorial, S1 pops and whooshes for Split and Scrapbook.
- Voiceover (Gemini TTS, as Blitz does it) with captions synced word by word.
- Automatic shot plan and copy. The test beats were picked and written by hand.

## Round 5: wired into Brand create (2026-11-11)

**UI**
- In Brand create, property mode, a Zillow home now shows step 5, "Videos of this home" (`src/components/app/create/ListingVideosPanel.tsx`).
- It has two 9:16 cards and a "Make 2 videos" button.
- It refreshes every 5 s while a video is in progress, then shows a player and a download link for each video.

**API**
- `GET` / `POST /api/app/listings/[listingId]/videos`
- POST creates two `listing_videos` rows with status `preparing`.
- `after()` then runs the paid prep (`src/server/realtorVideo/jobs.ts`): tags, shot plan, script, and two voiceovers with full-take checks. The voices go to R2 at `listing-videos/<id>/voice.wav`, and the rows become `queued`.
- POST does nothing while a pair is still in progress.

**Worker**
- `blitz-worker/src/listingVideos.ts` claims `queued` rows with `FOR UPDATE SKIP LOCKED`.
- It signs every `r2:` asset in the props and renders `RealtorEditorialVoiced` or `RealtorRateVoiced`, both registered in `src/remotion/Root.tsx`.
- It applies loudnorm to -14 LUFS and uploads to `listing-videos/<id>/video.mp4`.
- It uses the same slots, time limit, heartbeat and stale-requeue as Blitz renders.
- `LISTING_VIDEOS_ONLY=1` runs a local worker that never takes Blitz jobs.

**Shared assets**: music and SFX are in R2 under `realtor/assets/` (`scripts/realtor-test/upload-assets.ts`).

**Not done**
- Credits are not charged yet. Each video costs about $0.015–0.02 in voice.
- The production worker must be redeployed before real users get renders.
