# P5 — App shell, dashboard, billing, settings & privacy

**Size:** M · **Depends on:** P1, P2 · **Flag:** `/app/*` behind flag

## Goal

The authenticated workspace frame every feature lives in: navigation, credit meter, banners,
dashboard, billing (plans, top-ups, payment history) and settings including face-data deletion.

## Out of scope

Create/batch/sets/products/library pages (P7/P8) — add nav items that point to "Coming soon" empty
states until those phases land.

## Tasks

### 5.1 Session & data hooks
- [x] `src/hooks/useSession.ts` — reads/consumes `?token=` (verify like `app/studio/page.tsx`), stores `studio_token`, exposes `{ status, token, signOut }`.
- [x] `src/hooks/useWorkspace.ts` — fetches `/api/app/me`, exposes `{ me, refresh }`, refetches on window focus; shared via `WorkspaceProvider` context in the app layout (avoid prop drilling).
- [x] `src/lib/apiClient.ts` — `apiFetch<T>(path, init)` adding the bearer token, parsing JSON, mapping 401 → sign-out, 402 → `InsufficientCredits` error type.

### 5.2 Layout (`app/app/layout.tsx` + `src/components/app/shell/`)
- [x] `AppShell` with `SidebarNav` (desktop ≥ 1024 px) and `BottomTabBar` (mobile) per `03-ux-ui.md` §8; items vary by `workspace.product` (Products only for shop).
- [x] *(AccountMenu not built — Sign out lives in Settings.)* `TopBar`: page title slot, `CreditsPill` (`ProgressMeter` popover: plan vs top-up credits, next reset, [Top up]), `+ Create` button, `AccountMenu` (Settings, Billing, Next5 Photos bookings `/studio`, Sign out).
- [x] `ProductSwitcher` placeholder: shows the product name; hidden until a user has both workspaces (then switches `?product=`).
- [x] Guards: no session → sign-in screen (email → magic link, reuse `/api/auth/studio/magic` but link to `/app`); session but no workspace → redirect `/start/brand` with a chooser.
- [x] `BannerStack` rules (priority order, max 1 visible): underpaid payment · plan ended · renewal ≤ 7 days · credits < 20% of monthly · trial done & no plan.

### 5.3 Dashboard (`app/app/page.tsx`)
- [x] Brand variant and Shop variant per `03-ux-ui.md` §8.1/§8.2. Data: `/api/app/me` + `GET /api/app/batches?limit=6` + (brand) `GET /api/app/themes?featured=1`, (shop) `GET /api/app/products?unused=1&limit=8` (endpoint lands in P8 — render the card only when the endpoint responds).
- [ ] *(Deferred to P4 hand-off.)* `?welcome=1` → one-time `WelcomeDialog` (3 tips) after onboarding/payment.
- [x] Skeletons for every card; empty states per spec.

### 5.4 Billing (`app/app/billing/page.tsx`)
- [x] `CurrentPlanCard` (plan, term, dates, next grant), `CreditsBreakdown` (by bucket + next expiry), `RenewOrChangePlan` (opens `PlanChooser` in a `Sheet`; shows the upgrade rule from `02-architecture.md` §8), `TopupsRow`, `PaymentsTable` (`GET /api/app/payments`; mobile = stacked rows; pending row → Resume → `CheckoutSheet`).
- [x] *(`/api/app/billing` not needed — `/api/app/me` carries plan, renewal and balance.)* Server: `GET /api/app/payments` (paginated, owner only), `GET /api/app/billing` summary (subscription + queued renewal + balance by bucket).

### 5.5 Settings (`app/app/settings/page.tsx`, `app/app/settings/privacy/page.tsx`)
- [x] Sections: Profile (display name), Business (`PATCH /api/app/workspaces`: name, handle, industry, brand colours), Output (visible AI tag switch, default formats saved on workspace — add `defaultFormats String[]` in a small migration), Identity photos (list, replace, delete single). *(List/replace lands with P4 identity APIs.)*
- [x] *(Export = mailto in v1.)* Privacy page: **Download my data** (`GET /api/app/privacy/export` → zip of identity refs + generated images + JSON of batches/payments, max 500 files, async email link if larger — v1: cap and say so), **Delete my face data** (`POST /api/app/privacy/delete-identity`: R2 delete all identity objects, set `deletedAt`, write `ConsentRecord` type `face_processing_withdrawn`; typed-confirmation dialog), account deletion = mailto support in v1.
- [x] After face-data deletion, create flows show "Add new photos to create more" empty state.

## Implementation notes (2026-09-14)

- Session: `sessionTokenStore` / `productStore` (`src/lib/localStore.ts`, `useSyncExternalStore`) instead of ad-hoc localStorage effects (React Compiler lint forbids sync setState in effects). `AppGate` consumes `?token=` magic links; `/api/auth/studio/magic` accepts `destination: 'app'`.
- `GET /api/app/me` (`src/server/me.ts`) returns workspace, plan, balance and server-computed banners; `PATCH /api/app/workspaces`; `POST /api/app/privacy/delete-identity`; `GET /api/app/themes` (all themes usable; "featured" = this month or next upcoming).
- Data export is a mailto for v1 (documented on the privacy page); ProductSwitcher is implicit via `productStore` (UI switcher deferred until someone has both workspaces).
- Dev helper: `DATABASE_URL=postgres://$USER@localhost:5432/next5_dev npx tsx --env-file=.env.local scripts/dev-seed-business.ts [email] [brand|shop]` prints a sign-in link (refuses non-localhost DBs).

## Acceptance criteria

- Mobile (375 px) and desktop layouts match `03-ux-ui.md` §8; bottom bar respects safe area; keyboard navigation through sidebar works.
- Credits pill equals `getBalance()`; buying a top-up in mock mode updates the pill without reload (refresh after `paid`).
- Pending payment can be resumed from Billing; expired shows "Generate new QR".
- Face-data deletion removes R2 objects (verify in R2) and blocks new batches until new photos are added.
- All pages: skeleton, error (simulate API 500), empty states.

## Verification

```bash
NEXT5_BUSINESS_ENABLED=true NEXT5_MOCK_PAYMENTS=true NEXT5_MOCK_GENERATION=true npm run dev
```

## Cursor kickoff prompt

```
Implement Phase P5 (docs/business-studios/phases/phase-05-app-shell-billing.md).
Read first: 03-ux-ui.md §4, §8 (8.1, 8.2, 8.10, 8.11), 02-architecture.md §3, §8, §9, and P2's checkout components.
Use the P0 primitives only (src/components/ui). Create WorkspaceProvider context instead of prop drilling.
Build: hooks (5.1) → shell (5.2) → dashboard (5.3) → billing (5.4) → settings/privacy (5.5).
Every view needs skeleton, error and empty states, light/dark, mobile-first. Tick checkboxes as you go.
```
