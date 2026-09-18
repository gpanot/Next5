# 01 — Product Spec

Read [README.md](README.md) first for the decisions (D1–D6).

---

## 1. Shared concepts (both products)

| Term (UI) | Code name | Definition |
|---|---|---|
| **Identity** | `IdentityReference` | 1–3 photos of the person who appears in the images. Brand: always the customer. Shop: the customer ("Me") **or** a Next5 **Studio model**. Saved once, reused forever, deletable anytime. |
| **Set** (Brand) / **Shop look** (Shop) | `StudioSet` | The customer's owned, consistent visual look: location(s), light, wardrobe direction, palette, pose style. Built from a **template**, then customised. Every batch uses one set, so the feed stays consistent. |
| **Theme** (Brand only) | `Theme` | A monthly content idea ("Showing a Home", "Market Update") with 6–8 scene directions. A new featured theme drops on the 1st of every month. |
| **Product** (Shop only) | `Product` | One item for sale, with 1–3 reference photos (front required; back, detail optional) and metadata. |
| **Batch** | `Batch` | One generation request: e.g. "Just Listed × 16 images × 4:5 + 9:16", or "12 products × Listing pack". Made of **items** (one image each). |
| **Credit** | `CreditLedger` | 1 credit = 1 image at standard resolution (1K). High-res (2K) = 2 credits. |
| **Plan** | `Subscription` | Prepaid 1, 3 or 6 months. Grants a monthly credit allowance on each monthly cycle date. |
| **Top-up** | `Payment` purpose `topup` | One-off credit pack, valid 12 months. |
| **Free trial** | `Batch` kind `trial` | 3 free images after onboarding. No payment details needed. |

### Formats (both products)

| Format id | Ratio | Label in UI | Used for |
|---|---|---|---|
| `portrait_4_5` | 4:5 | Instagram feed | IG / FB feed posts |
| `story_9_16` | 9:16 | Stories & TikTok | IG Stories, Reels covers, TikTok |
| `square_1_1` | 1:1 | Listing / square | Shopee, TikTok Shop main image, LinkedIn |
| `portrait_3_4` | 3:4 | Classic portrait | Website, Zalo, print |

Each format is **generated natively at that ratio** (not cropped). Each format × image counts as one item (one credit).

---

## 2. Next5 Brand (Brand Studio)

### 2.1 ICP (launch: Vietnam, English UI)

- **Primary:** real estate agents and brokers (môi giới), property consultants for developers.
- **Secondary:** coaches & consultants, beauty & wellness owners (spa, lash, nails, esthetics),
  fitness trainers, insurance & finance advisors.
- **Profile:** 25–55, posts 3–5×/week on Facebook / Instagram / LinkedIn / Zalo, has paid a
  photographer before, recycles the same photos, uncomfortable writing AI prompts.
- **Job to be done:** "Look professional and current in every post without booking a shoot every month."

### 2.2 Value proposition

> **A month of on-brand photos of you. Without the photoshoot.**
> Upload three selfies once. Pick your set. Every month, get a fresh drop of professional
> photos for your posts, listings and profile — directed for you, in your look.

### 2.3 Features (v1)

1. **Identity:** 3 selfies (front, slight left, slight right), guided capture tips, quality check.
2. **Sets:** up to 2 (Starter) / 5 (Pro). Built from templates:

   | Template id | Name | Look |
   |---|---|---|
   | `modern-office` | Modern Office | Glass, light wood, soft daylight, city view blur |
   | `listing-interior` | Luxury Listing | Bright staged living room / kitchen, architectural lines |
   | `neighborhood-cafe` | Neighborhood Café | Warm café, laptop, coffee, window light |
   | `studio-backdrop` | Studio Backdrop | Seamless warm-grey backdrop, clean key light — headshot classic |
   | `urban-outdoor` | Urban Outdoor | Modern street, glass façades, golden hour |
   | `home-office` | Home Office | Bookshelves, plants, calm natural light |

   Customisation per set: pick 1–3 locations from the template's variants, wardrobe
   (`business_formal` · `smart_casual` · `brand_color_accent`), brand colours (up to 2 hex),
   pose energy (`warm_approachable` · `confident_expert` · `dynamic_candid`).
3. **Themes:** one **featured theme per month** + a library. v1 seed list:

   | Theme id | Title | Scenes (6–8 directions) |
   |---|---|---|
   | `just-listed` | Showing a Home | Arms-open at doorway, reviewing plans at kitchen island, walking through bright hallway, keys-in-hand close-up (no house numbers), balcony view, candid laugh on sofa |
   | `market-update` | Market Update | Pointing at a blank screen/whiteboard, desk with laptop and notes, talking-to-camera half body, thoughtful look out window, walking with tablet, confident arms-crossed |
   | `client-meeting` | Client Meeting | Handshake (other person's face out of frame/blurred), explaining at table, listening with notebook, welcoming at door, coffee chat, signing-ready pen close-up |
   | `behind-the-scenes` | Behind the Scenes | Phone call walking, car door (no brand logos), prepping documents, coffee on the go, laughing candid, end-of-day desk |
   | `new-year-goals` | New Year, New Goals | Planner and pen, sunrise window, confident portrait, workspace reset, toast-ready smile (no alcohol label), calendar wall |
   | `holiday-greetings` | Holiday Greetings | Warm festive living room, gift wrap (plain), cosy knit portrait, window lights bokeh, table setting, wave-to-camera |
   | `tet-greetings` | Lunar New Year Greetings | Modern áo dài or elegant red outfit, apricot/peach blossom interior, red envelope (plain), tea table, family-home entrance, warm portrait |
   | `open-house` | Open House Weekend | Welcoming at entrance, staging a vase, guided tour gesture, garden/terrace, checklist on clipboard, relaxed portrait on steps |

4. **Batch creation:** choose set → theme → image count (8 / 16 / 24 / 32) → formats
   (multi-select) → optional **High-res** (2 credits each, Pro only) → credit summary → Generate.
5. **Results:** grid with format tabs, favourite, thumbs up/down, **Regenerate** with reason,
   download single / selected / all (zip), copy suggested caption (Pro).
6. **Captions (Pro):** 1 English caption per image from theme + industry + tone; editable,
   copy button. Uses GPT-4o-mini (existing `OPENAI_API_KEY`).
7. **Library:** all images, filter by set / theme / format / favourites, bulk download.

### 2.4 Brand content guardrails (enforced in prompts + admin QA)

Never generate: awards, trophies, certificates, diplomas, "SOLD" signs, price tags, house
numbers, company logos or brand names, other identifiable people's faces (other people are
out of frame, back-turned or blurred), luxury cars with visible badges, alcohol labels,
children, medical before/after, uniforms of real companies.

---

## 3. Next5 Shop (Shop Studio)

### 3.1 ICP (launch: Vietnam, English UI)

- **Primary:** solo or 2–3 person clothing & accessories shops selling on TikTok Shop,
  Instagram, Facebook, Shopee — often the owner models the clothes herself.
- **Profile:** 20–40, 30–300 SKUs, restocks weekly, posts daily, currently pays a model per
  set or shoots mirror photos at night, or reuses supplier photos that every competitor also uses.
- **Job to be done:** "Every new item looks great on a person, in my shop's look, the same day it arrives."

### 3.2 Value proposition

> **New stock this morning. On-model photos by lunch.**
> Upload a flat-lay or hanger photo. Get it worn — by you or a Studio model — in your shop's
> signature look, sized for TikTok Shop, Shopee and Instagram.

### 3.3 Features (v1)

1. **Model:** `me` (2 selfies + 1 full-body photo) or a **Studio model** (6 house models,
   Starter = pick 1, Pro = all 6). House models are Next5-owned synthetic identities.
2. **Shop looks** (sets): up to 2 (Starter) / 5 (Pro). Templates:

   | Template id | Name | Look |
   |---|---|---|
   | `clean-white` | Clean Studio | Pure light-grey/white seamless, even soft light — marketplace listing standard |
   | `beige-wall` | Soft Beige Wall | Warm plaster wall, soft window shadows — the Instagram boutique look |
   | `cafe-lifestyle` | Café Lifestyle | Bright café, natural light, relaxed candid |
   | `street-urban` | Street | Clean modern street, concrete & glass, daylight |
   | `boutique-rack` | Boutique | Minimal boutique interior, clothing rail blurred behind |
   | `resort` | Resort | Pool terrace / beach walkway, bright sun, summer wear |

3. **Products:** add one or bulk-add up to 20. Fields: name (required), category (required:
   `top` · `dress` · `skirt` · `pants` · `set` · `outerwear` · `swim` · `bag` · `shoes` · `jewelry` ·
   `accessory`), colour name, SKU (optional), fit note (`fitted` · `regular` · `oversized`),
   notes (free text, 120 chars). Photos: front (required), back, detail.
4. **Shot packs:**

   | Pack id | Shots per product | Shots |
   |---|---|---|
   | `listing` | 3 | `full_body_front`, `half_body`, `detail_closeup` |
   | `full` | 5 | listing pack + `walking_motion`, `back_or_side` (back only if a back photo exists) |
   | `accessory` | 3 (auto for bag/shoes/jewelry/accessory) | `worn_half_body`, `detail_closeup`, `lifestyle_in_hand_or_on_foot` |

5. **Batch creation:** choose products (checkbox grid) → model → shop look → pack →
   formats → credit summary → Generate. Batch auto-named "Drop · 14 Sep 2026".
6. **Results — Compare view (key screen):** for each product, the original product photo is
   pinned on the left and the generated shots on the right. Actions per image: favourite,
   **"Doesn't match product"** (free redo, logged for QA), **"Doesn't look like me/model"** (free
   redo), download. Per product: download zip. Batch: download all.
7. **File naming:** `{sku|product-slug}_{shot}_{format}.jpg` e.g. `LINEN-SET-03_full_body_front_1x1.jpg`.
8. **AI label:** every file embeds the AI label metadata (see architecture). Toggle
   "Add visible AI tag" (small corner mark) — default **on** for Shop, **off** for Brand.
9. **Seller education (inline):** a short "Posting on TikTok Shop" note: use AIGC label, images
   must match the real product, keep real customer feedback photos real.

### 3.4 Shop content guardrails

Never: alter the garment (colour, print, length, neckline, logo), add accessories not in the
product photos, sexualised poses, lingerie/swim on minors-looking models (Studio models are all
clearly adult, 22+), brand logos not present on the product, text overlays.

---

## 4. Plans, credits & pricing

All prices are **configuration** in `src/config/plans.ts` — values below are launch defaults.

### 4.1 Plans (USD shown; charged in VND at `VND_PER_USD`, rounded up to the nearest 1,000₫)

| Plan id | Product | Price / month | Credits / month | Sets / looks | Extras |
|---|---|---|---|---|---|
| `brand_starter` | Brand | **$19** | 30 | 2 | All themes, all formats |
| `brand_pro` | Brand | **$49** | 90 | 5 | + High-res (2K), captions, early access to themes |
| `shop_starter` | Shop | **$15** | 50 | 2 | 1 Studio model or Me, all formats |
| `shop_pro` | Shop | **$39** | 150 | 5 | + All 6 Studio models, High-res (2K), priority queue |

### 4.2 Prepaid terms

| Term | Price | Label |
|---|---|---|
| 1 month | 100% | — |
| 3 months | 90% of 3× monthly | "Save 10%" |
| 6 months | 80% of 6× monthly | "Save 20%" — marked *Best value* |

Credits are **granted monthly** on the cycle date (not all up front).

### 4.3 Top-ups (any active or expired account)

| Pack id | Credits | Price | Validity |
|---|---|---|---|
| `topup_20` | 20 | $6 | 12 months |
| `topup_60` | 60 | $15 | 12 months |
| `topup_150` | 150 | $32 | 12 months |

### 4.4 Credit rules

1. **Spend order:** plan credits (soonest-expiring first) → top-up credits (soonest-expiring first).
2. **Plan credits do not roll over** — unused credits expire at the end of each monthly cycle.
3. **Reserve → commit → refund:** creating a batch reserves the credits; each successful item
   commits one; failed items are refunded automatically.
4. **Free redo:** each item can be redone **2 times free** with a reason (`not_like_me`,
   `product_mismatch`, `bad_quality`, `other`). A 3rd redo costs 1 credit.
5. **Trial:** 3 free credits, once per email and once per browser (reuse the existing
   `checkBrowserPreviewAllowed` idea), usable only for the trial batch.
6. **Expired plan:** the account keeps its library (downloads allowed) for 90 days; creating
   batches needs an active plan **or** top-up credits.

### 4.5 FX display rules

- Everywhere in the business product: **USD only** (`$19/mo`, `$0.63 per photo`).
- **Checkout only:** show "You'll transfer **494,000₫** (≈ $19.00 at 26,000₫/$)". Rate and
  rounding come from config; the exact VND amount is frozen on the `Payment` row.
- `/photos` (consumer) stays in VND — unchanged.

### 4.6 Cost guardrail (for pricing sanity, not shown to users)

WaveSpeed Nano Banana 2 Edit: $0.07 per 1K image, $0.105 per 2K (see `src/lib/wavespeed.ts`).
Budget 30% redo overhead → ~$0.09 per delivered 1K credit. Starter plans keep ≥ 70% gross
margin before payment fees; revisit if average redo rate > 30% (tracked in P10 metrics).

---

## 5. Policies (surface in FAQ + legal pages)

| Policy | Rule |
|---|---|
| **Likeness guarantee** | If a photo doesn't look like you, redo it free (2× per photo). |
| **Product accuracy promise** (Shop) | If a garment doesn't match your product photo, redo it free (2× per photo). |
| **Refunds** | Credits are refunded automatically for failed generations. Cash refunds only for payment errors (wrong amount, duplicate transfer) — handled by admin. |
| **Data** | Identity photos: kept until you delete them (Settings → Privacy). Product photos: 12 months after last use. Generated images: while the account is active + 90 days after the plan ends. |
| **Consent** | Only upload photos of yourself (or people who gave written consent for Brand team use in later versions). Studio models are synthetic. |
| **AI transparency** | Every image carries an embedded AI-generated label; a visible tag is available. Customers are responsible for platform labelling rules (TikTok AIGC, Meta "AI info"). |

---

## 6. Voice & key copy (US English)

**Voice:** confident, plain, specific, warm. Short sentences. Numbers over adjectives.
No "revolutionary", no "AI-powered magic". Say *photos*, not *generations*; *set* not *preset*.

| Surface | Copy |
|---|---|
| Home H1 | **Photos of you that work as hard as you do.** |
| Home sub | On-brand photos for professionals and on-model photos for online shops — every month, without a photoshoot. |
| Home cards | **For professionals** — "A month of on-brand photos of you." · **For online shops** — "Every new product, worn and ready to post." |
| Home tertiary link | "Looking for a personal photoshoot? → Next5 Photos" |
| Brand H1 | **A month of on-brand photos of you. Without the photoshoot.** |
| Brand sub | Upload three selfies once. Pick your set. Get a fresh drop of professional photos every month — for listings, posts and your profile. |
| Brand primary CTA | Start free — get 3 photos |
| Shop H1 | **New stock this morning. On-model photos by lunch.** |
| Shop sub | Upload a flat-lay or hanger photo. Get it worn by you or a Studio model, in your shop's look, sized for TikTok Shop, Shopee and Instagram. |
| Shop primary CTA | Try it free with one product |
| Pricing H1 | **Simple plans. Prepaid. No surprises.** |
| Pricing sub | Pay by bank transfer for 1, 3 or 6 months. Top up anytime. Unused photos never auto-charge you — because nothing auto-charges. |
| Trial done | "Your first 3 photos are ready. Like them? Pick a plan to keep going." |
| Low credits banner | "You have 6 photos left this month. Top up or upgrade to keep creating." |
| Renewal banner | "Your plan ends on Oct 14. Renew now to keep your monthly photos." |
| Empty library | "No photos yet. Create your first batch — it takes about 5 minutes." |

Date format: `Sep 14, 2026`. Currency: `$19`, `$19.00` at checkout. Numbers: `1,200`.

---

## 7. Success metrics (v1)

| Metric | Target (first 60 days) |
|---|---|
| Visitor → trial started | ≥ 8% |
| Trial → paid | ≥ 20% |
| Paid → renewal at end of first prepaid term | ≥ 50% |
| Avg redo rate per item | ≤ 25% |
| Shop "product mismatch" rate | ≤ 10% of items |
| Payment matched automatically (no admin action) | ≥ 95% |
