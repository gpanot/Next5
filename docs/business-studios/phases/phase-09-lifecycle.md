# P9 — Lifecycle: grants, expiry, reminders, drops, analytics

**Size:** M · **Depends on:** P2, P5 (P7/P8 for product-specific emails) · **Flag:** emails only to business users

## Goal

Prepaid plans behave like a subscription without auto-charging: monthly credits arrive on time,
expired things expire, and customers are reminded at the right moments to renew, top up and
come back for the new theme or new stock.

## Tasks

### 9.1 Billing cron (`app/api/cron/billing-daily/route.ts`, 01:00 UTC)
Each job is idempotent and logs a count; the route returns a JSON summary.
- [ ] `issueDueGrants(now)` (P1) — monthly plan credits.
- [ ] `expireEnded(now)` — subscriptions past `endsAt` → `expired`.
- [ ] `expireDue(now)` (ledger) — expired grant remainders.
- [ ] `expirePendingPayments(now)` — `pending` older than 72 h → `expired`.
- [ ] `queueLifecycleEmails(now)` — see 9.2 (writes `EmailLog` rows first, sends after).
- [ ] `listRetentionDeletions(now)` — products unused 12 months, generated images of workspaces expired > 90 days → **report only** in v1 (admin reviews in P10, deletion job enabled after legal review in P11).

### 9.2 Lifecycle emails (`src/server/email/templates/`, Maileroo)
- [ ] Migration: `EmailLog { id, userId, workspaceId, template, dedupeKey @unique, sentAt, error }` — `dedupeKey` e.g. `renewal-7d:{subscriptionId}`.
- [ ] Shared layout `emailLayout.ts` (logo text, 560 px, light background, one CTA button, footer with "You're receiving this because you have a Next5 workspace" + manage link to `/app/settings`).

| Template | Trigger | Dedupe key | CTA |
|---|---|---|---|
| `welcome` | onboarding account created | `welcome:{workspaceId}` | Continue setup → `/start/{product}` |
| `trialReady` | trial batch terminal | `trial-ready:{batchId}` | See your photos |
| `trialNudge` | 24 h after trial, no plan | `trial-nudge:{workspaceId}` | Pick a plan (shows 3 trial thumbnails) |
| `paymentReceipt` | payment paid (P2) | `receipt:{paymentId}` | Go to workspace |
| `paymentUnderpaid` | underpaid | `underpaid:{paymentId}` | Contact support |
| `creditsGranted` | monthly grant (not first) | `grant:{subscriptionId}:{n}` | Create this month's photos |
| `lowCredits` | balance < 20% of monthly after a batch | `low:{workspaceId}:{yyyy-mm}` | Top up |
| `renewal7d` / `renewal1d` | `endsAt` in 7 / 1 days, no queued renewal | `renewal-7d:{subId}` / `renewal-1d:{subId}` | Renew for $X |
| `planEnded` | expired today | `ended:{subId}` | Renew — library kept 90 days |
| `batchReady` | batch took > 3 min (P6) | `batch-ready:{batchId}` | View photos |
| `brandNewTheme` | 1st of month 02:00, active Brand | `theme:{workspaceId}:{yyyy-mm}` | Create with {Theme} (cover image) |
| `shopRestockNudge` | active Shop, no batch in 7 days, has products added in last 7 days unused | `restock:{workspaceId}:{isoWeek}` | Create photos for N new products |

- [ ] Plain-text alternative for every template; unit tests render each template with sample data (snapshot).

### 9.3 In-app counterparts
- [ ] `BannerStack` (P5) reads the same conditions server-side from `/api/app/me` → `banners: BannerType[]` so email and app never disagree.
- [ ] Dashboard "New this month" dot on the featured theme card (Brand) until the user opens it (localStorage key per month).

### 9.4 Analytics
- [ ] Choose a provider (recommendation: PostHog cloud EU or Vercel Analytics custom events — decide with Guillaume) and implement `src/lib/analytics.ts` `track(event, props)` client + `trackServer` for server events; no PII (user id hash only).
- [ ] Instrument every event in `02-architecture.md` §12.
- [ ] Funnel definitions documented in `docs/business-studios/analytics.md`: landing → onboarding step 1 → trial generated → checkout opened → paid → first non-trial batch → renewal.

## Acceptance criteria

- Simulated clock tests (vitest with fake timers / injected `now`) prove: a 3-month plan yields exactly 3 grants, reminders at 7 d and 1 d, `planEnded` once, no duplicate emails when the cron runs twice.
- Running the cron twice in a row sends nothing new.
- Every email renders in Gmail web + iOS Mail (manual check) and links work with a fresh magic link where login is needed.
- Analytics events visible in the provider dashboard for a full mock funnel.

## Verification

```bash
npm run test
curl -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/billing-daily   # twice, compare summaries
```

## Cursor kickoff prompt

```
Implement Phase P9 (docs/business-studios/phases/phase-09-lifecycle.md).
Read first: 02-architecture.md §5, §8, §12, src/lib/maileroo.ts, and P1/P2/P5 services.
All cron jobs must be idempotent and accept an injected `now` for tests. Write the simulated-clock tests first.
Ask me which analytics provider to use before task 9.4. Tick checkboxes as you go.
```
