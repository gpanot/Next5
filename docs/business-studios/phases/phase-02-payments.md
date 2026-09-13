# P2 — Real payments (SePay QR + webhook)

**Size:** M · **Depends on:** P1 · **Flag:** checkout used by `/photos` immediately (security fix); business checkout behind flag

> **Scope change (D7, 2026-09-14):** build the mock-provider version now — tasks 2.2 (except `sepay.ts`
> and the webhook route), 2.3 (fulfil tests), 2.4 and the simulate route. Tasks 2.1, the SePay webhook,
> 2.5 (consumer fix) and the live-payment admin action wait until demand is validated.

## Goal

Money is verified by the bank, not the browser. One payment service serves subscriptions, top-ups
and the existing consumer bookings. USD is shown, VND is charged.

## Out of scope

Billing page UI (P5), renewal emails (P9), Stripe/US payments.

## Tasks

### 2.1 Verify provider details
- [ ] Read the current SePay docs (docs.sepay.vn): webhook payload, auth header, payment-code detection,
      QR image URL params. Update `02-architecture.md` §7.1 if anything differs, **before** coding.
- [ ] In the SePay dashboard: link the bank account, set payment-code prefix `N5`, add the webhook URL
      `https://<domain>/api/webhooks/sepay` with API-key auth. Put secrets in Vercel env (see §10).

### 2.2 Server
- [ ] `src/server/payments/reference.ts`: `createReference()` per §7.2 + collision retry.
- [ ] `src/server/payments/payments.ts`:
  - `createSubscriptionPayment({ userId, workspaceId, planId, termMonths })` → pending `Subscription` + `Payment` (USD cents, VND via `usdCentsToVnd`, fx snapshot, `expiresAt = now + 30 min`).
  - `createTopupPayment({ userId, workspaceId, topupId })`.
  - `createBookingPayment({ userId, bookingId, amountVnd })` (consumer; USD fields null).
  - `getPaymentForUser(paymentId, userId)`; `buildQrUrl(payment)`; `bankDetails()` from env.
- [ ] `src/server/payments/sepay.ts`: `handleSepayWebhook(req)` implementing §7.3 steps 1–5 exactly.
- [ ] `src/server/payments/fulfill.ts`: `fulfill(paymentId)` §7.3 step 6, idempotent via `fulfilledAt`, wrapped in a transaction.
- [ ] `app/api/webhooks/sepay/route.ts` → `handleSepayWebhook`; always responds `{ success: true }` for handled/duplicate/ignored, 401 for bad key, 500 only on unexpected errors (so SePay retries).
- [ ] `app/api/app/payments/route.ts` (POST) and `app/api/app/payments/[paymentId]/route.ts` (GET) — session + ownership.
- [ ] `app/api/payments/booking/route.ts` (POST, consumer) — creates a booking payment for a booking the caller's email owns.
- [ ] `app/api/dev/simulate-sepay/route.ts` — 404 unless `NEXT5_MOCK_PAYMENTS=true`; builds a SePay-shaped payload and passes it through `handleSepayWebhook` (skipping the API-key check only in this route).
- [ ] Receipt email `src/server/email/templates/paymentReceipt.ts` using `src/lib/maileroo.ts` (plan/top-up: USD + VND; booking: VND).

### 2.3 Tests
- [ ] `tests/payments/sepay.test.ts`: exact match → paid + fulfilled once; duplicate webhook → one fulfilment;
      memo with spaces/lowercase (`n5 k7qx-2m9a`) → matches; underpaid → `underpaid`; unknown memo → `unmatched`;
      late payment (expired < 72 h) → paid; `transferType = out` → ignored; wrong API key → 401.
- [ ] `tests/payments/fulfill.test.ts`: subscription activation grants month-1 credits; top-up grants with 12-month expiry.

### 2.4 Checkout UI (`src/components/checkout/`)
- [ ] `CheckoutSheet.tsx` — layout and states from `03-ux-ui.md` §6 (creating · waiting · paid · underpaid · expired · error).
- [ ] `QrCard.tsx`, `BankDetails.tsx` (reuse `booking/payment/CopyField.tsx`), `PaymentCountdown.tsx`, `PaymentStatusSteps.tsx`.
- [ ] `src/hooks/usePaymentStatus.ts` — polls every 3 s, stops on terminal state/unmount, pauses when tab hidden (`visibilitychange`).
- [ ] `src/hooks/useCheckout.ts` — `openCheckout({ purpose, planId?, termMonths?, topupId? })` → POST → sheet.
- [ ] Mock mode: "Simulate transfer" button visible only when the API response has `isMock: true`.

### 2.5 Fix the consumer flow (`/photos`) — **security**
- [ ] `src/components/booking/steps/PaymentStep.tsx`: replace `usePayment` (mock service) with `createBookingPayment` + `usePaymentStatus`; show real QR/bank details; keep existing visual design and VND.
- [ ] `useBookingFlow.setPaymentStatus` no longer triggers confirmation from the client; confirmation happens when `usePaymentStatus` reports `paid` (server truth), then the existing redirect to `/studio` runs.
- [ ] `app/api/orders/route.ts`: stop changing `paymentStatus`; keep saving name/feelings/goals and sending the magic-link email **only if** the booking's payment is `paid`.
- [ ] Post-payment generation (scenes 2–5) must be triggered server-side from `fulfill()` for `consumer_booking`, or remain client-triggered but the generate route must verify `Booking.paymentStatus = paid` before calling WaveSpeed. Choose server-side verification in `app/api/generate/scene/route.ts` at minimum.
- [ ] Remove `src/services/payment.ts` mock and `src/hooks/usePayment.ts` once unused.

### 2.6 Admin (minimal, full version in P10)
- [ ] `/admin` new tab **Payments**: list payments (state filter) and bank transactions with `matchStatus ≠ matched`; action "Mark paid" on a payment (writes `paidVnd = amountVnd`, calls `fulfill`) with confirmation.
- [ ] Admin action **"Create 2,000₫ test payment"** (purpose `topup`, no credits granted — `itemId = 'test'`, `fulfill` skips it) to verify the live bank → SePay → webhook chain in production.

## Acceptance criteria

- Real transfer of the smallest top-up (or a 2,000₫ test payment created by an admin-only route) is matched and fulfilled within 60 s.
- Replaying the same webhook payload does not grant credits twice.
- On `/photos`, it is impossible to reach `/studio?bookingId=…` with generated photos without a matched payment (try calling `/api/orders` and `/api/generate/scene` directly — both refuse).
- Checkout sheet works on a 375 px wide screen in light and dark mode; all six states reachable (mock).
- Tests pass.

## Verification

```bash
npm run test
NEXT5_MOCK_PAYMENTS=true NEXT5_MOCK_GENERATION=true npm run dev
curl -X POST localhost:3000/api/webhooks/sepay -H 'Authorization: Apikey wrong' -d '{}'   # → 401
```

## Cursor kickoff prompt

```
Implement Phase P2 (docs/business-studios/phases/phase-02-payments.md).
Read first: docs/business-studios/02-architecture.md §7 and §8, 03-ux-ui.md §6, and the current payment code:
src/services/payment.ts, src/hooks/usePayment.ts, src/components/booking/steps/PaymentStep.tsx,
src/hooks/useBookingFlow.ts, app/api/orders/route.ts, app/api/generate/scene/route.ts.
Start with task 2.1: summarise the SePay webhook/QR spec you verified and stop for my confirmation.
Then write the webhook tests first (2.3), implement 2.2 to make them pass, then UI (2.4), then the consumer fix (2.5).
Money logic runs on the server only. Tick checkboxes as you go.
```
