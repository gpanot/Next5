# P4 — Auth routing, onboarding wizard, identity, free trial

**Size:** L · **Depends on:** P1, P6 core (batch create + pump/poll APIs) · **Flag:** `/start/*` behind flag

## Goal

A new visitor goes from "Start free" to **3 generated photos of themselves (Brand) or of one product
worn (Shop)** in under 5 minutes on a phone, with explicit consent recorded, then sees plans.

## Out of scope

App shell (P5), full set builder editing (P7), products library (P8).

## Tasks

### 4.1 Onboarding state
- [x] Add `onboardingStep` (int, default 0) and `onboardingCompletedAt` to `Workspace` (small migration).
- [x] `GET /api/app/me` (`app/api/app/me/route.ts`): `{ user, workspace, subscription, balance, trial: { available, batchId? }, onboardingStep }`. Works with no workspace (returns `workspace: null`).

### 4.2 Step 1 — Account (`POST /api/app/onboarding/account`)
- [x] Body: `{ product, email, firstName, businessName, industryOrCategory, handle? }`. Validates, upserts `User` (`displayName = firstName`), creates `Workspace` (unique per user+product — if exists, reuse), returns a **session token** (same pattern as `/api/orders` → `signSessionToken`) and sends the magic-link email (`/app?token=…`).
- [x] Client stores `studio_token` in localStorage (existing key) so `/studio` and `/app` share the session.
- [ ] *(Deferred — trial is limited per workspace server-side; existing accounts must confirm by email.)* Abuse: `checkBrowserPreviewAllowed`-style browser check before trial (reuse logic from `useBookingFlow.ts`, extract into `src/lib/trialGuard.ts`).

### 4.3 Step 2 — Consent (`POST /api/app/consents`)
- [x] Writes `ConsentRecord` rows: `terms` always; `face_processing` when the person appears (Brand always; Shop only if "Me"); `ai_labeling` acknowledgement. Store `version = "2026-09"`, IP (`x-forwarded-for` first value) and user agent.
- [ ] *(Copy is inline in `ConsentStep.tsx`; `/legal/*` pages come in P11.)* Copy (checkbox labels) lives in `src/content/business/consent.ts`; the full text is linked to `/legal/ai-and-face-data` (placeholder page until P11 with a clear draft notice).

### 4.4 Step 3 — Identity
- [x] `POST /api/app/identity` (multipart): accepts up to 3 files, kind per file. Server: validate type/size, `sharp` rotate by EXIF → strip metadata → resize longest side 2048 → JPEG q90 → R2 `identityKey` → `IdentityReference` row. Requires `face_processing` consent, else 403.
- [x] Client `IdentityUploader` (Brand): three slots (Front · Slight left · Slight right), camera capture on mobile, live checklist, good/bad examples (D1–D4 images). Quality hints client-side: min 768 px short side, file ≤ 12 MB, warn if very dark (average luminance from a canvas sample < 60). *(Server-side checks only for now: size, type, ≥ 400 px.)*
- [x] Client `ModelChooser` (Shop): "Wear it yourself" (2 selfie slots + 1 full-body slot with D5 example) or "Studio model" (grid from `GET /api/app/studio-models`; if P8 models are not seeded yet, show only "Wear it yourself").

### 4.5 Step 4 — Set / look + first product
- [x] `TemplatePicker` from `GET /api/app/templates?product=` (cover, name, one line).
- [x] Brand: `LocationPicker` (1–3 from template config), `WardrobePicker` (3 chips), optional brand colours (2 `ColorInput`), pose energy (3 chips) → `POST /api/app/sets`.
- [x] Shop: pick look → `POST /api/app/sets` (with `modelRef`) → `QuickProductForm` (front photo, name, category, colour) → `POST /api/app/products` (the minimal version of the P8 endpoint: create only).

### 4.6 Step 5 — Trial generation
- [x] `POST /api/app/onboarding/trial`: if `workspace.trialUsedAt` is null → grant 3 `trial` credits (idempotent ref `trial:{workspaceId}`) → create a `trial` batch: Brand = featured theme, first 3 scenes, format `portrait_4_5`; Shop = the product, `listing` pack, `square_1_1` → set `trialUsedAt`.
- [x] UI `TrialProgress` (animated steps: "Studying your photos · Setting up your set · Directing 3 shots") driven by `useBatchPolling` → results grid (both products; the Shop compare view comes in P8) with Redo available (free redos apply).
- [x] Failure: all 3 failed → auto-refund (P6) + "Something went wrong on our side. Try again" (one retry allowed, new trial grant with ref `trial-retry:{workspaceId}`).

### 4.7 Step 6 — Plan
- [x] `PlanChooser` (reuse `PlanCard`/`TermToggle` from P3) pre-selecting `?plan=&term=` from the URL → `useCheckout` (P2). Success → `/app?welcome=1`. Secondary link "Not now — go to my workspace" → `/app`.

### 4.8 Wizard shell & routing
- [x] `app/start/[product]/page.tsx` (validate `brand|shop` else 404) → `OnboardingWizard` with `Stepper`, per-step components in `src/components/app/onboarding/`, `useOnboarding` hook (loads `/api/app/me`, resumes at `onboardingStep`, `PATCH` step on completion).
- [x] Logged-in user with completed onboarding visiting `/start/*` → redirect to `/app`.
- [ ] *(Deferred — `/app` shows a studio chooser when there's no workspace.)* Login routing per `02-architecture.md` §2: update `app/api/auth/studio/verify` consumers — add `src/lib/postLoginRedirect.ts` used by `/studio` and `/app`.
- [ ] *(Deferred to P11.)* `/studio` login screen: add "Using Next5 for your business? Go to your workspace →" link when `/api/app/me` returns a workspace.

## Implementation notes (2026-09-14)

- **Security:** `POST /api/app/onboarding/account` only issues a session for brand-new emails. Existing users (with bookings or a workspace) get a "continue setup" magic link (`/start/{product}?token=`) — dev logs it instead of emailing unless `NEXT5_SEND_DEV_EMAILS=true`.
- Steps are server-tracked (`workspace.onboardingStep` = completed steps); the wizard shows step `onboardingStep + 1` and allows going back. Trial start sets step 4; "Continue" after the trial sets 5; plan/skip completes onboarding.
- Uploads: `src/server/storage/images.ts` rejects > 12 MB / < 400 px / unsupported types and strips all metadata. Identity upload requires a `face_processing` consent (and none withdrawn since).
- Studio models: 6 generated models (`src/content/business/catalog/studioModels.ts`), seeded by `db:seed:business` into object storage.
- Shared set-builder pieces live in `src/components/app/sets/steps/` (reused by P7).
- Verified end to end with Playwright + Chrome in mock mode: Brand (desktop, Pro 3-month simulated payment → dashboard with 90 photos) and Shop (390 px, Studio model → product → trial → skip plan → dashboard banner).

## Acceptance criteria

- Brand: new email → 3 photos visible in ≤ 5 min on a real phone (4G), consent rows stored, identity files in R2 without EXIF.
- Shop: new email → Studio model or Me → 1 product → 3 listing shots in compare view.
- Refreshing on any step resumes correctly; back button works except during generation.
- Second trial with the same email or same browser within 24 h is refused with a clear message.
- Every step has loading, error and empty handling; light/dark; 375 px.

## Verification

```bash
NEXT5_BUSINESS_ENABLED=true NEXT5_MOCK_GENERATION=true npm run dev   # full wizard both products in mock mode
exiftool <downloaded identity file>   # no GPS / camera tags
```

## Cursor kickoff prompt

```
Implement Phase P4 (docs/business-studios/phases/phase-04-onboarding.md).
Read first: 01-product-spec.md §1–§3, 02-architecture.md §2, §3, §9, 03-ux-ui.md §7, and existing auth:
src/lib/studio-auth.ts, app/studio/page.tsx, app/api/auth/studio/*, app/api/orders/route.ts (session pattern).
Confirm P6 batch APIs exist (POST /api/app/batches, GET /api/app/batches/[id]); if not, stop and tell me.
Build server endpoints with ownership checks first, then the wizard UI step by step. Mobile-first, dark mode,
loading/error/empty states. Tick checkboxes as you go.
```
