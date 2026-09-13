# P1 — Data model, credit ledger, plans config

**Size:** M · **Depends on:** P0 · **Flag:** no UI

## Goal

All business tables exist, seeds load, and the money-critical logic (credits, plan pricing,
subscription grants) is implemented as tested server services.

## Out of scope

Payments provider, UI, generation.

## Tasks

### 1.1 Schema & migration
- [ ] Add every enum/model from `02-architecture.md` §4 to `prisma/schema.prisma`; add back-relations on `User`.
- [ ] Generate SQL with `prisma migrate diff` (command in §4), create `db/migrations/<timestamp>_business_studios.sql`
      with `-- migrate:up` and a complete `-- migrate:down` (drop tables in reverse dependency order, then enums).
- [ ] `npm run db:migrate && npm run generate` against a **local or branch database first** (never prod in this phase).
- [ ] Commit the updated `db/schema.sql` produced by dbmate.

### 1.2 Config
- [ ] `src/config/plans.ts`:
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
- [ ] `src/config/formats.ts`: `FORMATS` map (`portrait_4_5` → `{ ratio: '4:5', label: 'Instagram feed', filenameSuffix: '4x5' }`, etc.), `FormatId` type, `isFormatId` guard.
- [ ] `src/config/shots.ts`: shop shot ids and packs from `01-product-spec` §3.3, `packForCategory(category)`.
- [ ] Tests `tests/config/plans.test.ts`: $19×3 → $51 (5100), $49×3 → $132, $19×6 → $91, savings values.

### 1.3 Server services (all files start with `// server-only` or `import 'server-only'`)
- [ ] `src/server/http.ts`: `HttpError` class, `toErrorResponse(err)` helper for route handlers.
- [ ] `src/server/auth/session.ts`: `requireSession(req)` using `verifySessionToken` from `src/lib/studio-auth.ts`.
- [ ] `src/server/workspaces/workspaces.ts`: `createWorkspace`, `getWorkspaceForUser(userId, product?)`, `requireWorkspace`.
- [ ] `src/server/credits/ledger.ts`: implement the API and algorithm in `02-architecture.md` §5.
      Errors: `InsufficientCreditsError` (maps to HTTP 402).
- [ ] `src/server/subscriptions/subscriptions.ts`: `createPendingSubscription`, `activate`, `issueDueGrants`, `expireEnded`, `getActiveSubscription` (§8).
- [ ] `src/server/storage/keys.ts`: `identityKey(workspaceId, refId)`, `productKey(workspaceId, productId, side)`, `batchItemKey(workspaceId, batchId, itemId)`.

### 1.4 Tests (vitest, using a test database or Prisma mocked via a thin repository layer)
Prefer a real Postgres test DB (`DATABASE_URL_TEST`) with a `beforeEach` truncate — ledger logic must be tested against real transactions.
- [ ] Ledger: FIFO by expiry; split reserve across plan + topup; insufficient → throws and writes nothing;
      idempotent grant (same ref twice = one row); idempotent refund; `expireDue` writes correct remainder;
      trial credits not usable by non-trial batches.
- [ ] Subscriptions: activation with no active sub starts now; renewal queues after current `endsAt`;
      `issueDueGrants` for a 3-month term issues exactly 3 grants across simulated months; `expireEnded`.

### 1.5 Seeds
- [ ] `scripts/seed-business.ts` + npm script `db:seed:business`: upsert 12 `SetTemplate` rows (6 brand, 6 shop) with
      `config` JSON (3–4 location variants each, lighting block, defaults) and cover paths from `04-image-prompts.md`;
      upsert 8 `Theme` rows with scenes from `01-product-spec` §2.3 and `featuredMonth` values from `02-architecture` §4.
      Studio model identity rows are added in P8 (images must exist first).
- [ ] Template/theme cover paths may not exist yet in the manifest — seeds store the paths; UI must not render them until P3 images land (guard with a `hasManifestImage(path)` helper in `src/lib/manifest.ts`).

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
