# UGC Lab — rework instructions for Cursor

Written 2026-09-17 after a review of the first UGC Lab build. Updated the same day with the owner's scope.

**Goal of this round:** make talking-head video generation solid, and measure how consistent the same character looks and sounds across many clips.

Work through the phases **in order**. Finish each phase's acceptance checks before starting the next.

### Scope

- **In:** TikTok research, selecting a hook (current flow: pick a video, edit its hook, use it), personas, Seedance clip generation, captions, consistency testing.
- **Out for now:** Instagram research, generating new hooks with an LLM, separate voice tools (Seedance makes the voice), demo clip, export and merging. Do not build these.

---

## 0. Read first

### 0.1 Files to read before touching anything

- `AGENTS.md` — this Next.js version has breaking changes. Read the relevant guide in `node_modules/next/dist/docs/` before writing route handlers.
- `app/admin/page.tsx` — admin shell and tab bar.
- `src/components/admin/business/ModelTestTab.tsx` and `ModelTestRunCard.tsx` — **the reference implementation**. The UGC Lab must look and behave like this tab: persisted runs, server-side status refresh, client polling, cost per item.
- `src/components/admin/business/useAdminApi.ts` — `adminFetch` and `useAdminApi`. Use them. No raw `fetch` with hand-built auth headers.
- `src/components/admin/business/OverviewTab.tsx` — pill buttons, stat cards, status pills.
- `src/server/admin/modelTest.ts`, `app/api/admin/model-tests/route.ts`, `app/api/admin/model-tests/[runId]/route.ts` — server pattern.
- `src/server/admin/route.ts` (`adminRoute`, `json`, `audit`), `src/server/http.ts` (`HttpError`).
- `src/server/storage/keys.ts`, `src/server/storage/objectStore.ts`, `src/lib/r2.ts`.
- `src/server/ai/openai.ts` — `chatJson` (supports `image_url` content parts).
- `prisma/schema.prisma` and one recent file in `db/migrations/` — every schema change needs **both** a Prisma model and a dbmate SQL migration.
- `~/.claude/skills/treg/SKILL.md` — Treg HTTP rules, cost headers.
- Treg repo skills (for prompt rules, not to copy verbatim): `superdesigndev/treg/.agents/skills/portrait-clone/SKILL.md` and `.agents/skills/ugc-talking-head-video/` (`SKILL.md`, `scripts/seedance_treg.py`, `scripts/caption_burn.py`, `assets/example_prompt.txt`).

### 0.2 Code rules (from the owner's global rules)

- Max 600 lines per file, max 50 lines per function. Split early.
- Strict TypeScript. No `any`. No `as` casts on unvalidated JSON: parse with a small type guard.
- Named exports only.
- One responsibility per component. Shared UI pieces go in their own file.
- Every screen has a loading skeleton, an error state with Retry, and an empty state.
- Mobile first: design at 390px, then `sm:` and `lg:`. Tap targets at least 40px tall.
- `npx tsc --noEmit` and `npx eslint` must pass with **zero errors** on every UGC file. Fix the two current lint errors (`ResearchPanel.tsx:85` unescaped `'`, `RunCard.tsx:54` setState in effect) by following the patterns below, not by disabling rules.
- Plain `<img>` is fine for signed storage URLs. Add the same comment as `ModelTestRunCard.tsx`: `// eslint-disable-next-line @next/next/no-img-element -- signed storage URL`.

---

## 1. Decisions already made

| Topic | Decision |
|---|---|
| Where it runs | Local admin (`npm run dev` on the owner's Mac). Research, personas and clip generation must also work on Vercel. ffmpeg steps (captions, frame strips, voice anchor) are local-only and must fail with a clear message when ffmpeg is missing. |
| Treg access | HTTP, `https://treg.to/call/<endpoint_id>`, header `X-Treg-Token: $TREG_API_KEY`. Path and query params both go in the query string (verified: `reapi.tasks.get?id=…` works, `/reapi.tasks.get/<id>` is rejected). |
| Video model | `reapi.video-gen.seedance-2-5.unrestricted`, body `model: "doubao-seedance-2.5-face"`, `content_filter: false`. Treg only. No other video model. |
| Voice | Seedance generates it (`generate_audio: true`). Optional **voice anchor** (section 7.3) reuses audio from one of the lab's own Seedance clips to keep the voice the same. |
| Resolution | Selectable 480p / 720p. Default **720p**. 1080p hidden. |
| Duration | 5, 8, 10, 15 s. Default 8 s. |
| Research | TikTok only: niche search + TikTok reference accounts. |
| Hooks | Current flow stays: pick a researched video, edit its hook, use it. The admin can also type a hook. The chosen hook is saved so clips can reference it. |
| Persona image models | `reapi.image-gen.gemini-3-pro-image` (Gemini 3 Pro Image, also called Nano Banana Pro) and `reapi.image-gen.gpt-image-2`. Optional third: `reapi.image-gen.gpt-image-2-5`. **Remove DeepInfra FLUX.** Its call reads `data[0].url` but the DeepInfra endpoint returns `b64_json`, and it is not on Treg. The reference screenshot may be sent as `image_urls` (current behavior). |
| LLM | `chatJson` from `src/server/ai/openai.ts` (gpt-4o-mini). Only used for hook extraction and cover text. |
| Captions | OpenAI Whisper (`whisper-1`, word timestamps) + ffmpeg — keep the current implementation, moved and fixed. |
| Budget | Confirm dialog when one action is estimated above **$3.00**. Show today's total spend in the lab header. |
| Theme | Match the existing admin: light, admin tokens. **No hard-coded zinc/black theme.** The admin shell has no dark mode today (zero `dark:` classes in `src/components/admin`). Do not add dark mode to one tab only. Dark mode for the whole admin is a separate task. |

---

## 2. What is wrong today (fix list)

Every item below must be closed by the phases that follow.

1. Nothing is persisted. Runs, task ids, characters and videos live in React state and are lost on refresh. Seedance output URLs expire after 7 days.
2. DeepInfra FLUX candidate reads `url` but the API returns `b64_json`. It likely always fails.
3. `status/[id]` returns `status: 'failed'` on any polling error. `RunCard` stops polling forever on a network blip.
4. Unknown provider statuses (`queued`, `in_progress`, `unknown`) are cast to `RunStatus`. The label renders blank and the icon shows an error.
5. Research: `sort_type: 1` is "most liked", not trending. No 30-day filter. No reference accounts. The hook comes from the full transcript, not the first 5 seconds. No AI transcript fallback, so many videos have no hook.
6. Persona prompt is one fixed generic string with no per-detail JSON spec. "Avoid: ultra-detailed, 8K, 4K, masterpiece…" puts banned booster words into the prompt. Square 1024×1024 images get cropped to 9:16.
7. **Consistency gaps in the Seedance call:** only one reference image, no seed, no fixed character description, the prompt hard-codes "She", and the voice is random on every clip. Nothing records the exact request, so a good clip cannot be reproduced.
8. Budget cap is unreachable ($5 cap, $1.90 maximum). Price is duplicated on the client. Real cost is never read.
9. No `maxDuration` on long routes. `character` blocks up to 5 minutes. ffmpeg runs inside a request with no availability check. Caption styling hard-codes 720×1280, which is wrong for 480p.
10. Candidate images are never copied to storage. The "locked" character is a temporary URL.
11. `tregCall`: error `detail` is an object, so the message is lost. `res.json()` throws on HTML error pages. `'data' in json` returns `null` for `data: null`.
12. No way to compare clips of the same character or record what went wrong (face drift, voice change, lip sync, artifacts).
13. UI is inconsistent with the admin (see section 4).

---

## 3. Phase A — Foundation (server)

### 3.1 Folder layout

Move all UGC server code into `src/server/admin/ugc/`. Delete `src/server/admin/ugcLab.ts` and `src/server/admin/ugcCaption.ts` at the end of Phase E once nothing imports them.

```
src/server/admin/ugc/
  treg.ts            Treg HTTP client
  pricing.ts         price table + estimate helpers
  storage.ts         UGC keys + vendor-readable URLs + mirroring
  status.ts          provider status → lab status mapping
  ffmpeg.ts          ffmpeg availability + exec helpers
  guards.ts          JSON type guards for provider responses
  research.ts        TikTok scrape + transcripts + cover text
  vtt.ts             WebVTT parsing (first 5 seconds)
  hooks.ts           saved hooks
  persona.ts         persona + candidates + lock
  personaPrompt.ts   JSON prompt + character sheet text
  clips.ts           Seedance submit + refresh + retake
  seedanceRequest.ts pure request/prompt builder (unit-tested)
  voiceAnchor.ts     extract anchor audio from a lab clip
  frames.ts          frame strip extraction
  captions.ts        Whisper + ASS + burn (moved from ugcCaption.ts)
  consistency.ts     batch stats
  dto.ts             Prisma row → client DTO (presigned URLs)
```

### 3.2 `treg.ts`

Replace `tregCall` with:

```ts
export type TregResult<T> = { body: T; costUsdMicros: number; callId: string | null };

export const tregCall = async <T>(
  endpointId: string,
  options: { method?: 'GET' | 'POST'; query?: Record<string, string | number | boolean>; body?: unknown; timeoutMs?: number; guard: (value: unknown) => value is T },
): Promise<TregResult<T>>
```

Rules:
- Read the response as text first. Try `JSON.parse`. If parsing fails, throw `HttpError(502, 'treg_bad_response', <first 200 chars>)`.
- On non-2xx: extract the message from `detail.message`, `detail.error`, `detail` (string), `error`, or `message`, in that order. Throw `HttpError(res.status === 402 ? 402 : 502, 'treg_error', message)`.
- Do **not** unwrap `data` generically. Each caller passes a guard for the exact shape of its endpoint. TikHub wraps in `{ code, data }`; reapi does not. Put small unwrap helpers next to the guards.
- `costUsdMicros` from the `X-Treg-Cost-Micro` response header (0 when missing). `callId` from `X-Treg-Call-Id`.
- Default timeout 30 s. Abort with `AbortController`. Map abort to `HttpError(504, 'treg_timeout')`.
- One automatic retry, after 2 s, for submit calls that fail with 429, 5xx or a timeout. Never retry a 4xx other than 429.
- Never log the token.

### 3.3 `status.ts`

```ts
export type LabStatus = 'generating' | 'ready' | 'failed';
export const mapReapiStatus = (raw: unknown): LabStatus
```

- `completed` → `ready`. `failed` → `failed`. **Anything else** (including missing) → `generating`.
- A polling error never changes the stored status. It only sets `lastPollError` on the row.
- A row still `generating` after `TIMEOUT_MS` (images 10 min, video 25 min) becomes `failed` with error `timed_out`.
- When reapi reports `failed`, store its error message on the row (not a generic "Task failed").

### 3.4 `pricing.ts`

One source of truth. The client never hard-codes a price. The server returns estimates in the DTOs.

```ts
export const SEEDANCE_USD_PER_SECOND = { '480p': 0.1186, '720p': 0.26683 } as const;
export const IMAGE_USD = { 'reapi.image-gen.gemini-3-pro-image': 0.034, 'reapi.image-gen.gpt-image-2': 0.081, 'reapi.image-gen.gpt-image-2-5': 0.41 } as const;
export const CONFIRM_ABOVE_USD = 3;
```

Store estimates and actuals in **micro-USD integers** (`costUsdMicros`), like `ModelTestItem`. Prices are from the Treg catalog on 2026-09-14. Add a comment with that date.

### 3.5 `storage.ts`

- Add key builders to `src/server/storage/keys.ts`, all under `admin/ugc/`: `ugcReferenceKey(personaId)`, `ugcCandidateKey(personaId, candidateId)`, `ugcClipKey(clipId, 'raw' | 'captioned')`, `ugcFrameKey(clipId, index)`, `ugcVoiceAnchorKey(personaId)`, `ugcThumbKey(videoId)`.
- **Vendor-readable URLs:** Treg vendors fetch inputs over the public internet. The local storage driver returns `/api/dev/object?...`, which vendors cannot reach. So store **all** UGC files in R2 directly (`uploadToR2`), whatever `NEXT5_STORAGE` says. `vendorUrl(key)` presigns for 7 days. `browserUrl(key)` presigns for 24 h. If R2 is not configured, throw `HttpError(503, 'r2_required', 'UGC Lab needs R2 configured to send files to Treg.')`.
- `mirrorToStorage(sourceUrl, key, contentType)` downloads a provider output and uploads it. Use it the moment a task completes. Provider URLs expire.
- Download links: add an optional `downloadName` argument to `getPresignedUrl` in `src/lib/r2.ts` that sets `ResponseContentDisposition: attachment; filename="…"`. Default behavior of existing callers must not change. The current `<a download>` on a cross-origin URL does nothing.

### 3.6 `ffmpeg.ts`

- `ffmpegAvailable()` runs `ffmpeg -version` once and caches the result.
- `requireFfmpeg()` throws `HttpError(503, 'ffmpeg_missing', 'This step runs on the local admin only (ffmpeg not found).')`.
- `runFfmpeg(args: string[])` and `runFfprobe(args: string[])` wrap `execFile` with a 5-minute timeout and return stderr on failure.
- The GET endpoints return `capabilities: { ffmpeg: boolean }` so the UI can disable buttons with an explanation.

### 3.7 Prisma models + dbmate migration

Add to `prisma/schema.prisma` and a new migration `db/migrations/<timestamp>_ugc_lab.sql` (with `-- migrate:down` dropping everything). Use `@map` snake_case like the rest of the schema. Add a `///` doc comment on every model.

```prisma
/// UGC Lab: one TikTok research pull (niche search and/or reference accounts).
model UgcResearchRun {
  id             String   @id @default(cuid())
  niche          String?
  tiktokHandles  String[] @map("tiktok_handles")
  /// generating | ready | failed
  status         String   @default("generating")
  error          String?
  costUsdMicros  Int      @default(0) @map("cost_usd_micros")
  createdAt      DateTime @default(now()) @map("created_at")
  videos UgcReferenceVideo[]
  @@map("ugc_research_runs")
}

/// A scraped TikTok video used for research.
model UgcReferenceVideo {
  id            String    @id @default(cuid())
  runId         String    @map("run_id")
  /// niche_search | account
  source        String
  externalId    String    @map("external_id")
  url           String
  author        String
  views         Int       @default(0)
  likes         Int       @default(0)
  publishedAt   DateTime? @map("published_at")
  thumbKey      String?   @map("thumb_key")
  transcript    String    @default("")
  openingLine   String    @default("") @map("opening_line")
  hook          String    @default("")
  coverText     String    @default("") @map("cover_text")
  createdAt     DateTime  @default(now()) @map("created_at")
  run   UgcResearchRun @relation(fields: [runId], references: [id], onDelete: Cascade)
  hooks UgcHook[]
  @@unique([runId, externalId])
  @@index([runId])
  @@map("ugc_reference_videos")
}

/// A hook the admin chose (from a researched video, edited or typed).
model UgcHook {
  id              String   @id @default(cuid())
  sourceVideoId   String?  @map("source_video_id")
  text            String
  /// Optional sentence spoken after the hook.
  followUp        String   @default("") @map("follow_up")
  archived        Boolean  @default(false)
  createdAt       DateTime @default(now()) @map("created_at")
  sourceVideo UgcReferenceVideo? @relation(fields: [sourceVideoId], references: [id], onDelete: SetNull)
  clips       UgcClip[]
  @@map("ugc_hooks")
}

/// An on-screen character reused across clips.
model UgcPersona {
  id                 String   @id @default(cuid())
  name               String
  referenceKey       String?  @map("reference_key")
  /// Per-detail JSON prompt (portrait-clone format).
  promptJson         Json     @map("prompt_json")
  /// Short fixed description repeated in every Seedance prompt.
  characterSheet     String   @map("character_sheet")
  lockedCandidateId  String?  @unique @map("locked_candidate_id")
  /// Fixed seed used when a clip asks for "persona seed".
  seed               Int      @default(0)
  voiceAnchorKey     String?  @map("voice_anchor_key")
  voiceAnchorClipId  String?  @map("voice_anchor_clip_id")
  /// draft | locked | archived
  status             String   @default("draft")
  createdAt          DateTime @default(now()) @map("created_at")
  candidates UgcPersonaCandidate[]
  clips      UgcClip[]
  batches    UgcTestBatch[]
  @@map("ugc_personas")
}

model UgcPersonaCandidate {
  id              String    @id @default(cuid())
  personaId       String    @map("persona_id")
  /// Treg endpoint id
  model           String
  /// front | three_quarter | profile
  angle           String    @default("front")
  status          String    @default("generating")
  providerTaskId  String?   @map("provider_task_id")
  imageKey        String?   @map("image_key")
  error           String?
  lastPollError   String?   @map("last_poll_error")
  costUsdMicros   Int       @default(0) @map("cost_usd_micros")
  submittedAt     DateTime? @map("submitted_at")
  completedAt     DateTime? @map("completed_at")
  createdAt       DateTime  @default(now()) @map("created_at")
  persona UgcPersona @relation(fields: [personaId], references: [id], onDelete: Cascade)
  @@index([personaId])
  @@map("ugc_persona_candidates")
}

/// A consistency test: several clips of one persona with the same settings.
model UgcTestBatch {
  id                String   @id @default(cuid())
  personaId         String   @map("persona_id")
  label             String
  /// { resolution, durationSec, seedMode, referenceMode, voiceAnchor, takesPerHook }
  settings          Json
  createdAt         DateTime @default(now()) @map("created_at")
  persona UgcPersona @relation(fields: [personaId], references: [id], onDelete: Cascade)
  clips   UgcClip[]
  @@map("ugc_test_batches")
}

/// One talking-head clip.
model UgcClip {
  id                      String    @id @default(cuid())
  personaId               String    @map("persona_id")
  hookId                  String    @map("hook_id")
  batchId                 String?   @map("batch_id")
  /// Take number within the batch for the same hook (1, 2, 3).
  take                    Int       @default(1)
  /// Clip this one re-runs with the exact same request.
  retakeOfId              String?   @map("retake_of_id")
  script                  String
  prompt                  String
  resolution              String
  durationSec             Int       @map("duration_sec")
  seed                    Int?
  /// front_only | front_and_angles
  referenceMode           String    @map("reference_mode")
  usedVoiceAnchor         Boolean   @default(false) @map("used_voice_anchor")
  /// Exact body sent to Treg, with presigned URLs replaced by storage keys.
  requestJson             Json      @map("request_json")
  /// generating | ready | failed
  status                  String    @default("generating")
  /// none | burning | done | failed
  captionStatus           String    @default("none") @map("caption_status")
  providerTaskId          String?   @map("provider_task_id")
  rawKey                  String?   @map("raw_key")
  captionedKey            String?   @map("captioned_key")
  frameKeys               String[]  @map("frame_keys")
  transcript              String?
  error                   String?
  lastPollError           String?   @map("last_poll_error")
  estimatedCostUsdMicros  Int       @default(0) @map("estimated_cost_usd_micros")
  costUsdMicros           Int       @default(0) @map("cost_usd_micros")
  /// Manual ratings, 1–5. Null until rated.
  faceScore               Int?      @map("face_score")
  voiceScore              Int?      @map("voice_score")
  lipSyncScore            Int?      @map("lip_sync_score")
  cleanScore              Int?      @map("clean_score")
  /// keep | reject | null
  verdict                 String?
  issues                  String[]
  notes                   String    @default("")
  submittedAt             DateTime? @map("submitted_at")
  completedAt             DateTime? @map("completed_at")
  createdAt               DateTime  @default(now()) @map("created_at")
  persona UgcPersona    @relation(fields: [personaId], references: [id], onDelete: Restrict)
  hook    UgcHook       @relation(fields: [hookId], references: [id], onDelete: Restrict)
  batch   UgcTestBatch? @relation(fields: [batchId], references: [id], onDelete: SetNull)
  @@index([status])
  @@index([personaId])
  @@index([batchId])
  @@map("ugc_clips")
}
```

Run `npm run db:migrate` then `npm run generate`.

Log every paid action with `audit('ugc.<action>', '<type>', id, { costUsdMicros })` from `src/server/admin/route.ts`.

### 3.8 Phase A acceptance

- Migration applies and rolls back cleanly (`npm run db:rollback`, then `npm run db:migrate`).
- Unit tests in `tests/server/admin/ugc/` (vitest): `mapReapiStatus`, Treg error-message extraction (object `detail`, string `detail`, HTML body), pricing estimates.

---

## 4. Phase B — UI system and shell

### 4.1 What is inconsistent now

| Current UGC Lab | Rest of admin |
|---|---|
| `min-h-screen bg-zinc-950 text-white` inside a light page | `bg-surface` page, `bg-white` sections |
| `bg-zinc-900 border-zinc-800` panels, `rounded-xl` | `rounded-2xl border border-line bg-white p-5` sections |
| `text-lg`, `text-sm`, `text-xs` | `text-[16px]` headings, `text-[13px]` body, `text-[12px]`/`text-[11px]` meta |
| White primary button `bg-white text-black` | `rounded-xl bg-ink px-4 py-2 text-[13px] font-medium text-white disabled:opacity-40` |
| `text-zinc-400` secondary text | `text-muted` |
| `bg-red-900/40 border-red-700 text-red-300` errors | `text-[13px] text-red-700` |
| `border-yellow-600 bg-yellow-900/30` warnings | `bg-amber-50 text-amber-800` |
| `text-green-400` success | `bg-emerald-50 text-emerald-700` |
| `text-blue-400` links | `text-ink underline` |
| Segmented step bar with numbered circles | Pill buttons (`OverviewTab` period switch) |
| Gradient overlay on candidate labels | `figure` + `figcaption` under the image (`ModelTestRunCard`) |
| Raw `fetch` + manual `Authorization` header in 5 places | `adminFetch` / `useAdminApi` |
| No loading skeleton, no empty state | Loading text, error + Retry, "No test runs yet." |
| Tab label renders as "Ugc-lab" (`capitalize`) | Proper labels |

**Rule:** only these color utilities are allowed in UGC files: `ink`, `muted`, `subtle`, `line`, `surface`, `surface-alt`, `white`, `red-50`, `red-700`, `amber-50`, `amber-800`, `emerald-50`, `emerald-700`, `black` (only as the `<video>` letterbox background). No `zinc-*`, `gray-*`, `blue-*`, `yellow-*`, `green-*`, no gradients.

### 4.2 Admin shell changes (`app/admin/page.tsx`)

Keep this change minimal.
- Add a label map: `const TAB_LABELS: Record<Tab, string> = { …, 'ugc-lab': 'UGC Lab' }`. Render `TAB_LABELS[t]`. Remove `capitalize`.
- Tab bar row: add `overflow-x-auto` and `whitespace-nowrap` so 10 tabs scroll horizontally at 390px instead of wrapping or overflowing.
- Main padding: `px-4 sm:px-6`.

### 4.3 Shared primitives — `src/components/admin/business/ugcLab/ui.tsx`

Build these first. Every UGC panel uses them. No panel re-declares class strings.

- `Section({ title, description, actions, children })` → `section.flex.flex-col.gap-4.rounded-2xl.border.border-line.bg-white.p-4.sm:p-5`. Title `text-[16px] font-semibold text-ink`. Description `text-[13px] text-muted`.
- `fieldClass` = `w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[13px] text-ink placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-ink/10 transition-shadow`.
- `labelClass` = `flex flex-col gap-1 text-[12px] font-medium text-muted` (same as `ModelTestTab`).
- `PrimaryButton` → `inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40`.
- `SecondaryButton` → `inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 text-[12px] text-ink transition-colors hover:bg-surface-alt disabled:opacity-40`.
- `DangerButton` → same as Secondary with `text-red-700`.
- `Pill({ active, onClick, children })` → `rounded-full px-3 py-1.5 text-[12px] transition-colors` + `bg-ink text-white` or `bg-white text-muted ring-1 ring-line hover:text-ink`.
- `StatusPill({ status })` → `rounded-full px-2 py-0.5 text-[11px] font-medium`. `generating` / `burning`: `bg-surface-alt text-muted` + "Working…". `ready` / `done`: `bg-emerald-50 text-emerald-700`. `failed`: `bg-red-50 text-red-700`. Unknown values fall back to the `generating` style. **No blank labels.**
- `ScoreInput({ label, value, onChange })` → five 32×32 round buttons `1`–`5`, selected `bg-ink text-white`, others `bg-white text-muted ring-1 ring-line`. Tapping the selected value clears it.
- `Money({ micros })` → `$0.000` format like `ModelTestRunCard`. Put the formatter in `src/lib/admin-format.ts` if a similar one is not already there.
- `ErrorLine({ message, onRetry })` → `text-[13px] text-red-700` + underlined Retry button.
- `EmptyState({ title, hint, action })` → `rounded-xl border border-dashed border-line p-6 text-center`, title `text-[13px] text-ink`, hint `text-[12px] text-muted`.
- `Skeleton({ className })` → `animate-pulse rounded-xl bg-surface-alt`. Provide `CardSkeleton` (h-24) and `MediaSkeleton` (aspect-[9/16]).
- `ConfirmCost({ estimateMicros, onConfirm, onCancel })` → inline `rounded-xl bg-amber-50 p-4 text-[13px] text-amber-800` with Primary "Spend $X" + Secondary "Cancel".
- `MediaFrame({ kind: 'image' | 'video', src, alt, status, error })` → `relative aspect-[9/16] w-full overflow-hidden rounded-xl bg-surface-alt`. Video uses `controls playsInline preload="metadata"` and `bg-black`. Status overlay centered, same as `ModelTestRunCard`.
- `FileDrop({ accept, label, onFile, busy })` → a `label` with a hidden input and a visible SecondaryButton-styled target. Keyboard accessible.

### 4.4 Data hooks — `src/components/admin/business/ugcLab/api.ts`

- Re-export `adminFetch` and `useAdminApi`.
- Add `adminUpload<T>(token, path, form: FormData)`. It must **not** set `Content-Type` (the browser sets the multipart boundary). Same error handling as `adminFetch`.
- Add `usePolling(token, path, active: boolean, onData)`. Copy the `ModelTestRunCard` pattern: `onDataRef` updated in an effect, `setInterval` started inside the effect, the first tick inside an async function, `stopped` flag in cleanup. This fixes the `set-state-in-effect` lint error. Poll every 5 s. A failed poll is ignored; the next tick retries.

### 4.5 Tab layout — `UgcLabTab.tsx`

Replace the wizard's in-memory state with database-backed sections, switched by pills. The flow order stays the same (research → persona → clips), but any section can be opened at any time and nothing is lost on refresh.

```
[UGC Lab]                                                Today: $4.21
( Research ) ( Personas ) ( Clips ) ( Consistency )
────────────────────────────────────────────────────────────────────
<active section>
```

- Header row: `flex flex-wrap items-center justify-between gap-3`. Left: pills in a `flex gap-2 overflow-x-auto pb-1` row. Right: `text-[12px] text-muted` spend line from `GET /api/admin/ugc-lab/summary` (sum of today's `costUsdMicros`).
- Summary bar under the pills (like today's state bar, restyled): selected hook (truncated) and selected persona thumbnail, each with a "Change" link. Selections are stored in the URL (`#ugc=clips&hook=<id>&persona=<id>`) so refresh keeps them. No `localStorage`.
- "Use this hook" in Research saves a `UgcHook`, sets `hook=<id>`, and moves to Personas (same as today's flow). "Use this persona" sets `persona=<id>` and moves to Clips.
- Each section fetches its own data with `useAdminApi`.
- Top-level loading: `CardSkeleton` × 3. Error: `ErrorLine` with Retry.

### 4.6 Phase B acceptance

- Screenshot the tab at 390px and 1280px with Playwright (`tests/e2e/`, pattern from `admin-model-test.mjs`). No horizontal page scroll at 390px except the pill row and tab bar.
- `grep -rE "zinc-|gray-|blue-|yellow-|green-|gradient" src/components/admin/business/ugcLab` returns nothing.

---

## 5. Phase C — Research and hook selection (TikTok only)

### 5.1 API

- `GET /api/admin/ugc-lab/research` → latest 10 runs with video counts.
- `POST /api/admin/ugc-lab/research` body `{ niche?: string; tiktokHandles?: string[] }`. At least one is required. Max 5 handles. Creates the run, does the work inside the request (`export const maxDuration = 120`). Returns the run DTO.
- `GET /api/admin/ugc-lab/research/[id]` → run + videos sorted by views desc, with presigned thumbnail URLs.
- `GET /api/admin/ugc-lab/hooks` → saved hooks, newest first.
- `POST /api/admin/ugc-lab/hooks` body `{ text, followUp?, sourceVideoId? }` → saves a hook (from a video or typed).
- `PATCH /api/admin/ugc-lab/hooks/[id]` → edit `text`, `followUp`, `archived`.

### 5.2 Scraping (`research.ts`)

Treg endpoints (verified in the catalog on 2026-09-17). Write a type guard for each response.

| Source | Endpoint | Params |
|---|---|---|
| Niche search | `tikhub.tiktok.search.videos` | `keyword`, `count: 20`, `sort_type: 0`, `publish_time: 30`, `region: 'US'`. Check with one test call that `publish_time: 30` narrows to the last 30 days. If not, filter on `create_time` yourself. |
| Account posts | `scrapecreators.x.v3-tiktok-profile-videos` | `handle` (strip `@`), `sort_by: 'latest'`, `region: 'US'`, `trim: true` |
| Transcript | `scrapecreators.x.v1-tiktok-video-transcript` | `url`, `language: 'en'`, `use_ai_as_fallback: 'true'` (only works for videos under 2 minutes; costs 10 credits) |

Rules:
- Keep only videos published in the last 30 days. Keep the top 15 by views per source.
- Run transcripts with a concurrency limit of 4 (small helper, no new dependency).
- **Thumbnails:** TikTok CDN cover URLs expire and often block hotlinking. Mirror each cover to R2 (`ugcThumbKey`) and serve presigned URLs.
- Sum `costUsdMicros` from every Treg call into the run.
- Partial failure is fine. A failed transcript leaves `transcript: ''`. A failed source sets `run.error` with the source name, but the run is still `ready` if any video came back.

### 5.3 First 5 seconds (`vtt.ts`)

- `parseVttCues(vtt) → { start: number; end: number; text: string }[]`.
- `openingLine(cues, seconds = 5)` → text of cues with `start < 5`. Strip tags and collapse whitespace.
- If the transcript has no timings (plain text), take the first sentence, capped at 25 words.
- `hook` = the existing gpt-4o-mini extraction, but run on `openingLine` plus the next sentence, not the full transcript. Fallback: `openingLine`.
- Unit-test the parser and `openingLine`.

### 5.4 Cover text

- One `chatJson` call per video with the mirrored thumbnail as an `image_url` part (`detail: 'low'`). Return `{ "coverText": "<exact text visible, or empty>" }`. Label it "Cover text" in the UI. It is one frame, not the whole video.

### 5.5 UI — `ResearchSection.tsx`, `ResearchVideoCard.tsx`

- Form (`Section` "Research hooks"): Niche input, TikTok handles (comma-separated). PrimaryButton "Pull videos". Helper line with the estimated cost from the server.
- Past runs: row of SecondaryButtons, newest first. Empty state: "No research yet. Pull videos from your niche to start."
- Videos: `grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3`. Card (`rounded-xl border border-line bg-white p-3`, selected: `ring-2 ring-ink`): thumbnail `h-28 w-20 rounded-lg object-cover` on the left. On the right: `@author` + source pill, views and likes (`text-[11px] text-muted tabular-nums`), hook (`text-[13px] text-ink line-clamp-3`), cover text (`text-[12px] text-muted`), "Open on TikTok" (`text-[12px] text-ink underline`, `target="_blank" rel="noopener noreferrer"`). "Show transcript" expands the full transcript.
- Selecting a card opens the hook editor below the grid (same as today): hook textarea, follow-up textarea (optional, "One sentence after the hook"), word count with the speaking time estimate (2.6 words per second), PrimaryButton "Use this hook".
- "Saved hooks" list under the editor: rows with text, a "Use" button, and "Archive". An "Add your own hook" input at the top of the list.

### 5.6 Phase C acceptance

- A niche search + 2 accounts produces a persisted run that survives refresh.
- Each video shows a hook taken from the first 5 seconds when a timed transcript exists.
- "Use this hook" saves the hook and the selection survives refresh.
- Run cost is shown and matches the sum of Treg cost headers.

---

## 6. Phase D — Personas

### 6.1 API

- `GET /api/admin/ugc-lab/personas` → personas with candidates (presigned URLs), `capabilities`, `estimates`.
- `POST /api/admin/ugc-lab/personas` multipart: `name`, optional `reference` image (jpeg/png/webp, max 8 MB), optional `notes`. Creates the persona, stores the reference (`ugcReferenceKey`), builds `promptJson` and `characterSheet`, sets a random `seed` (1–2,147,483,647). Does not generate images yet.
- `PATCH /api/admin/ugc-lab/personas/[id]` → edit `name`, `promptJson` (validated), `characterSheet`, `seed`, or `lockedCandidateId` (lock; sets `status: 'locked'`). A locked persona's `promptJson` and `characterSheet` cannot change; unlock first. Unlocking does not delete clips.
- `POST /api/admin/ugc-lab/personas/[id]/candidates` body `{ models: string[]; angles?: ('front'|'three_quarter'|'profile')[] }`. Creates one candidate per model × angle, submits to Treg, returns immediately. `maxDuration = 60`.
  - `front`: `image_urls` = the reference screenshot when present.
  - `three_quarter` / `profile`: only on a locked persona. `image_urls` = the locked front image. Prompt: same person, same outfit, same room and light, only the head angle changes.
- `GET /api/admin/ugc-lab/personas/[id]` → refreshes every `generating` candidate (one `reapi.tasks.get` each, in parallel), mirrors finished images to R2, returns the DTO. The client polls this.
- `DELETE /api/admin/ugc-lab/personas/[id]` → archive (`status: 'archived'`), keep files.

### 6.2 Prompt (`personaPrompt.ts`)

Port the portrait-clone rules. They stop the doll-face, big-eyes, HDR look.

1. `promptJson` spells out **every** facial feature: face shape, skin tone as hex, skin texture, eyes, brows, nose, lips, teeth, hair, ears, neck. Plus wardrobe, setting, light, lens, framing and "imperfections". When a reference image exists, fill it with one `chatJson` vision call that returns this JSON shape. Otherwise use the defaults in `src/content/ugc/personaDefaults.ts` (move the current `PORTRAIT_PROMPT_BASE` details there).
2. Render `promptJson` to a prompt string. Always include: `9:16 vertical`, `shot on a phone at eye level`, `unretouched`, visible skin texture, slight flyaways, natural fabric creases.
3. **Banned words** (constant + unit test that the rendered prompt contains none): `4k, 8k, ultra, hyper, detailed, highly detailed, sharp, sharp focus, masterpiece, best quality, HDR, cinematic, flawless, perfect, stunning, beautiful, professional photo, studio lighting, octane, render`. Do **not** add an "Avoid:" list containing these words.
4. `characterSheet`: one or two short sentences built from `promptJson` covering only things that must stay the same in every video: age range, hair style and color, wardrobe (exact top and color), setting, light. Example: "Woman in her late 20s, shoulder-length dark brown hair tucked behind one ear, plain oatmeal crew-neck sweater, beige wall behind her, soft window light from the left." The admin can edit it before locking.
5. Image size: `size: '9:16'` for Gemini. For GPT Image 2 use its 9:16 option (check `treg catalog get reapi.image-gen.gpt-image-2`).

### 6.3 UI — `PersonasSection.tsx`, `PersonaCard.tsx`

- Create form (`Section`): Name, reference screenshot `FileDrop`, notes. PrimaryButton "Create persona".
- Persona list: one `PersonaCard` each, locked first.
- `PersonaCard`:
  - Header: name, `StatusPill` (Draft / Locked), candidate count, total cost `Money`. Buttons: "Show prompt" (collapsible `pre` like `ModelTestRunCard`), "Archive".
  - Editable character sheet textarea (read-only when locked) and seed field.
  - Model checkboxes (reuse `ModelPicker.tsx` if its props fit) + PrimaryButton "Generate candidates · $0.115".
  - Candidates grid: `grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4`. `figure` with `MediaFrame kind="image"`, `figcaption` with model label, angle, seconds, `Money`, and SecondaryButton "Lock this face" (or a "Locked" pill).
  - When locked: SecondaryButton "Generate angles" (3/4 and profile) and PrimaryButton "Use this persona".
  - Voice anchor row (see 7.3): shows the anchor clip thumbnail + `<audio controls>` when set, else "No voice anchor yet".
  - Poll `GET /personas/[id]` with `usePolling` while any candidate is `generating`.
- Empty state: "No personas yet. Create one to generate faces."

### 6.4 Phase D acceptance

- Rendered prompts contain no banned word (test).
- Candidates survive refresh. Images load from R2, not provider URLs.
- A failed poll does not mark a candidate failed.
- A locked persona's character sheet cannot be changed through the API (test).

---

## 7. Phase E — Clips (solid generation)

### 7.1 API

- `GET /api/admin/ugc-lab/clips?personaId=&batchId=` → latest 50 clips + `estimates` + `capabilities`. Refreshes any `generating` clip before returning.
- `POST /api/admin/ugc-lab/clips` body:
  ```ts
  {
    personaId: string; hookIds: string[]; takesPerHook: 1 | 2 | 3;
    resolution: '480p' | '720p'; durationSec: 5 | 8 | 10 | 15;
    seedMode: 'persona' | 'random'; referenceMode: 'front_only' | 'front_and_angles';
    voiceAnchor: boolean; batchLabel?: string; confirmCostMicros?: number;
  }
  ```
  - Persona must be `locked`. `front_and_angles` requires ready angle candidates. `voiceAnchor: true` requires `persona.voiceAnchorKey`.
  - Max 10 clips per request (`hookIds.length × takesPerHook`).
  - Estimate = clips × `SEEDANCE_USD_PER_SECOND[resolution]` × `durationSec`. If above `CONFIRM_ABOVE_USD` and `confirmCostMicros` does not equal the server estimate, return `409 { error: 'confirm_cost', estimateMicros }`. Do not use 402; Treg uses 402 for real balance errors.
  - When clips > 1 or `batchLabel` is set, create a `UgcTestBatch` with the settings.
  - Submit clips **sequentially** with a 1 s gap (avoid bursts). A submit failure marks only that clip `failed` with the message and continues. `maxDuration = 120`.
- `GET /api/admin/ugc-lab/clips/[id]` → refresh + DTO.
- `POST /api/admin/ugc-lab/clips/[id]/retake` → new clip with the **same** `requestJson` (URLs re-presigned from keys), `retakeOfId` set, same batch, `take` = max + 1. Estimate check applies.
- `PATCH /api/admin/ugc-lab/clips/[id]` → ratings (`faceScore`, `voiceScore`, `lipSyncScore`, `cleanScore` each 1–5 or null), `verdict`, `issues`, `notes`.
- `POST /api/admin/ugc-lab/clips/[id]/captions` → `requireFfmpeg()`, set `captionStatus: 'burning'`, run Whisper + ASS + burn from `rawKey`, upload `captionedKey`, set `done`. `maxDuration = 300`. On error set `failed` with the message.
- `POST /api/admin/ugc-lab/clips/[id]/voice-anchor` → `requireFfmpeg()`. Clip must be `ready`. See 7.3.
- `DELETE /api/admin/ugc-lab/clips/[id]` → delete the row and its files. Refuse with 409 when it is the persona's voice anchor clip.

### 7.2 Seedance request (`seedanceRequest.ts`, pure, unit-tested)

```ts
{
  model: 'doubao-seedance-2.5-face',
  content_filter: false,
  prompt,
  duration: durationSec,
  size: '9:16',
  resolution,
  generate_audio: true,
  seed: seedMode === 'persona' ? persona.seed : randomSeed(),   // store the seed used either way
  image_urls: [front, ...(referenceMode === 'front_and_angles' ? [threeQuarter, profile] : [])],
  audio_urls: voiceAnchor ? [anchorUrl] : undefined,
}
```

- `script = hook.followUp ? `${hook.text} ${hook.followUp}` : hook.text`.
- Warn in the UI (not a block) when the script needs more than 2.6 words per second of duration.
- Prompt, in this order. Port the wording from `assets/example_prompt.txt` in the Treg skill:
  1. `The person in @image1 talks directly to the camera in a vertical smartphone selfie video.`
  2. With angles: `@image2 and @image3 show the same person from other angles. Keep the face, hair and outfit identical to @image1.` Use pronouns from the persona (`promptJson.pronoun`, default `they`). Do not hard-code "She".
  3. `characterSheet`, verbatim.
  4. `Phone on a fixed tripod, same room and light as @image1. Camera locked off, no cuts, no zoom.`
  5. `They say, lips synced to every word: "<script>"` (escape double quotes).
  6. With voice anchor: `Their voice, accent, pacing and energy match @audio1.`
  7. `Natural head movement, eye contact with the lens. Hands stay below the chin and never touch the face. No captions, no on-screen text, no music, only their voice and quiet room tone.`
- Build `requestJson` by replacing every presigned URL with its storage key (`{ key: 'admin/ugc/…' }`). A retake rebuilds URLs from those keys.
- On completion: `mirrorToStorage(output.video_urls[0], ugcClipKey(id, 'raw'), 'video/mp4')`, set `rawKey`, `status: 'ready'`, `completedAt`, `costUsdMicros` (submit call cost header when present, else the estimate). Then, if ffmpeg is available, extract the frame strip (7.4). A frame failure never fails the clip.
- The DTO never exposes provider URLs.

### 7.3 Voice anchor (`voiceAnchor.ts`)

Goal: the same voice in every clip of a persona. Seedance picks a new voice each time unless it gets a reference.

- The admin picks the clip whose voice they like and clicks "Use as voice anchor".
- Server: download `rawKey`, extract the audio with ffmpeg (`-vn -ac 1 -ar 44100`, mp3), trim to 10 s max, trim leading and trailing silence (`silenceremove`), upload `ugcVoiceAnchorKey(personaId)`, set `persona.voiceAnchorKey` and `voiceAnchorClipId`. Replacing the anchor overwrites the file.
- Only audio from this lab's own Seedance clips can become an anchor. The route takes a clip id, never a file upload.
- It is a test variable. Seedance may copy the anchor's words or timing instead of just its voice. The consistency view must make that easy to spot (voice and lip-sync scores, issue tag `said_anchor_words`).

### 7.4 Frame strip (`frames.ts`)

- Extract 4 JPEG frames at 10%, 40%, 70% and 95% of the duration (`ffprobe` for duration, `-ss` before `-i`, `-frames:v 1`, width 270). Upload `ugcFrameKey(clipId, i)`. Save `frameKeys`.
- Purpose: spot face drift over time at a glance, without playing every video.
- A "Make frames" button on the clip card for clips that finished while ffmpeg was unavailable.

### 7.5 Captions (`captions.ts`)

Move `ugcCaption.ts` here with these changes:
- Input is a storage key. Download from R2 to the temp dir.
- Use `ffmpeg.ts` helpers. Escape the ASS path for the `ass=` filter (`:` and `\` need escaping).
- Set `PlayResX/PlayResY` from the actual video size (`ffprobe`), and scale font size and margin to it, so 480p and 720p render the same.
- Keep 1–3 word chunks, bold white, black outline, lower-middle position. Match `caption_burn.py`.
- Unit-test `autoChunk` and `toAssTime`.

### 7.6 UI — `ClipsSection.tsx`, `ClipForm.tsx`, `ClipCard.tsx`

`ClipForm` (`Section` "Generate clips"):
- Persona select (locked only) with a 48×84 thumbnail. Preselected from the URL.
- Hook select: saved hooks as checkbox rows, preselected from the URL. Word count and speaking time per hook.
- Takes per hook pills (1 / 2 / 3). Resolution pills (480p / 720p). Duration pills (5 / 8 / 10 / 15).
- Consistency controls (collapsed "Advanced" block, open by default):
  - Seed: "Persona seed (#123456)" / "Random".
  - References: "Front only" / "Front + angles" (disabled with a reason when no angles).
  - Voice anchor toggle (disabled with "Pick a voice anchor from a finished clip first" when none).
  - Batch label input (placeholder "e.g. 720p front-only seed fixed").
- Live estimate: "2 hooks × 3 takes × 8 s × 720p = $12.81".
- PrimaryButton "Generate 6 clips". On `409 confirm_cost`, show `ConfirmCost`.
- Disabled states with reasons: "Lock a persona first", "Pick a hook first".

Clip list: filter pills (All / Generating / Ready / Failed) + persona filter. Grid `grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3`.

`ClipCard`:
- `MediaFrame kind="video"`: captioned version when present, else raw. A "Raw / Captioned" pill switch when both exist. **No side-by-side players.**
- Frame strip under the video: 4 small frames in `grid grid-cols-4 gap-1`, `rounded-md`.
- Meta: hook (`line-clamp-2`), persona, batch label, take, `StatusPill`, duration, resolution, seed, reference mode, voice anchor on/off, elapsed seconds, `Money` estimated vs actual.
- Actions: "Retake", "Burn captions", "Use as voice anchor", "Download", "Delete". ffmpeg actions are disabled with the text "Local admin only" when `capabilities.ffmpeg` is false.
- Errors: `text-[12px] text-red-700` with the provider message. `lastPollError`: `text-[11px] text-muted` "Last check failed, retrying…".
- Poll with `usePolling` while `status === 'generating'` or `captionStatus === 'burning'`.
- Empty state: "No clips yet."

### 7.7 Phase E acceptance

- Refresh during generation: the card reappears and keeps polling.
- Kill the network for 20 s during generation: the card never shows Failed and recovers.
- A provider failure shows the provider's message, and "Retake" works.
- Finished video plays from R2 after 8 days (key-based, not provider URL).
- A retake sends a body identical to the original except for the presigned URL strings (test).
- Captions look the same on 480p and 720p clips.
- Unit tests for `buildSeedanceRequest`: seed modes, reference modes, voice anchor, quote escaping, no hard-coded pronoun.

---

## 8. Phase F — Consistency view

The point of this round: know which settings keep the same character across clips.

### 8.1 API

- `GET /api/admin/ugc-lab/batches?personaId=` → batches with settings and stats.
- `GET /api/admin/ugc-lab/batches/[id]` → batch, persona (locked face URL), clips with frames and ratings, stats.

### 8.2 Stats (`consistency.ts`, pure, unit-tested)

Per batch and per persona:
- Clips total, ready, failed, failure rate.
- Median generation time (`completedAt - submittedAt`).
- Average face, voice, lip-sync and clean scores (ignore nulls, show how many are rated).
- Keep rate = keep / rated.
- Cost per kept clip = total `costUsdMicros` / kept count (show "—" when zero kept).
- Issue counts, from this fixed list: `face_drift`, `different_person`, `hair_changed`, `outfit_changed`, `background_changed`, `voice_changed`, `said_anchor_words`, `lip_sync_off`, `wrong_words`, `extra_fingers`, `morphing`, `text_on_screen`, `music_added`, `cut_or_zoom`.

Per persona, a "Settings comparison" table: one row per distinct settings combination (resolution, seed mode, reference mode, voice anchor) with clip count, average face and voice scores, keep rate and cost per kept clip. Sorted by keep rate.

### 8.3 UI — `ConsistencySection.tsx`, `BatchView.tsx`, `RatingPanel.tsx`

- Persona select at the top.
- Settings comparison table (`overflow-x-auto` wrapper, `text-[12px]`, `tabular-nums`, header `text-[11px] uppercase tracking-widest text-muted`). The best row gets an `emerald-50` "Best so far" pill.
- Batch list: cards with label, settings summary, stats row (`Stat` cards like `OverviewTab`, `grid grid-cols-2 gap-3 sm:grid-cols-4`).
- `BatchView`:
  - Locked persona face pinned first (same size as the frames) so every frame strip can be compared with it.
  - One row per clip: take label, frame strip (4 frames, larger: `grid grid-cols-4 gap-2`), video button that opens the player inline, `RatingPanel`.
  - At 390px the row stacks: frames, then the player button, then ratings.
- `RatingPanel`: `ScoreInput` for Face, Voice, Lip sync, Clean. Issue chips from the fixed list (toggle pills). Keep / Reject pills. Notes textarea. Autosave on change (debounced 600 ms) with a small "Saved" text.
- Keyboard shortcuts on desktop in `BatchView`: `j`/`k` next/previous clip, `1`–`5` set face score, `y` keep, `n` reject.
- Empty states: "No batches yet. Generate 2+ clips of one persona to compare them." and "Rate a few clips to see scores."

### 8.4 Suggested first test plan (show as help text in the section)

Same persona, same hook, 3 takes each, 8 s, 720p:
1. Front only, random seed, no voice anchor (baseline).
2. Front only, persona seed.
3. Front + angles, persona seed.
4. Best of 1–3 + voice anchor.

Rate every clip, then read the settings table.

### 8.5 Phase F acceptance

- Ratings survive refresh and update stats immediately.
- The settings table groups clips correctly (test with fixtures).
- The whole view works at 390px.

---

## 9. Cleanup

- Delete the old handlers once the new routes replace them: `app/api/admin/ugc-lab/{character,generate,status,captions,upload}` and the old `research` handler. Delete `src/server/admin/ugcLab.ts`, `src/server/admin/ugcCaption.ts`, `ugcLab/CharacterPanel.tsx`, `ResearchPanel.tsx`, `VideoPanel.tsx`, `RunCard.tsx`.
- Remove the `DEEPINFRA_TOKEN` use from UGC code (the variable stays for the web-imagery skill).
- One client type per DTO, exported from `src/types/admin/ugc.ts`, imported by both server `dto.ts` and components. No duplicate types.
- Final component file map:

```
src/components/admin/business/UgcLabTab.tsx
src/components/admin/business/ugcLab/
  ui.tsx  api.ts  SelectionBar.tsx
  ResearchSection.tsx  ResearchVideoCard.tsx  HookEditor.tsx  SavedHooks.tsx
  PersonasSection.tsx  PersonaCard.tsx
  ClipsSection.tsx  ClipForm.tsx  ClipCard.tsx
  ConsistencySection.tsx  BatchView.tsx  RatingPanel.tsx  SettingsTable.tsx
```

---

## 10. Final acceptance checklist

- [ ] `npx tsc --noEmit` passes. `npx eslint` on all UGC files: 0 errors, 0 warnings (except documented `no-img-element` disables).
- [ ] `npm test` passes with the new unit tests (status map, Treg errors, pricing, VTT, banned words, Seedance request builder, retake body, caption chunks, consistency stats).
- [ ] No UGC file over 600 lines. No function over 50 lines.
- [ ] No `zinc|gray|blue|yellow|green|gradient` classes in UGC components.
- [ ] Every section has a skeleton, an error with Retry, and an empty state.
- [ ] Works at 390px: no page-level horizontal scroll, buttons at least 40px tall, videos stacked.
- [ ] Refreshing the page at any step loses nothing, including the selected hook and persona.
- [ ] No provider URL is stored or returned to the browser. Everything is served from R2.
- [ ] Every clip stores its exact request (`requestJson`) and seed, and can be retaken.
- [ ] Every paid call records `costUsdMicros` and writes an `AdminAuditLog` row.
- [ ] Playwright screenshots at 390px and 1280px for each section saved under `.data/e2e/ugc-lab-*.png`.
