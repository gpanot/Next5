# P10 — Admin v2

**Size:** M · **Depends on:** P1, P2, P6 (P7/P8 data) · **Flag:** admin only

## Goal

Run the business day to day without touching the database: find a customer, fix a payment, adjust
credits, edit templates/themes/prompt blocks, review flagged outputs, and see the numbers.

## Implementation notes (2026-09-14) — validation-focused subset

Built as **tabs on the existing `/admin`** (not sub-routes): **Overview** (signups by product, trials, trial → paid,
paid payments + revenue, batches, redo rate by reason, provider cost, active plans; 7/30/90 days), **Workspaces**
(search, onboarding step, plan, balance, batches/products, "Grant photos" → bonus credits), **Payments** (state filter,
"Mark paid" → `markPaidAndFulfil`), **QA** (redone or down-rated photos with inputs beside the output and the prompt).
`admin_audit_logs` records credit grants and manual payment confirmations. Admin page hydration bug fixed (token via local store).
Not built yet: workspace detail page (ledger timeline, extend plan, resend link), bank-transaction matching queue (needs the
real provider), CSV export, QA tags, catalog/theme CRUD and versioned prompt blocks, metric charts.

## Tasks

### 10.1 Structure
- [ ] Keep `ADMIN_SECRET` auth (`src/lib/admin-auth.ts`). Convert `/admin` into sub-routes with a left nav:
      `/admin` (Overview), `/admin/workspaces`, `/admin/workspaces/[id]`, `/admin/payments`, `/admin/batches`,
      `/admin/qa`, `/admin/catalog` (templates, themes, Studio models), `/admin/prompts` (existing consumer prompts + business blocks),
      `/admin/consumer` (existing Users/Bookings tabs from P0 split).
- [ ] All admin API routes under `/api/admin/**` verify the admin token; write an `AdminAuditLog { id, action, targetType, targetId, before Json?, after Json?, createdAt }` row for every mutation.

### 10.2 Overview metrics (`GET /api/admin/metrics?from&to`)
- [ ] Cards: active plans by plan id; new paid workspaces; revenue (USD cents & VND, paid payments); renewals due in 7 days;
      trial → paid conversion; batches & items generated; average items/batch; **redo rate** (items with ≥1 redo / ready items) by reason;
      **provider cost** (sum `costUsdMicros`) vs revenue → gross margin %; generation failure rate; median batch duration.
- [ ] Simple bar/line charts (hand-built SVG or a small lib) — no heavy dashboards.

### 10.3 Workspaces
- [ ] List: search by email/name, product, plan status, created date.
- [ ] Detail: user, consents, identity refs (thumbnails, delete), sets, products count, subscriptions timeline, credit ledger table
      (with running balance), payments, batches. Actions: **Adjust credits** (`admin_adjust`, reason required), **Extend plan by N days**,
      **Grant trial again**, **Resend magic link**.

### 10.4 Payments
- [ ] Payments table (state filters) and **Bank transactions** queue (`unmatched`, `underpaid`, `duplicate`):
      match a transaction to a payment (select payment → confirm → fulfil), mark refunded (manual bank refund note), ignore with note.
- [ ] Export CSV (date range) for accounting: payment id, reference, email, purpose, item, USD, VND, fx, state, paidAt.

### 10.5 Batches & QA queue
- [ ] Batches list with filters (product, status, has failures, cost > threshold) and a batch inspector (items, prompts, inputs thumbnails, task ids, errors, cost).
- [ ] `/admin/qa`: items redone with `product_mismatch` or `not_like_me`, and items rated −1, newest first; side-by-side input refs ↔ output; tag failure type (`print_drift`, `colour_shift`, `length_change`, `added_item`, `face_drift`, `hands`, `other`) stored in `QaTag { itemId, tag, note, createdAt }`. Weekly summary card by tag — feeds prompt improvements.

### 10.6 Catalog & prompt blocks
- [ ] CRUD for `SetTemplate` (config JSON editor with schema validation using a typed zod-like guard — no new heavy deps unless approved), `Theme` (scenes editor, `featuredMonth`, cover path picker from manifest), Studio models (activate/deactivate).
- [ ] Move composer text blocks (P6 `blocks.ts`) into a `PromptBlock { key, product, text, version, isActive }` table with fallback to code; admin edits create a new version; composer caches 5 min (same pattern as `src/lib/supabase-prompts.ts`).
- [ ] "Test prompt" action: run one generation with chosen template/theme/product against a test identity (mock or real, cost shown).

## Acceptance criteria

- Every support scenario can be done from `/admin`: underpaid transfer matched, duplicate refunded note, credits adjusted, plan extended, bad output reviewed and tagged.
- Every mutation appears in the audit log.
- Metrics match raw SQL spot checks for one week of data.
- No admin page exceeds 400 lines; admin works on a tablet.

## Cursor kickoff prompt

```
Implement Phase P10 (docs/business-studios/phases/phase-10-admin.md).
Read first: the split admin from P0 (app/admin, src/components/admin), src/lib/admin-auth.ts, 02-architecture.md §4–§8.
Create AdminAuditLog, QaTag and PromptBlock via a dbmate migration + Prisma. Build 10.1 structure first,
then 10.4 payments (most urgent operationally), 10.3, 10.5, 10.2, 10.6. Tick checkboxes as you go.
```
