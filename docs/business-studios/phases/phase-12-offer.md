# P12 — Offer v2: beat "I can do it with ChatGPT"

**Decided 2026-09-15 with Guillaume.** Position Next5 as a selling system, not an image generator.

## Built

| Area | What | Where |
|---|---|---|
| Tiers | Starter $29 · **Growth $99 (most popular)** · Agency $759 per product line. `*_pro` ids are sold as "Growth" (stored subscriptions keep working). Onboarding shows Starter + Growth; Agency on pricing and billing. | `src/config/plans.ts` |
| Post Kit | Hook, caption, 6–10 hashtags, and a product description on Shop, per photo. gpt-4o-mini with the photo (low-detail vision), cached on the item, cleared on redo. Growth/Agency, plus trial photos as a taste. | `src/server/postKit`, `POST /api/app/items/[id]/post-kit`, `PostKitPanel` |
| Scroll-Stop Score | 0–100 from six weighted checks (stops the scroll, clear subject, works small, light, looks current, looks real) + one tip + best use. Scored after every finalize (mock score in mock mode). Badge on tiles, card in lightbox and trial. | `src/lib/scoreRubric.ts`, `src/server/score`, `ScoreBadge`, `ScoreCard` |
| Beat-your-feed promise | Post 12 Next5 photos in 30 days; if the average doesn't beat the last 12 posts, next month free. Self-reported in Billing → claim; wins are recorded (testimonial leads, share permission); misses go to Admin → Promise → Grant (plan's monthly photos as 30-day bonus) or Decline. One claim per 30 days. | `src/config/promise.ts`, `src/server/promise`, `PromiseCard`, `PromiseTab`, migration `20260915090000_post_kit_score_promise.sql` |
| Pages | Mobile-first `OfferHero` (headline → platform marks → phone mock → CTA), "Every photo comes ready to post" (score + Post Kit example), **Why not just use ChatGPT?**, value stack, two promises, testimonial slots, 3-tier pricing, ChatGPT/score/promise FAQs on `/`, `/brand`, `/shop`. | `src/components/marketing/offer/*`, `src/content/business/offer.ts` |
| Testimonials | Content with `verified` flag. Production renders verified stories only (section hidden when none); dev/preview shows placeholders with an "Example" tag. Preview override: `NEXT5_SHOW_PLACEHOLDER_TESTIMONIALS=true`. | `Testimonials.tsx` |

## Claims policy (D10)
- "Built to" wording until beta data exists. No sales-lift percentages, no "trained on N photos".
- The score is described as "rated by AI on six things" — calibrate weights with promise-claim data later.
- Value-stack prices are market estimates in `offer.ts` (`basis` field). **Verify each before launch** (studio $690 came from Guillaume).
- Never ship `verified: false` testimonials to production.

## Next
- Replace example testimonials with real ones (promise wins with share permission are the pipeline).
- Vietnamese Post Kit option for VN audiences.
- Bulk "Post Kits for the whole batch" and a CSV export for shop listings.
- Calibrate score weights against promise claims; then show "average score of posts that beat their feed".
- Agency: team seats (still solo accounts), multi-brand.
