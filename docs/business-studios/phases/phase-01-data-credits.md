# P1 — Data model, credit ledger, plans config

**Size:** M · **Depends on:** P0 · **Flag:** no UI

## Goal

All business tables exist, seeds load, and the money-critical logic (credits, plan pricing,
subscription grants) is implemented as tested server services.

## Out of scope

Payments provider, UI, generation.

## Tasks

### 1.1 Schema & migration
- [x] Add every enum/model from `02-architecture.md` §4 to `prisma/schema.prisma`; add back-relations on `User`.
- [x] Generate SQL with `prisma migrate diff` (command in §4), create `db/migrations/<timestamp>_business_studios.sql`
      with `-- migrate:up` and a complete `-- migrate:down` (drop tables in reverse dependency order, then enums).
- [x] `npm run db:migrate && npm run generate` against a **local or branch database first** (never prod in this phase).
- [ ] Commit the updated `db/schema.sql` produced by dbmate. *(Deferred — see notes: dump from the real database after migrating it.)*

### 1.2 Config
- [x] `src/config/plans.ts`:
  ```ts
  export type PlanId = 'brand_starter' | 'brand_pro' | 'shop_starter' | 'shop_pro';
  export type TermMonths = 1 | 3 | 6;
  export type Plan = {
    id: PlanId; product: 'brand' | 'shop'; name: string; monthlyUsdCents: number;
    monthlyCredits: number; maxSets: number; highRes: boolean; captions: boolean;
    allStudioModels: boolean; priority: boolean; features: readonly string[];
  };
  export const PLANS: Record<PlanId, Plan> = { … values from 01-product-spec §4.1 … };
  export const TERM_DISCOUNT: Record<TermMonths, number> = { 1: 0, 3: 0.1, 6: 0.2 };
  export type TopupId = 'topup_20' | 'topup_60' | 'topup_150';
  export const TOPUPS: Record<TopupId, { credits: number; usdCents: number; validityMonths: 12 }> = { … };
  export const getTermPriceUsdCents = (planId: PlanId, term: TermMonths): number
    // = round to nearest whole dollar of monthly × term × (1 − discount), returned in cents
  export const getTermSavingsUsdCents = (planId: PlanId, term: TermMonths): number
  export const plansForProduct = (product: 'brand' | 'shop'): readonly Plan[]
  ```
- [x] `src/config/formats.ts`: `FORMATS` map (`portrait_4_5` → `{ ratio: '4:5', label: 'Instagram feed', filenameSuffix: '4x5' }`, etc.), `FormatId` type, `isFormatId` guard.
- [x] `src/config/shots.ts`: shop shot ids and packs from `01-product-spec` §3.3, `packForCategory(category)`.
- [x] Tests `tests/config/plans.test.ts`: $19×3 → $51 (5100), $49×3 → $132, $19×6 → $91, savings values.

### 1.3 Server services (all files start with `// server-only` or `import 'server-only'`)
- [x] `src/server/http.ts`: `HttpError` class, `toErrorResponse(err)` helper for route handlers.
- [x] `src/server/auth/session.ts`: `requireSession(req)` using `verifySessionToken` from `src/lib/studio-auth.ts`.
- [x] `src/server/workspaces/workspaces.ts`: `createWorkspace`, `getWorkspaceForUser(userId, product?)`, `requireWorkspace`.
- [x] `src/server/credits/ledger.ts`: implement the API and algorithm in `02-architecture.md` §5.
      Errors: `InsufficientCreditsError` (maps to HTTP 402).
- [x] `src/server/subscriptions/subscriptions.ts`: `createPendingSubscription`, `activate`, `issueDueGrants`, `expireEnded`, `getActiveSubscription` (§8).
- [x] `src/server/storage/keys.ts`: `identityKey(workspaceId, refId)`, `productKey(workspaceId, productId, side)`, `batchItemKey(workspaceId, batchId, itemId)`.

### 1.4 Tests (vitest, using a test database or Prisma mocked via a thin repository layer)
Prefer a real Postgres test DB (`DATABASE_URL_TEST`) with a `beforeEach` truncate — ledger logic must be tested against real transactions.
- [x] Ledger: FIFO by expiry; split reserve across plan + topup; insufficient → throws and writes nothing;
      idempotent grant (same ref twice = one row); idempotent refund; `expireDue` writes correct remainder;
      trial credits not usable by non-trial batches.
- [x] Subscriptions: activation with no active sub starts now; renewal queues after current `endsAt`;
      `issueDueGrants` for a 3-month term issues exactly 3 grants across simulated months; `expireEnded`.

### 1.5 Seeds
- [x] `scripts/seed-business.ts` + npm script `db:seed:business`: upsert 12 `SetTemplate` rows (6 brand, 6 shop) with
      `config` JSON (3–4 location variants each, lighting block, defaults) and cover paths from `04-image-prompts.md`;
      upsert 8 `Theme` rows with scenes from `01-product-spec` §2.3 and `featuredMonth` values from `02-architecture` §4.
      Studio model identity rows are added in P8 (images must exist first).
- [x] Template/theme cover paths may not exist yet in the manifest — seeds store the paths; UI must not render them until P3 images land (guard with a `hasManifestImage(path)` helper in `src/lib/manifest.ts`).

## Implementation notes (2026-09-14)

- **Ledger design:** every spend/refund/expiry row carries `grantId` (the grant it affects); a grant's remaining =
  `grant.delta + Σ rows(grantId)`. Buckets: `trial · plan · bonus (admin) · topup`; spend order plan → bonus → topup.
  Services live in `src/server/credits/{grants,balance,spend,refund,expiry,ledger}.ts`.
- The ledger unique index is created with `NULLS NOT DISTINCT` (hand-edited in the SQL migration) so grant rows are idempotent.
- `withSerializable()` (`src/server/db/transaction.ts`) retries serialization failures; a concurrency test proves no double-spend.
- Prices: term prices round to the nearest dollar (`$15 × 3 × 0.9 = $40.50 → $41`).
- **Local databases:** `next5_dev` / `next5_test` on localhost, created from `db/schema.sql` (the migrations folder has drifted
  from the real schema — enum names differ — so never rebuild from migrations alone). `.env.local` still points at Railway:
  run business work locally with `DATABASE_URL=postgres://$USER@localhost:5432/next5_dev npm run dev`.
- `db/schema.sql` was **not** re-dumped (local Postgres is 16, production dump is 18). Re-dump from the real database after
  applying the migration there.
- Catalog data (templates, themes, wardrobe/pose options) lives in `src/content/business/catalog/` and is both seeded and
  imported by static marketing pages.
- Tests: `npm run test` → 41 passing (ledger, subscriptions, plans, shots, dates, money).

## Acceptance criteria

- Migration applies and rolls back cleanly on a fresh database.
- `npm run test` passes with ledger and subscription suites (≥ 20 assertions).
- `npm run db:seed:business` is idempotent (running twice changes nothing).
- No client bundle imports `src/server/**` (check with `next build` output / grep).

## Verification

```bash
npm run db:migrate && npm run db:rollback && npm run db:migrate
npm run db:seed:business && npm run db:seed:business
npm run test && npm run build
grep -rl "src/server" src/components src/hooks app --include=*.tsx | xargs grep -l "'use client'"   # must be empty
```

## Cursor kickoff prompt

```
Implement Phase P1 (docs/business-studios/phases/phase-01-data-credits.md).
Read first: docs/business-studios/02-architecture.md §4, §5, §8 and 01-product-spec.md §4.
Existing DB conventions: dbmate SQL migrations in db/migrations (see 20260901180000_add_preview_feedback.sql)
mirrored in prisma/schema.prisma with snake_case @map names.
Work task by task; write the vitest tests for the ledger BEFORE the implementation and make them pass.
Never run migrations against production. Tick checkboxes in the phase file as you go.
```
