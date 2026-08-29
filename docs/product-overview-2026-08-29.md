# Next5 — Product Overview

**Generated:** 2026-08-29T07:02:00+07:00 (Saturday, August 29, 2026)

---

## What is Next5?

**Next5 Photos** is a direct-to-consumer, AI-powered photography product based in **Saigon (Ho Chi Minh City), Vietnam**. Customers get **five personalized, Instagram-ready photos** in a curated aesthetic — without booking a studio, a photographer, or a shoot day.

The tagline on the landing page captures the positioning:

> **Your next 5 Instagram photos. Made for you.**

Users pick one of five signature **studios** (curated photo routes), describe how they want to feel, upload a single selfie, and receive a full mini-shoot — styled, directed, and delivered digitally within hours.

---

## The Product

### Five curated studios

Each studio is a themed photo route with a distinct Saigon aesthetic, five scene types, and two assigned **creative directors** (persona-led creative direction, not live photographers):

| # | Studio | Aesthetic | Price |
|---|--------|-----------|-------|
| 01 | **Golden Saigon** | Warm, feminine, golden hour | 149,000 VND |
| 02 | **Soft Girl Saigon** | Soft, romantic, café | 149,000 VND |
| 03 | **Night Out** | Bold, cinematic, neon nights | 149,000 VND |
| 04 | **Luxury Saigon** | Elegant, premium, editorial | 149,000 VND |
| 05 | **Outfit Shoot** | Fashion, street, style | 149,000 VND |

Each studio delivers **5 photos** across predefined scenes (e.g. rooftop skyline, boutique café, neon street).

### End-to-end booking flow

1. **Choose your studio** — pick the aesthetic that matches your vibe.
2. **Choose your creative director** — two directors per studio, each with a specialty and portfolio.
3. **Tell us how you want to feel** — select up to 2 feelings (e.g. beautiful & confident, soft & feminine) and optional goals (e.g. refresh Instagram, feel more confident).
4. **Upload your photo** — one clear selfie is enough.
5. **See your first shot (free preview)** — AI generates a personalized preview before any payment. A creative director's note (GPT-4o-mini) explains the shot in a human, directed voice.
6. **Pay for the full shoot** — bank transfer (Sepay-style QR / transfer reference; mock in development).
7. **Receive all 5 photos** — remaining 4 scenes generate after payment; full set delivered to email and available for download within ~30 minutes.

### What customers actually get

- **5 full-resolution photos** — no watermark, no subscription, yours to keep.
- **Creative direction** — intention-driven prompts shaped by feelings, goals, studio, and director persona.
- **Speed** — immediate first preview; complete shoot within 30 minutes.
- **Saigon-native aesthetics** — rooftops, colonial architecture, cafés, neon streets, luxury interiors — localized for the target market.

### Target customer

Primary audience: **women in Saigon** who want polished social content without the friction of a traditional photoshoot. Social proof on the site references "200+ women in Saigon" and a 4.9 rating. Use cases include Instagram refresh, confidence, content creation, and personal style expression.

---

## Value Proposition

### Core promise

Next5 replaces the **time, cost, and coordination** of a real photoshoot with a **fast, guided, try-before-you-buy** digital experience — while preserving the *feeling* of being art-directed, not filtered.

### Key differentiators

| Pain (traditional shoot) | Next5 answer |
|--------------------------|--------------|
| Book weeks ahead | Start today, preview in minutes |
| Expensive half-day rates | Flat **149K VND** per studio |
| Uncertain outcome | **Free preview** before you pay |
| Generic AI filters | **Creative direction** tied to intention + studio + director |
| Subscription / credits | **One-time purchase**, full ownership |
| Watermarked previews | **Full resolution**, no watermark |

### Emotional framing

The product sells **how you want to feel** — beautiful, soft, elegant, bold, fashionable, noticed — and maps that to visual output. The intention step and director's note reinforce that this is a directed shoot, not a face-swap template.

### Trust mechanics

- **Preview-first monetization** — payment only after the customer has seen a real result of themselves.
- **Transparent pricing** — single price per studio, shown upfront.
- **Social proof** — ratings, avatars, and community framing on the landing page.
- **WhatsApp support** — footer link for human contact.

---

## Business Model

### Revenue: transactional per studio

- **Unit price:** **149,000 VND** (~$6 USD) per studio shoot (5 photos).
- **No subscription** — each studio is a standalone purchase.
- **Preview is free** — acquisition and conversion happen at the preview → payment step.

### Upsell: Saigon Collection bundle

After the first studio is delivered (highest-satisfaction moment in the funnel), customers are offered:

| Offer | Discount | Scope |
|-------|----------|-------|
| **Saigon Collection** (best value) | **30% off** | All 4 remaining studios — multi-use, session-persistent |
| **Next studio** | **10% off** | One additional studio — single-use |

Discounts are claimed in-session and auto-applied when booking eligible routes. The product is designed to drive **repeat purchases across all 5 studios** (collection completion).

**Illustrative bundle economics (undiscounted):**

- 1 studio: 149,000 VND
- 5 studios (full collection): 745,000 VND
- With 30% on studios 2–5: 149,000 + (4 × 104,300) ≈ **566,200 VND** total collection revenue per customer who completes the bundle path

### Payment & fulfillment stack

| Layer | Role |
|-------|------|
| **Landing + booking UI** | Next.js 16, client-side booking modal |
| **Preview & scene generation** | WaveSpeed API (AI image edit/generation) |
| **Creative director note** | OpenAI GPT-4o-mini |
| **Prompt management** | Airtable (fallback: local `prompts.ts`) |
| **Order CRM** | Airtable (booking ID, email, studio, director, feelings, goals, amount, status) |
| **Delivered photo storage** | Cloudflare R2 |
| **Payments** | Bank transfer via Sepay pattern (QR + reference); currently mocked in dev |

### Cost structure (inferred)

- **Variable COGS per order:** AI generation API calls (1 preview + 4 post-payment scenes per studio), OpenAI note, R2 storage/bandwidth.
- **Fixed / ops:** Vercel hosting, Airtable, domain, prompt curation, customer support (WhatsApp).

### Growth levers

1. **Preview-to-paid conversion** — free first shot reduces purchase anxiety.
2. **Studio collection upsell** — 30% bundle after first delivery.
3. **Word of mouth / social** — output is literally Instagram content; customers become distribution.
4. **Geographic niche** — Saigon-specific aesthetics create local relevance vs. generic AI portrait apps.
5. **WhatsApp** — low-friction support and potential manual sales channel.

### What Next5 is *not*

- Not a photographer marketplace or on-location booking platform.
- Not a monthly SaaS or credit wallet (at least in the current product).
- Not a generic "AI headshot" tool — it is **studio-themed, intention-led, and locale-specific**.

---

## Product funnel (summary)

```
Landing → Pick studio → Director + intention → Upload selfie
    → FREE preview + director note → Pay 149K VND → 5 photos delivered
    → Upsell: 30% collection / 10% next studio → Repeat booking
```

---

## One-line summaries

| Lens | Summary |
|------|---------|
| **Product** | AI-personalized 5-photo shoots in five Saigon-themed studios, delivered in hours from a single selfie. |
| **Value proposition** | Professional, directed Instagram photos — fast, affordable, try-before-you-buy, no subscription. |
| **Business model** | Transactional studio sales at 149K VND, with post-delivery bundle upsell to maximize LTV across the 5-studio collection. |

---

*This document was generated from the Next5 landing codebase (`next5-landing/`) and reflects the product as implemented in the repository at the timestamp above.*
