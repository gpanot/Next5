# Next5: Product Brief

**Date:** 2026-09-18
**Purpose:** A single, self-contained description of Next5 (what it is, who it is for, what it does, how it makes money, and what it is trying to achieve), written as input for further analysis by an LLM.
**Source:** The `next5-landing` codebase (Next.js 16) and its planning docs in `docs/business-studios/`, as of the date above. Where the docs and the owner's latest decisions disagree, this brief follows the owner and flags the conflict (see §11).

---

## 1. One-paragraph summary

Next5 is an AI photo and content service for small businesses whose sales depend on social media. It has two paid products that share one engine. **Next5 Brand** gives solo professionals (mainly realtors, and also coaches, beauty and wellness pros, and advisors) a fresh month of on-brand photos *of themselves*. Each photo comes with a caption and hashtags, a quality score, and a posting calendar. **Next5 Shop** gives TikTok Shop clothing sellers on-model photos of *their real products* in a consistent shop look, packaged in TikTok's upload order, and it imports the catalog straight from the store link. Both products sell monthly prepaid plans measured in photo credits. Positioning is deliberate: Next5 sells a **selling system** (consistency, batch volume, ready-to-post copy, a plan, a score, platform compliance), not an "image generator". The goal is to beat the buyer's objection: "I can do this myself with ChatGPT."

A third, older product, **Next5 Photos** (a consumer "5 Instagram photos" shoot), still runs at `/photos` but is no longer the focus.

---

## 2. Market and target customers

**Market:** United States. The owner stated this on 2026-09-16. Some planning docs still say "Vietnam launch, US-ready". That is outdated (see §11).

**Buyer profile:** mostly women, running a business alone or with a very small team, posting from a phone between clients. About 90% of users are on mobile. They are not comfortable writing AI prompts. They have paid a photographer before and recycle the same few photos.

| Product | Primary ICP | Secondary ICP | Job to be done |
|---|---|---|---|
| **Brand** | US real estate agents | Coaches and consultants, beauty and wellness owners (spa, lash, nails), fitness trainers, insurance and finance advisors | "Look professional and current in every post without booking a shoot every month, and don't make me decide what to post." |
| **Shop** | US TikTok Shop apparel sellers with 100 to 500 SKUs (the "missing middle") | Instagram and Facebook boutiques; agencies that run many shops | "Every new item looks great on a person, in my shop's look, listing-ready, the week it arrives." |

**Why these segments:**
- **Realtors:** a person's face *is* the business, they post often, and listings create a steady supply of timely content.
- **TikTok Shop sellers:** new stock arrives every week, phone photos stop scaling, and a studio is not yet worth the cost. Research the owner shared marks this as the wedge. **Shop gets priority over Brand.**

---

## 3. Positioning and the core objection

**The objection:** "I can make this with ChatGPT." If the buyer believes this, perceived value collapses. Every marketing page answers it with a side-by-side table. The concrete differentiators:

| Topic | ChatGPT alone | Next5 |
|---|---|---|
| Identity | Face or product drifts from photo to photo | Same face (Brand) or the real product, unchanged (Shop), every time, with free redos when it drifts |
| Volume | One prompt, one photo, one fix at a time | Whole batch in every social size in one click |
| Copy | You still write the post | Post Kit: hook, caption, hashtags (and a product description on Shop) per photo |
| Planning | You decide what and when, every time | Brand: posting calendar filled for you. Shop: weekly drops pick the products for you |
| Trends | You guess | New trend themes each month, per industry |
| Will it work? | Unknown | Scroll-Stop Score (0 to 100) and one tip per photo |
| Consistency | New look each time | Owned "Set" or "Shop look": same place, light, colors, models |
| Shop ops | Manual sorting and renaming | Store import by link; listing packs in TikTok upload order with a 9:16 cover |
| Compliance | No AI label | AI label embedded in every file; visible tag option; real-estate rules built in |

**Marketing voice rules** (owner's standing instructions):
- Copy reads at about a 3rd-grade level. Short sentences. Numbers over adjectives. No "revolutionary" or "AI magic".
- Offers follow the Alex Hormozi "offer so good you can't refuse" style: value stack, measurable promises, pricing anchored to outcomes (Growth tier as the anchor), not to photographer cost.
- Claims must be ones the customer can measure herself. Use "built to…" wording until real data exists. No sales-lift percentages.
- Testimonials render in production only when verified. The current ones are placeholders, hidden in production.
- Show platform logos. Put a visual in the first mobile screen.

**Key headlines in code today:**
- Home: "Your photos and posts for the month. Ready in minutes."
- Brand: "Your month of posts, done in 10 minutes." CTA: "Start free: get 3 photos".
- Shop: "Your new drops, photographed every week." CTA: "Paste my shop link: 3 free photos".

---

## 4. Shared concepts (both products)

| Term | Meaning |
|---|---|
| **Workspace / Studio** | One account can own a Brand studio and a Shop studio. Each has its own navigation, plan and credits. There is one login and a studio switcher. Solo accounts only in v1. The data model is ready for teams later. |
| **Identity** | 1 to 3 reference photos of the person who appears in the images. Brand: always the customer. Shop: the customer ("Me") or a Next5 **Studio model**. Saved once and reused. The customer can delete it at any time. Explicit consent is recorded. |
| **Set** (Brand) / **Shop look** (Shop) | The customer's owned, consistent visual style: locations, light, wardrobe, brand colors, pose energy. Built from a template, then customized. |
| **Batch** | One generation request, made of **items** (one image each). |
| **Credit** | 1 credit = 1 image at 1K resolution. 2K = 2 credits. |
| **Formats** | 4:5 (feed), 9:16 (Stories, Reels, TikTok), 1:1 (listing / marketplace), 3:4 (portrait). Each format is generated natively at that ratio, not cropped. |
| **Free redo** | Each photo can be redone twice for free with a reason ("doesn't look like me", "doesn't match product", "bad quality", "other"). A 3rd redo costs 1 credit. |
| **Free trial** | 3 free photos after onboarding. No payment needed. |
| **Post Kit** | Per-photo hook, caption, 6 to 10 hashtags, and a product description on Shop. Made by gpt-4o-mini, which looks at the photo. Cached on the photo and cleared on redo. Included in Growth and higher, and on trial photos as a taste. |
| **Scroll-Stop Score** | 0 to 100 from six weighted checks: stops the scroll, clear subject, works small, light, looks current, looks real. Adds one tip and a "best for" tag (feed, story, listing, profile, ad). Scored automatically after every photo is made. |
| **AI labelling** | Every output file carries an embedded AI-generated label (XMP/IPTC metadata). An optional visible corner tag is on by default for Shop and off by default for Brand. For real estate, the visible tag is a per-property toggle. |

---

## 5. Next5 Brand: features

### 5.1 Onboarding
Account, then consent, then 3 selfies (front, slight left, slight right) with a quality check, then pick a Set template, then free trial of 3 photos, then plan choice.

### 5.2 Sets (templates)
Modern Office, Luxury Listing, Neighborhood Café, Studio Backdrop, Urban Outdoor, Home Office. Customization options:
- 1 to 3 locations
- Wardrobe: business formal, smart casual, or brand-color accent
- Up to 2 brand colors
- Pose energy: warm and approachable, confident expert, or dynamic candid

### 5.3 Themes
Monthly content ideas, each with 6 to 8 scene directions. A new featured theme arrives on the 1st of every month. Seed list: Showing a Home, Market Update, Client Meeting, Behind the Scenes, New Year Goals, Holiday Greetings, Lunar New Year, Open House Weekend.

### 5.4 Create flow: "Who is it for?"
- **Just me:** choose Set, then Theme, then image count, then formats, then Generate. Stock settings are allowed because the subject is plainly the person.
- **A property (listing mode):** see §5.5.

### 5.5 Listing mode for real estate: "we never invent a room"
Trigger: an early version took one exterior photo and produced 7 invented interiors. For a realtor, that reads as a tour of *that house* and can break real-estate law. The rules now enforced in code and tests:
- **Every listing photo is made from one of her real property photos.** There is no stock-location fallback. Output count = photos kept × looks per photo (1 to 3) × formats.
- **Properties:** the agent creates a property by uploading photos, or by pasting a **Zillow link**. The import pulls up to 60 gallery photos plus facts: status, price, beds, baths, square feet. She then removes photos she does not want. Import uses an Apify scraper and costs no credits. Limit: 20 imports per day.
- The agent must tick **"I represent this property"** (self-declared attestation).
- **"What's happening?"** replaces Theme for property batches: Coming soon, Just listed, For sale, Open house, Under contract, or Just sold. Next5 preselects the occasion only when Zillow's status says it. For uploaded homes, the agent always picks.
- **"Your style"** replaces Set: outfit and pose energy only. Brand colors go on her outfit, never on the room.
- Prompts place her in the photographed room with room-specific poses (from an automatic room tag). They never redecorate, open doors, or add props other than plain keys.
- Post Kit may use listing facts (price, beds, baths, square feet) but must never describe rooms or finishes that are not visible in the photo.
- Compliance context: NAR Code of Ethics Article 12, California AB 723 (in force since 2026-01-01), Wisconsin Act 69 (from 2027), and MLS rules on altered images. The original photo is kept in storage so it can be provided, which AB 723 requires. A download button for it is not built yet.

### 5.6 Calendar (Brand only)
The problem it solves: the site sells "a month of posts", but the app used to deliver "a pile of photos".
- **Posting cadence:** the agent picks her posting days (for example Tue/Thu/Sat). Photos fill dated slots automatically. The highest score goes first. Feed photos go on cadence days, and story photos take extra slots. Profile-type photos are never scheduled. The same scene never appears twice in a row.
- **Autopilot:** after her first manual batch, Next5 generates new photos on its own to stay about 14 days ahead. It uses monthly credits, which expire anyway. If she stops posting, autopilot pauses, and that pause is the churn signal.
- **Post sheet:** save photo, copy caption, copy hashtags, and a deep link to Instagram or TikTok. Copying and saving marks the post as "posted" automatically, with undo.
- **Weekly digest email:** "3 posts ready". It is a delivery, never a nag. Missed slots roll forward silently.
- **.ics feed:** subscribe from any phone calendar.
- **Progress, not guilt:** "7 posted · 3 planned" and a score average over time.
- Property photos are added to the calendar by hand. Theme photos fill in automatically.
- **Not an auto-publisher:** this is a deliberate choice. Auto-publishing needs Meta and TikTok app review, and it would mean competing with Later and Planoly. Publishing is parked until real demand shows.

### 5.7 Library
All photos, grouped by series (property, theme, free photos), with filters. Also: favorite, archive, and zip download.

---

## 6. Next5 Shop: features

### 6.1 Store import
- Paste a TikTok Shop link and tick "I own or manage this shop". The catalog is scraped (via Apify) and imported: products, variants, all images, price, sold count, category.
- Alternative: upload a Seller Center export file (xlsx/csv).
- The official TikTok Shop API will replace scraping once Next5 is approved. Scraping is a v1 bridge only.
- Paid plans re-sync weekly. Each sync records a sold-count snapshot to support honest before/after display. It shows facts only and claims no causation.

### 6.2 Store page
Catalog grid with price, sold count, and status (needs photos, in drop, pack ready). Filters: new since sync, no photos yet, best sellers, slow sellers.

### 6.3 Models
"Me" or **30 Studio models**: 6 each across Asian, White, Black, Arabic and Latina, with different ages and body types. All are synthetic and clearly adult. Starter plans get 1 model; Growth and higher get all 30.

### 6.4 Shop looks
Clean Studio, Soft Beige Wall, Café Lifestyle, Street, Boutique, Resort.

### 6.5 Create drop
Pick products, a model, a look, a shot pack and formats, then check the credit estimate. Shot packs:
- **Listing:** full body front, half body, detail close-up.
- **Full:** Listing plus walking and back/side views.
- **Accessory:** worn, detail, lifestyle.

### 6.6 Weekly drops (Growth and higher)
The seller picks a day and cadence. The daily job picks products that need photos (new stock first, then best sellers) and emails "Review my drop". The link opens Create prefilled. It never spends credits without her click.

### 6.7 Compare view (key screen)
The original product photo is pinned next to the generated shots. Free redo options: "Doesn't match product" and "Doesn't look like model".

### 6.8 TikTok library and listing packs
One pack per product:
- Up to 9 images in TikTok upload order, square main image first, plus a 9:16 video cover.
- Reorder, hide, and set a status: Draft, Ready to list, or Uploaded.
- Product description with a copy button.
- Zip download: `{sku}_01_main.jpg … _09.jpg`, `{sku}_cover_9x16.jpg`, `description.txt`.
- A visible AI label notice appears, because TikTok requires AI-generated listing images to be labeled.

### 6.9 Guardrails
Never alter the garment: color, print, length, neckline, logo. Never add accessories that are not in the product photos. No sexualized poses and no text overlays.

### 6.10 Launch gate
Paid Shop launch is gated on **≥ 80% first-try accuracy**, meaning photos never redone as "doesn't match product". The gate needs 30 or more photos across 3 real catalogs. Admin tracks this metric by category.

### 6.11 Planned: TikTok Shop API (P18, after approval)
OAuth store connection. New product triggers automatic photos. Images are written back to the listing, with TikTok's re-audit tracked. Real performance data (views, conversion) replaces sold-count deltas.

---

## 7. Pricing and business model

**Model:** monthly plans, prepaid for 1, 3 or 6 months (3 months saves 10%, 6 months saves 20%). Credits are granted monthly and **do not roll over**. Nothing auto-charges. Credit top-ups are valid for 12 months. Prices live in `src/config/plans.ts`.

| Product | Plan | Price / month | Photos / month | Key extras |
|---|---|---|---|---|
| Brand | Starter | $29 | 30 | Calendar, score, all themes, all sizes |
| Brand | **Growth** (most popular) | **$99** | 120 | + Post Kit, autopilot calendar, 2K, priority |
| Brand | Agency | $759 | 1,200 | Everything in Growth, setup call (for brokerages and teams) |
| Shop | Starter | $49 | 100 | Import up to 50 products, listing packs, score, 1 model |
| Shop | **Growth** (most popular) | **$199** | 400 | Weekly drops, weekly sync up to 500 products, Post Kit, all 30 models, 2K |
| Shop | Scale | $399 | 1,000 | Priority, first access to TikTok API sync |
| Shop | Agency | Talk to us | custom | Many shops, setup call |

**Top-ups:** 20 credits for $6, 60 for $15, 150 for $32.

**Value stack (Growth pages):**
- Brand: $690 studio + $200 copywriter + $50 coach + $50 theme packs + $150 planning. Priced at $99.
- Shop: anchored on soona's $39 per photo. About $1,820 of value priced at $199.
- Each line carries a `basis` field. The owner must verify these numbers before launch.

**Promises:**
1. **Likeness / product-accuracy guarantee:** free redo, twice per photo.
2. **"Beat your feed":** post 12 Next5 photos in 30 days. If their average doesn't beat her last 12 posts, next month is free. The claim is self-reported, prefilled from the calendar's "posted" count, and reviewed by an admin. One claim per 30 days. Wins with share permission become testimonial leads.

**Unit cost:** customers get WaveSpeed Nano Banana 2 Edit at about $0.07 per 1K image and $0.105 per 2K. Budgeting 30% redo overhead gives about $0.09 per delivered credit. The target is ≥ 70% gross margin.

**Payments today:** real payments are not live. In production, choosing a plan creates an **early-access request**, which an admin activates manually ("Mark paid"). The original design used VND bank-transfer QR through SePay for Vietnam. For the US market, this needs Stripe/USD, and that decision is open.

---

## 8. Success metrics (v1 targets, first 60 days)

| Metric | Target |
|---|---|
| Visitor → trial started | ≥ 8% |
| Trial → paid | ≥ 20% |
| Paid → renewal at end of first term | ≥ 50% |
| Average redo rate per photo | ≤ 25% |
| Shop "doesn't match product" rate | ≤ 10% of photos |
| Shop first-try accuracy (launch gate) | ≥ 80% |

Two more signals are tracked:
- **Posts per week per workspace**, from the calendar. This is the leading churn indicator.
- **Autopilot pausing** as a churn alarm.

---

## 9. Internal / admin tools

The admin dashboard has these tabs:
- **Overview:** funnel, metrics, Shop accuracy.
- **Workspaces**
- **Payments:** activate early-access requests.
- **Promise:** grant or decline claims.
- **QA:** redo reasons, likeness and product-match review.
- **Model test:** benchmark image models side by side with cost per image. Candidates: Nano Banana 2 and Pro, GPT Image 2, Seedream v5 Pro, FLUX 2 Klein, Qwen Image.
- **Users, bookings, prompts:** for the consumer product.
- **UGC Lab:** see below.

**UGC Lab (experimental, admin-only):** a tool to make AI talking-head marketing videos. The flow:
1. Research TikTok videos in a niche.
2. Take a proven hook.
3. Create a consistent persona (character images from Gemini 3 Pro Image or GPT Image 2).
4. Generate 8 to 24 second clips with ByteDance Seedance 2.5 (video and voice) through the Treg API gateway.
5. Burn in captions with Whisper and ffmpeg.

The current goal is to measure how consistent one character looks and sounds across many clips. It is likely meant for Next5's own marketing, and possibly a future product. This is an inference, not stated in the code.

---

## 10. Technology (short)

- **App:** Next.js 16.3, React 19, Tailwind CSS v4. "Mulberry Atelier" theme with light and dark mode. Mobile-first at 390px. Hosted on Vercel.
- **Data:** Postgres with Prisma and dbmate migrations. Server-side credit ledger (reserve, commit, refund). The server is the only source of truth for money and credits.
- **Generation:** WaveSpeed image API with webhooks. A queue "pump" and stale sweeps recover lost callbacks. Prompts are composed from blocks: identity, set, theme or room, format, and guardrails.
- **LLM:** OpenAI gpt-4o-mini writes the Post Kit, the score, and room tags.
- **Imports:** Apify actors for TikTok Shop and Zillow.
- **Storage:** Cloudflare R2. **Email:** Maileroo (templates for trial done, drops, digests, reminders). **Analytics:** Vercel Web Analytics.
- **Cron:** one daily job handles grants, expiry, reminders, drops, store re-sync and autopilot.
- **Release flag:** business products ship behind `NEXT5_BUSINESS_ENABLED`. Mock modes for generation and payments keep local development free.

---

## 11. Known conflicts, risks and open questions

**Conflicts between docs/code and the owner's latest direction:**
1. **Market.** The owner says US-only. The docs (decisions D1, D5) and some code still reflect Vietnam:
   - VND bank-transfer checkout
   - placeholder testimonials with Vietnamese names and cities
   - a Saigon hashtag in examples
   - a value-stack basis "Ho Chi Minh City studio"
   - Vietnam AI Law in the risk list
   - the consumer `/photos` product (Saigon-themed, VND)
2. **Payments.** There is no real US payment path yet. A Stripe/USD decision is needed before paid launch.
3. **Older spec numbers** (Brand $19/$49, Shop $15/$39, 6 Studio models) are superseded by the table in §7.

**Product risks:**
- **Garment fidelity (Shop):** the whole Shop value depends on the real product staying unchanged. The ≥ 80% gate has not been measured on real catalogs yet.
- **Face likeness (Brand):** complaints drive redo cost and churn.
- **Platform dependence:** TikTok Shop and Zillow scraping can break without notice and may conflict with their terms. Upload and export stay as fallbacks. The TikTok API is pending approval.
- **Compliance:**
  - real-estate image rules (AB 723, NAR, MLS)
  - TikTok AIGC labeling
  - biometric data law (Illinois BIPA) before a US launch
  - legal pages are drafts pending lawyer review
- **The ChatGPT objection:** general AI tools keep improving at consistency. The moat must come from workflow (import, packs, calendar, drops, compliance) more than image quality.
- **Unit economics:** redo rate and autopilot spend on customers who churn.
- **Value-stack claims:** they need verified market prices. No verified testimonials exist yet.

**Open product questions (from the docs):**
- Should real-estate themes and autopilot avoid interior stock scenes for agents who have properties?
- Build the "download original next to generated photo" button (the AB 723 access requirement).
- Should "never invent the place" extend to other industries (spas, gyms)?
- Do Realtor.com and Redfin imports matter?
- Should Agency tiers get team seats and multi-brand support?
- Should Post Kit and score be available in bulk, with CSV export for shop listings?
- Calibrate Scroll-Stop Score weights against real promise-claim outcomes.
- Should posting become automatic (Instagram first), and only if demand shows?

---

## 12. Suggested questions for analysis

1. Is Shop the right wedge over Brand for a US launch? What should launch first, and with what proof points?
2. Is the pricing (Brand $29/$99/$759, Shop $49/$199/$399) right for US solo realtors and TikTok Shop sellers? Is prepaid-only (no auto-renew) a conversion help or a retention risk?
3. How defensible is the differentiation against ChatGPT, Gemini and dedicated competitors (AI headshot apps, soona, Pebblely, Claid, Photoroom, Later, Planoly)?
4. What is the fastest way to earn verified proof (testimonials, accuracy data, beat-your-feed wins) without making claims that can't be backed?
5. Which features are overbuilt for the stage, and which are missing for a paid US launch? Examples: payments, legal review, BIPA consent.
6. How should the go-to-market reach US realtors and TikTok Shop sellers? Channels, offer, and trial design ("paste your link, get 3 free photos").
