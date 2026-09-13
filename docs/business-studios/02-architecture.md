# 02 — Architecture

Stack (unchanged): Next.js 16.3 App Router · React 19 · Tailwind v4 · Prisma 6 + dbmate
(Railway Postgres) · Cloudflare R2 · WaveSpeed (Nano Banana 2 Edit) · OpenAI gpt-4o-mini ·
Maileroo email · Vercel hosting · custom JWT magic-link auth.

> ⚠️ Before writing any route handler, layout, `after()`, cron or metadata code, read the matching
> guide in `node_modules/next/dist/docs/` (see `AGENTS.md`). APIs differ from older Next.js.

---

## 1. Folder structure (additions)

```
app/
  page.tsx                         ← consumer page until launch; business homepage at P11 launch
  photos/page.tsx                  ← consumer homepage moved here (P0)
  (marketing)/layout.tsx           ← route group (no URL segment): BusinessSurface + header/footer (P3)
  (marketing)/brand/page.tsx       ← /brand (P3)
  (marketing)/shop/page.tsx        ← /shop (P3)
  (marketing)/pricing/page.tsx     ← /pricing (P3)
  page.tsx                         ← business home when the flag is on, consumer home otherwise (P11)
  start/[product]/page.tsx         ← onboarding wizard, product = brand | shop (P4)
  app/                             ← authenticated workspace (P5+)
    layout.tsx                     ← AppShell (sidebar / bottom tabs), auth guard
    page.tsx                       ← dashboard
    create/page.tsx                ← new batch (branches on workspace.product)
    batches/[batchId]/page.tsx     ← results
    library/page.tsx
    sets/page.tsx · sets/new/page.tsx · sets/[setId]/page.tsx
    products/page.tsx              ← Shop only
    billing/page.tsx
    settings/page.tsx · settings/privacy/page.tsx
  legal/terms/page.tsx · legal/privacy/page.tsx · legal/ai-and-face-data/page.tsx   ← P11
  api/
    app/…                          ← authenticated business APIs (see §3)
    webhooks/sepay/route.ts        ← P2
    cron/generations/route.ts      ← P6
    cron/billing-daily/route.ts    ← P9
    admin/…                        ← extended in P10

src/
  config/
    plans.ts                       ← plans, top-ups, prepaid terms, credit costs (P1)
    formats.ts                     ← format ids → aspect ratios, labels (P1)
    business.ts                    ← feature flag, trial size, regen caps, FX (P0/P1)
  server/                          ← server-only domain services (never imported by client components)
    credits/ledger.ts
    workspaces/workspaces.ts
    subscriptions/subscriptions.ts
    payments/payments.ts · payments/sepay.ts · payments/fulfill.ts
    generation/composer/brand.ts · composer/shop.ts · composer/blocks.ts
    generation/pump.ts · generation/poll.ts · generation/finalize.ts
    generation/labeling.ts
    storage/keys.ts                ← R2 key builders
    auth/session.ts                ← requireSession(req) → { userId, email }
    email/templates/*.ts
  components/
    app/…                          ← AppShell, dashboard, billing, batches, sets, products
    marketing/…                    ← new landing sections (P3)
    checkout/…                     ← CheckoutSheet (P2)
    ui/…                           ← new primitives (P0)
  hooks/
    useSession.ts · useWorkspace.ts · useBatchPolling.ts · usePaymentStatus.ts
  lib/
    money.ts                       ← formatUsd, usdToVnd, formatVnd
    analytics.ts                   ← track() wrapper (P9)
tests/                             ← vitest unit tests (P1+)
```

Rule: files in `src/server/**` start with a comment `// server-only` and must never be imported
from a file that has `'use client'`. (Optionally add the `server-only` npm package in P0 and
`import 'server-only'` at the top of each.)

---

## 2. Page route map

| Route | Auth | Phase | Purpose |
|---|---|---|---|
| `/` | public | P11 | Business homepage (Brand / Shop chooser) — built at `/home-preview` in P3, moved to `/` in P11 |
| `/brand` | public | P3 | Brand Studio landing |
| `/shop` | public | P3 | Shop Studio landing |
| `/pricing` | public | P3 | Plans for both products, top-ups, billing FAQ |
| `/photos` | public | P0 | Existing consumer homepage (unchanged content) |
| `/studio` | magic link | existing | Consumer bookings portal (unchanged) |
| `/start/brand`, `/start/shop` | public → session created in step 1 | P4 | Onboarding wizard + trial |
| `/app` … | session + workspace | P5–P8 | Business workspace |
| `/admin` | admin token | P10 | Extended admin |
| `/legal/*` | public | P11 | Terms, Privacy, AI & Face Data |

**Login routing (P4):** after `/api/auth/studio/verify` succeeds, the client calls
`GET /api/app/me`. If the user owns a workspace → `/app`; else if they have consumer bookings →
`/studio`; else → `/`. Magic-link emails for business users link to `/app?token=…`
(the `/app` layout consumes `?token=` exactly like `app/studio/page.tsx` does today).

---

## 3. API route map (business)

All `/api/app/**` routes: `Authorization: Bearer <studio_token>` → `requireSession()`;
resolve the caller's workspace server-side; never accept `workspaceId` from the client without
checking ownership. Responses are typed (`export type …Response`) next to the handler.

| Method & path | Phase | Body / query | Returns |
|---|---|---|---|
| `GET /api/app/me` | P4 | — | user, workspace (or null), subscription, credit balance, trial state, onboardingStep, banners |
| `POST /api/app/onboarding/account` | P4 | product, email, firstName, businessName, industryOrCategory, handle? | session token + workspace |
| `PATCH /api/app/onboarding/step` | P4 | step | workspace.onboardingStep |
| `POST /api/app/onboarding/trial` | P4 | — | trial batch |
| `POST /api/app/workspaces` | P4 | product, name, industry/category, handle | workspace |
| `PATCH /api/app/workspaces` | P5 | name, handle, brandColors, visibleAiTag | workspace |
| `POST /api/app/consents` | P4 | type, version | consent |
| `POST /api/app/identity` | P4 | multipart: files[], kind | identity refs |
| `GET /api/app/identity` · `DELETE /api/app/identity/[id]` | P4/P5 | — | refs · 204 |
| `GET /api/app/templates?product=` | P4 | — | set templates |
| `GET/POST /api/app/sets` · `GET/PATCH/DELETE /api/app/sets/[id]` | P4/P7 | set fields | set(s) |
| `GET /api/app/themes` | P7 | — | featured + library themes |
| `GET/POST /api/app/products` · `PATCH/DELETE /api/app/products/[id]` | P8 | multipart for photos | product(s) |
| `GET /api/app/studio-models` | P8 | — | house models (id, name, cover) |
| `POST /api/app/batches/estimate` | P6 | batch draft | `{ credits, balanceAfter, canAfford }` |
| `POST /api/app/batches` | P6 | batch draft | batch (status queued) |
| `GET /api/app/batches` | P6 | `?cursor` | paginated list |
| `GET /api/app/batches/[id]` | P6 | — | batch + items with presigned URLs; **also runs a bounded pump/poll** |
| `POST /api/app/batches/[id]/items/[itemId]/redo` | P6 | reason | item (requeued) |
| `PATCH /api/app/batches/[id]/items/[itemId]` | P6 | favorite, rating | item |
| `GET /api/app/batches/[id]/zip` | P6 | `?productId=&format=` | zip stream |
| `GET /api/app/library` | P7 | filters, cursor | items |
| `POST /api/app/items/[itemId]/caption` | P7 | — | caption (Pro) |
| `POST /api/app/payments` | P2 | purpose, planId+termMonths \| topupId | payment (QR, VND amount, reference, expiresAt) |
| `GET /api/app/payments/[id]` | P2 | — | status |
| `GET /api/app/payments` | P5 | — | history |
| `POST /api/app/privacy/delete-identity` | P5 | — | 204 |
| `POST /api/webhooks/sepay` | P2 | SePay payload | `{ success: true }` |
| `GET /api/cron/generations` | P6 | `CRON_SECRET` | pump + poll summary |
| `GET /api/cron/billing-daily` | P9 | `CRON_SECRET` | grants, expiries, reminders summary |

Consumer `/photos` booking payment moves to `POST /api/payments/booking` + the same webhook (P2).

---

## 4. Data model

Add to `prisma/schema.prisma` (keep existing models). Then generate the dbmate SQL:

```bash
npx prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script > /tmp/business.sql
# Create db/migrations/<YYYYMMDDHHMMSS>_business_studios.sql with:
#   -- migrate:up   + contents of /tmp/business.sql
#   -- migrate:down + DROP statements in reverse order
npm run db:migrate && npm run generate
```

(Existing migrations use the `-- migrate:up` / `-- migrate:down` format — see
`db/migrations/20260901180000_add_preview_feedback.sql`.)

```prisma
enum ProductLine {          // which business product a workspace uses
  brand
  shop
}

enum IdentityKind {
  face
  full_body
}

enum SetStatus {
  draft
  active
  archived
}

enum BatchKind {
  trial
  brand_theme
  shop_products
}

enum BatchStatus {
  queued
  generating
  ready        // all items terminal, ≥1 ready
  failed       // all items failed
  cancelled
}

enum ItemStatus {
  queued
  submitting
  generating
  ready
  failed
}

enum SubscriptionStatus {
  pending      // payment created, not paid
  active
  expired
  cancelled
}

enum PaymentPurpose {
  subscription
  topup
  consumer_booking
}

enum PaymentState {
  pending
  paid
  underpaid
  expired
  refunded
}

enum LedgerReason {
  trial_grant
  plan_grant
  topup_grant
  batch_reserve
  item_refund
  redo_charge
  expiry
  admin_adjust
}

model Workspace {
  id             String      @id @default(cuid())
  ownerUserId    String      @map("owner_user_id")
  product        ProductLine
  name           String                              // business or shop name
  industry       String?                             // brand: realtor|coach|beauty|fitness|finance|other ; shop: fashion|accessories|mixed
  handle         String?                             // @instagram / tiktok
  brandColors    String[]    @default([]) @map("brand_colors")
  visibleAiTag   Boolean     @default(false) @map("visible_ai_tag")
  trialUsedAt    DateTime?   @map("trial_used_at")
  createdAt      DateTime    @default(now()) @map("created_at")
  updatedAt      DateTime    @updatedAt @map("updated_at")

  owner          User                @relation(fields: [ownerUserId], references: [id])
  identities     IdentityReference[]
  sets           StudioSet[]
  products       Product[]
  batches        Batch[]
  subscriptions  Subscription[]
  ledger         CreditLedger[]
  payments       Payment[]

  @@unique([ownerUserId, product])   // v1: one workspace per product per user
  @@map("workspaces")
}

model IdentityReference {
  id              String       @id @default(cuid())
  workspaceId     String?      @map("workspace_id")   // null for Next5 Studio models
  kind            IdentityKind
  r2Key           String       @map("r2_key")
  isStudioModel   Boolean      @default(false) @map("is_studio_model")
  studioModelSlug String?      @map("studio_model_slug") // e.g. "model-an"
  wavespeedUrl    String?      @map("wavespeed_url")    // cached upload URL
  wavespeedUrlAt  DateTime?    @map("wavespeed_url_at") // re-upload if older than 24h
  deletedAt       DateTime?    @map("deleted_at")
  createdAt       DateTime     @default(now()) @map("created_at")

  workspace Workspace? @relation(fields: [workspaceId], references: [id])

  @@index([workspaceId])
  @@map("identity_references")
}

model ConsentRecord {
  id         String   @id @default(cuid())
  userId     String   @map("user_id")
  type       String                         // face_processing | terms | ai_labeling
  version    String                         // e.g. "2026-09"
  ip         String?
  userAgent  String?  @map("user_agent")
  acceptedAt DateTime @default(now()) @map("accepted_at")

  user User @relation(fields: [userId], references: [id])

  @@index([userId])
  @@map("consent_records")
}

model SetTemplate {
  id          String      @id                    // e.g. "modern-office"
  product     ProductLine
  name        String
  description String
  coverImage  String      @map("cover_image")    // /images/… path from manifest
  config      Json                               // locations[], lightingBlock, defaults — see §6
  sortOrder   Int         @default(0) @map("sort_order")
  isActive    Boolean     @default(true) @map("is_active")

  sets StudioSet[]

  @@map("set_templates")
}

model StudioSet {
  id            String    @id @default(cuid())
  workspaceId   String    @map("workspace_id")
  templateId    String    @map("template_id")
  name          String
  locations     String[]                           // template location ids, 1–3
  wardrobe      String?                            // brand: business_formal | smart_casual | brand_color_accent
  poseEnergy    String?   @map("pose_energy")      // brand: warm_approachable | confident_expert | dynamic_candid
  brandColors   String[]  @default([]) @map("brand_colors")
  modelRef      String?   @map("model_ref")        // shop: "me" | studio model slug
  status        SetStatus @default(active)
  coverR2Key    String?   @map("cover_r2_key")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  workspace Workspace   @relation(fields: [workspaceId], references: [id])
  template  SetTemplate @relation(fields: [templateId], references: [id])
  batches   Batch[]

  @@index([workspaceId])
  @@map("studio_sets")
}

model Theme {
  id             String    @id                     // e.g. "just-listed"
  title          String
  description    String
  coverImage     String    @map("cover_image")
  scenes         Json                              // [{ id, label, direction }]
  featuredMonth  String?   @map("featured_month")  // "2026-10" → featured that month
  isActive       Boolean   @default(true) @map("is_active")
  sortOrder      Int       @default(0) @map("sort_order")

  batches Batch[]

  @@map("themes")
}

model Product {
  id           String    @id @default(cuid())
  workspaceId  String    @map("workspace_id")
  name         String
  category     String                              // see 01-product-spec §3.3
  colorName    String?   @map("color_name")
  sku          String?
  fit          String?                             // fitted | regular | oversized
  notes        String?
  frontR2Key   String    @map("front_r2_key")
  backR2Key    String?   @map("back_r2_key")
  detailR2Key  String?   @map("detail_r2_key")
  lastUsedAt   DateTime? @map("last_used_at")
  archivedAt   DateTime? @map("archived_at")
  createdAt    DateTime  @default(now()) @map("created_at")

  workspace Workspace   @relation(fields: [workspaceId], references: [id])
  items     BatchItem[]

  @@index([workspaceId])
  @@map("products")
}

model Batch {
  id              String      @id @default(cuid())
  workspaceId     String      @map("workspace_id")
  kind            BatchKind
  status          BatchStatus @default(queued)
  name            String                            // "Just Listed · Sep 14" / "Drop · Sep 14, 2026"
  setId           String?     @map("set_id")
  themeId         String?     @map("theme_id")
  packId          String?     @map("pack_id")       // shop: listing | full | accessory
  formats         String[]
  highRes         Boolean     @default(false) @map("high_res")
  creditsReserved Int         @default(0) @map("credits_reserved")
  costUsdMicros   Int         @default(0) @map("cost_usd_micros") // provider cost, 1e-6 USD
  createdAt       DateTime    @default(now()) @map("created_at")
  completedAt     DateTime?   @map("completed_at")

  workspace Workspace  @relation(fields: [workspaceId], references: [id])
  set       StudioSet? @relation(fields: [setId], references: [id])
  theme     Theme?     @relation(fields: [themeId], references: [id])
  items     BatchItem[]

  @@index([workspaceId, createdAt])
  @@map("batches")
}

model BatchItem {
  id              String     @id @default(cuid())
  batchId         String     @map("batch_id")
  productId       String?    @map("product_id")
  sceneId         String?    @map("scene_id")        // brand theme scene id
  shot            String?                            // shop shot id
  format          String                             // format id (config/formats.ts)
  prompt          String                             // snapshot of the composed prompt
  inputR2Keys     String[]   @map("input_r2_keys")   // ordered images sent to the model
  status          ItemStatus @default(queued)
  attempts        Int        @default(0)
  wavespeedTaskId String?    @map("wavespeed_task_id")
  r2Key           String?    @map("r2_key")
  errorMessage    String?    @map("error_message")
  freeRedosUsed   Int        @default(0) @map("free_redos_used")
  redoReason      String?    @map("redo_reason")
  favorite        Boolean    @default(false)
  rating          Int?                               // -1 | 1
  caption         String?
  submittedAt     DateTime?  @map("submitted_at")
  completedAt     DateTime?  @map("completed_at")
  createdAt       DateTime   @default(now()) @map("created_at")

  batch   Batch    @relation(fields: [batchId], references: [id], onDelete: Cascade)
  product Product? @relation(fields: [productId], references: [id])

  @@index([batchId])
  @@index([status, createdAt])
  @@index([wavespeedTaskId])
  @@map("batch_items")
}

model Subscription {
  id             String             @id @default(cuid())
  workspaceId    String             @map("workspace_id")
  planId         String             @map("plan_id")        // config/plans.ts
  termMonths     Int                @map("term_months")    // 1 | 3 | 6
  status         SubscriptionStatus @default(pending)
  startsAt       DateTime?          @map("starts_at")
  endsAt         DateTime?          @map("ends_at")
  nextGrantAt    DateTime?          @map("next_grant_at")
  grantsIssued   Int                @default(0) @map("grants_issued")
  paymentId      String?            @unique @map("payment_id")
  createdAt      DateTime           @default(now()) @map("created_at")

  workspace Workspace @relation(fields: [workspaceId], references: [id])

  @@index([workspaceId, status])
  @@index([nextGrantAt])
  @@map("subscriptions")
}

model CreditLedger {
  id           String       @id @default(cuid())
  workspaceId  String       @map("workspace_id")
  delta        Int                                   // + grant / refund, − reserve / charge / expiry
  reason       LedgerReason
  bucket       String                                // trial | plan | topup
  refType      String?      @map("ref_type")         // batch | item | subscription | payment | admin
  refId        String?      @map("ref_id")
  expiresAt    DateTime?    @map("expires_at")       // on grants only
  note         String?
  createdAt    DateTime     @default(now()) @map("created_at")

  workspace Workspace @relation(fields: [workspaceId], references: [id])

  @@index([workspaceId, createdAt])
  @@unique([reason, bucket, refType, refId])        // idempotency; a reserve may split across buckets (one row per bucket)
  @@map("credit_ledger")
}

model Payment {
  id              String         @id @default(cuid())
  userId          String         @map("user_id")
  workspaceId     String?        @map("workspace_id")
  bookingId       String?        @map("booking_id")   // consumer_booking
  purpose         PaymentPurpose
  itemId          String         @map("item_id")      // planId:termMonths | topupId | routeId
  amountUsdCents  Int?           @map("amount_usd_cents")
  amountVnd       Int            @map("amount_vnd")
  fxVndPerUsd     Int?           @map("fx_vnd_per_usd")
  reference       String         @unique              // "N5" + 8 chars, goes in transfer memo
  state           PaymentState   @default(pending)
  paidVnd         Int?           @map("paid_vnd")
  expiresAt       DateTime       @map("expires_at")
  paidAt          DateTime?      @map("paid_at")
  fulfilledAt     DateTime?      @map("fulfilled_at")
  createdAt       DateTime       @default(now()) @map("created_at")

  user      User       @relation(fields: [userId], references: [id])
  workspace Workspace? @relation(fields: [workspaceId], references: [id])

  @@index([userId, createdAt])
  @@map("payments")
}

model BankTransaction {
  id            String    @id @default(cuid())
  provider      String    @default("sepay")
  providerTxnId String    @map("provider_txn_id")
  amountVnd     Int       @map("amount_vnd")
  content       String
  reference     String?                              // extracted, normalised
  paymentId     String?   @map("payment_id")
  matchStatus   String    @map("match_status")       // matched | unmatched | underpaid | duplicate | ignored
  raw           Json
  receivedAt    DateTime  @default(now()) @map("received_at")

  @@unique([provider, providerTxnId])                // webhook idempotency
  @@index([matchStatus])
  @@map("bank_transactions")
}
```

Add back-relations on `User`: `workspaces Workspace[]`, `consents ConsentRecord[]`, `payments Payment[]`.

**Seeds** (`scripts/seed-business.ts`, add npm script `db:seed:business`): all `SetTemplate` rows
(12), all `Theme` rows (8, with `featuredMonth` for Oct 2026 → `just-listed`, Nov → `market-update`,
Dec → `holiday-greetings`, Jan → `new-year-goals`, Feb → `tet-greetings`), and the 6 Studio model
`IdentityReference` rows (`isStudioModel = true`). Seeds are idempotent upserts.

---

## 5. Credits ledger (`src/server/credits/ledger.ts`)

Pure functions over Prisma with a transaction client parameter so they compose.

```ts
export type CreditBucket = 'trial' | 'plan' | 'topup';
export type Balance = { total: number; byBucket: Record<CreditBucket, number>; nextExpiry: Date | null };

getBalance(workspaceId, now = new Date()): Promise<Balance>
grant(tx, { workspaceId, bucket, amount, reason, refType, refId, expiresAt }): Promise<void>   // idempotent via unique key
reserveForBatch(tx, { workspaceId, batchId, credits }): Promise<void>   // throws InsufficientCreditsError
refundItem(tx, { workspaceId, itemId, credits }): Promise<void>         // idempotent
chargeRedo(tx, { workspaceId, itemId }): Promise<void>
expireDue(tx, now): Promise<number>                                     // called by billing cron
```

**Balance algorithm:** sum grants not yet expired minus the portion consumed from them. Implement
consumption FIFO by expiry: when reserving, write the negative entry with `bucket` set to the
bucket it draws from (split into several negative rows if one bucket is not enough). A grant is
"expired" when `expiresAt <= now`; `expireDue` writes an `expiry` row for the unconsumed remainder
of each expired grant (compute remainder = grant − consumption rows referencing that bucket in
FIFO order). Keep the algorithm in one file with **vitest unit tests** covering: FIFO order,
insufficient credits, idempotent refund, expiry remainder, trial isolation (trial credits only
usable by `kind = trial` batches).

Concurrency: `reserveForBatch` runs inside `prisma.$transaction(…, { isolationLevel: 'Serializable' })`
and retries up to 3× on serialization failure.

---

## 6. Generation pipeline (P6)

### 6.1 Prompt composer

`src/server/generation/composer/blocks.ts` holds reusable text blocks; `brand.ts` and `shop.ts`
compose them. **All prompts are English.** Order matters (identity first, garment second).

```
IDENTITY  (always first)
  "Image 1 shows the person. Keep this exact person's face, facial structure, skin tone, hair
   colour and hairstyle unchanged and fully recognisable. Do not beautify or alter features."

GARMENT   (shop only; images 2..n are product photos)
  "Image 2 (and 3, 4 if present) show the product. The person must wear/hold this exact item:
   identical colour, pattern and print placement, fabric texture, neckline, sleeve length,
   hem length, buttons, zips, logos and fit. Do not add, remove or redesign any detail.
   Do not add other clothing items that hide the product."

SET       (from template config + set choices)
  "{location direction}. {lighting block}. {palette: brand colours as subtle accents}."

SCENE/SHOT
  brand → theme scene direction + pose energy + wardrobe
  shop  → shot definition (e.g. full_body_front: "full body, standing, facing camera, whole
          garment visible head to toe, neutral pose")

FORMAT    "Compose for a {ratio} {label} frame with safe margins; subject not cropped at joints."

QUALITY   "Photorealistic commercial photography, natural skin texture, true-to-life colour,
           sharp focus, no text, no watermark, no logos, no extra people facing camera."

GUARDRAILS (brand or shop list from 01-product-spec §2.4 / §3.4, phrased as "Do not include …")
```

Template `config` JSON shape:

```ts
type SetTemplateConfig = {
  locations: { id: string; label: string; direction: string }[];  // 3–4 variants per template
  lighting: string;
  defaults: { wardrobe?: string; poseEnergy?: string };
  shotOverrides?: Record<string, string>;                          // shop: per-shot tweaks
};
```

Images array order sent to WaveSpeed (`submitEdit` gains `imageUrls: string[]`):
- Brand: `[identity.face#1, identity.face#2?]` (max 2 faces to limit drift)
- Shop, model = me: `[face#1, full_body#1, product.front, product.detail?, product.back? (only for back shot)]`
- Shop, Studio model: `[model.face, model.full_body, product.front, product.detail?, product.back?]`

> Verify the max number of reference images accepted by `google/nano-banana-2/edit` in the
> WaveSpeed docs before finalising (cap in `config/business.ts` as `MAX_REFERENCE_IMAGES`).

### 6.2 Lifecycle

```
POST /api/app/batches
  → validate draft → estimate credits → $transaction { create Batch + BatchItems(queued, prompt snapshot,
    inputR2Keys) ; reserveForBatch }
  → after(() => pump({ batchId }))
  → 201 { batch }

pump({ batchId?, limit })                      src/server/generation/pump.ts
  concurrency = GENERATION_MAX_CONCURRENT (default 6) − count(items where status in submitting|generating)
  claim items (prisma.$queryRaw — Prisma has no SKIP LOCKED API):
    UPDATE batch_items SET status='submitting' WHERE id IN (
      SELECT id FROM batch_items WHERE status='queued' [AND batch_id=$1]
      ORDER BY <priority>, created_at LIMIT $n FOR UPDATE SKIP LOCKED) RETURNING id
  for each: ensure WaveSpeed URLs for inputs (reuse cached wavespeedUrl < 24h, else upload & cache)
            → submitEdit({ imageUrls, prompt, aspectRatio, resolution })
            → status='generating', wavespeedTaskId, submittedAt, attempts+1

poll({ batchId?, limit })                      src/server/generation/poll.ts
  for items status='generating': pollTask(taskId)
    completed → finalize(item, url)
    failed/timeout → attempts < 2 ? status='queued' (auto-retry) : status='failed' + refundItem
    still running > 5 min → treat as failed attempt

finalize(item, url)                            src/server/generation/finalize.ts
  download → labeling.ts (embed AI XMP; visible tag if workspace.visibleAiTag) → JPEG q90
  → R2 put `ws/{workspaceId}/batches/{batchId}/{itemId}.jpg` → status='ready', completedAt
  → add provider cost to batch.costUsdMicros → recompute batch status

Triggers (all three):
  1. after() in POST /api/app/batches and in redo
  2. GET /api/app/batches/[id] runs pump+poll for that batch, bounded to ~8 s
     (client polls every 4 s via useBatchPolling while status is queued|generating)
  3. Vercel cron GET /api/cron/generations (every minute on Pro; else every 5 min) — global pump+poll
```

Priority: `*_pro` plans first, then trial, then others; FIFO within a tier.

If WaveSpeed supports completion webhooks (check docs), add `POST /api/webhooks/wavespeed`
that calls `finalize` — polling stays as the fallback.

### 6.3 AI labeling (`labeling.ts`)

- Embed XMP with IPTC `Iptc4xmpExt:DigitalSourceType =
  http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia`, `dc:creator = "Next5"`,
  `xmp:CreatorTool = "Next5 Studio"`, `dc:description = "AI-generated image"`.
  Use `sharp(...).withXmp(xmp)` if the installed sharp version exposes it; otherwise add
  `exiftool-vendored` (server-side) — decide in P6 after checking `node_modules/sharp/lib/index.d.ts`.
- Visible tag: 11 px "AI" pill, bottom-right, 16 px inset, 70% white on 35% black, rendered by
  compositing an SVG with sharp.
- Unit test: output JPEG contains the DigitalSourceType string.

### 6.4 Redo

`POST …/items/[itemId]/redo { reason }` → if `freeRedosUsed < 2` increment, else `chargeRedo`
(fails with 402 if no credits) → reset item to `queued` → `after(pump)`. v1 keeps no history:
the previous image stays visible and downloadable until the new one is ready, then the old R2
object is deleted and `r2Key` is replaced.

### 6.5 Zip

`GET /api/app/batches/[id]/zip` builds the zip **server-side** with `jszip`, streams it, names files
per 01-product-spec §3.3 (brand: `{theme}_{scene}_{format}_{n}.jpg`). Limit 200 files per zip.

---

## 7. Payments (P2)

### 7.1 Provider: SePay (VietQR bank transfer)

> Verify every field below against the current SePay docs (docs.sepay.vn) before coding.

- **QR image:** `https://qr.sepay.vn/img?acc={SEPAY_ACCOUNT_NUMBER}&bank={SEPAY_BANK_CODE}&amount={amountVnd}&des={reference}`
- **Webhook:** SePay POSTs each incoming bank transaction to `/api/webhooks/sepay` with header
  `Authorization: Apikey {SEPAY_WEBHOOK_API_KEY}`. Payload fields used: `id`, `transferType`
  (`in`), `transferAmount`, `content`, `code` (if payment-code detection is configured with prefix
  `N5`), `transactionDate`, `referenceCode`. Respond `200 { "success": true }`.

### 7.2 Reference

`"N5" + 8 chars` from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no 0/O/1/I). Unique index on `Payment.reference`.

### 7.3 Webhook handling (`src/server/payments/sepay.ts` + `fulfill.ts`)

1. Check API key (constant-time compare) → 401 if wrong.
2. Upsert `BankTransaction` by `(provider, providerTxnId)`; if it already existed → return success (idempotent).
3. Ignore `transferType !== 'in'` (`matchStatus = ignored`).
4. Normalise `code || content`: uppercase, strip spaces/dots/dashes → regex `/N5[A-HJ-NP-Z2-9]{8}/`.
5. No match → `unmatched` (admin queue). Match → load `Payment`:
   - `paidVnd >= amountVnd` → `state = paid`, `paidAt`, then `fulfill(payment)` in a transaction.
   - `paidVnd < amountVnd` → `underpaid` (admin queue; email user "we received X, Y missing").
   - Payment already `paid` → `duplicate` (admin queue for refund).
   - Payment `expired` but within 72 h → still `paid` + fulfil (late transfer).
6. `fulfill(payment)` (idempotent via `fulfilledAt`):
   - `subscription` → activate (see §8), first `plan` grant.
   - `topup` → `grant(bucket = topup, expiresAt = +12 months)`.
   - `consumer_booking` → set `Booking.paymentStatus = paid` and trigger the existing post-payment
     generation + email path (moved from `/api/orders` to the server).
7. Send receipt email.

### 7.4 Client

`POST /api/app/payments` → `CheckoutSheet` shows QR + bank fields + VND amount + reference +
30-min countdown → `usePaymentStatus(paymentId)` polls `GET /api/app/payments/[id]` every 3 s
(stops on paid / expired / unmount) → success state → refresh `/api/app/me`.

**Mock mode:** when `NEXT5_MOCK_PAYMENTS=true`, the sheet shows a "Simulate transfer" button that
calls `POST /api/dev/simulate-sepay` (route returns 404 unless the flag is set) which feeds a fake
payload through the real webhook handler — same code path as production.

### 7.5 Fix for the consumer flow (`/photos`)

Today `useBookingFlow.setPaymentStatus('confirmed')` (client) posts to `/api/orders`, which marks
the booking paid — **anyone can skip payment**. In P2: `PaymentStep` creates a server `Payment`
(purpose `consumer_booking`, VND as today), polls its status, and `/api/orders` no longer changes
payment state (it only saves name/goals). The mock Sepay service in `src/services/payment.ts` is
replaced by the real API + `NEXT5_MOCK_PAYMENTS`.

---

## 8. Subscriptions (`src/server/subscriptions/subscriptions.ts`)

- `createPendingSubscription(workspaceId, planId, termMonths)` → row `pending` + `Payment`.
- `activate(sub, paidAt)`:
  - If the workspace has an **active** subscription of the same product → new one starts at its `endsAt`
    (queued renewal); else starts now.
  - `endsAt = startsAt + termMonths`; `nextGrantAt = startsAt`; call `issueDueGrants`.
- `issueDueGrants(now)` (billing cron + on activation): for subs `active` with `nextGrantAt <= now`
  and `grantsIssued < termMonths` → `grant(bucket=plan, amount=plan.monthlyCredits,
  refType='subscription', refId='{subId}:{grantsIssued}', expiresAt = nextGrantAt + 1 month)`,
  `grantsIssued++`, `nextGrantAt += 1 month`.
- `expireEnded(now)`: `active` with `endsAt <= now` → `expired`.
- **Upgrade mid-term (v1 rule):** not prorated. Starter → Pro purchase starts immediately; remaining
  Starter grants are cancelled (`status = cancelled`), unconsumed current-month plan credits are
  kept until their expiry. Show this rule in the checkout sheet.

---

## 9. Auth & session

- Reuse `src/lib/studio-auth.ts` (magic link, 30-day session JWT, `studio_token` in localStorage).
- New `src/server/auth/session.ts`: `requireSession(req): { userId, email }` → throws `HttpError(401)`.
- New `src/server/workspaces/workspaces.ts`: `requireWorkspace(userId, product?)`.
- Onboarding step 1 creates the user + sends a magic link **and** issues a session immediately
  (same pattern as `/api/orders` today) so the wizard continues without leaving the page; the email
  link is for returning later.

---

## 10. Environment variables (add to `.env.production.example`)

```bash
# Feature flag — business routes (/brand /shop /pricing /start /app) 404 when false
NEXT5_BUSINESS_ENABLED=false

# FX & pricing
VND_PER_USD=26000

# SePay (P2)
SEPAY_WEBHOOK_API_KEY=
SEPAY_BANK_CODE=            # e.g. MBBank / VCB code accepted by qr.sepay.vn
SEPAY_ACCOUNT_NUMBER=
SEPAY_ACCOUNT_NAME=
NEXT5_MOCK_PAYMENTS=false   # local only

# Generation (P6)
GENERATION_MAX_CONCURRENT=6

# Cron (P6/P9)
CRON_SECRET=
```

`vercel.json` additions (P6/P9):

```json
"crons": [
  { "path": "/api/cron/generations", "schedule": "* * * * *" },
  { "path": "/api/cron/billing-daily", "schedule": "0 1 * * *" }
],
"functions": {
  "app/api/cron/generations/route.ts": { "maxDuration": 60 },
  "app/api/app/batches/[batchId]/route.ts": { "maxDuration": 30 },
  "app/api/app/batches/[batchId]/zip/route.ts": { "maxDuration": 60 }
}
```

(If the Vercel plan doesn't allow per-minute cron, use `*/5 * * * *` — client-side polling keeps
active batches fast.)

---

## 11. Security checklist (applies to every phase)

- Ownership check on every `/api/app/**` read/write (workspace belongs to session user).
- Upload validation: JPEG/PNG/WebP/HEIC only, ≤ 12 MB, re-encode with sharp (strips EXIF GPS) before R2.
- Presigned R2 URLs with ≤ 24 h TTL; R2 keys never guessable from user input.
- Rate limits (P11): trial creation per IP (3/day), payment creation per user (10/hour), identity uploads (20/day).
- Webhook: API-key check, idempotency, never trust amounts from the client.
- Cron routes: `Authorization: Bearer ${CRON_SECRET}`.
- Remove client-side payment confirmation (P2).
- No PII in logs beyond user id; the existing `console.log` of emails in `/api/preview` is trimmed in P11.

---

## 12. Analytics events (P9 — `src/lib/analytics.ts`, provider TBD, no-op by default)

`landing_viewed{page}` · `cta_clicked{page,cta}` · `onboarding_step_completed{product,step}` ·
`trial_generated{product}` · `checkout_opened{product,planId,termMonths}` · `payment_paid{purpose,amountUsdCents}` ·
`batch_created{product,kind,items,credits}` · `batch_completed{product,readyItems,failedItems,durationSec}` ·
`item_redo{reason}` · `item_downloaded{format}` · `zip_downloaded{items}` · `topup_purchased{packId}` ·
`renewal_reminder_clicked{daysLeft}`.
