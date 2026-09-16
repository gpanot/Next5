# P20 — Listing mode (Brand Studio, real estate)

Status: **proposal, awaiting review**. Written 2026-09-16.
Trigger: one uploaded exterior photo produced 8 photos — 1 of the real house, **7 invented interiors**.
Related: [11-calendar-plan.md](11-calendar-plan.md) (the drop box this corrects).

---

## 1. What happened, and why it is not just a bug

`expandBrand` takes `materials[index] ?? null` (`src/server/generation/expand.ts`). One uploaded photo fills
item 0. Items 1–7 get `null`, fall through to `pickLocation()`, and are composed against the **set template's
stock locations** — a marble kitchen, a bright hallway. The model renders them convincingly.

The result is a batch that looks like a tour of a property that does not exist.

### Why this is the one industry where that is dangerous

A generic kitchen behind a life coach is a backdrop. A generic kitchen behind a realtor, posted the same week
she lists 2720, reads as *that house*. She does not have to claim it — the audience infers it.

What the rules say, as of today:

| Rule | Bite |
|---|---|
| **NAR Code of Ethics, Article 12 / SOP 12-10** — present a "true picture"; no misleading images or manipulation ([realestatenews](https://www.realestatenews.com/2026/06/18/how-should-mlss-portals-address-ai-enhanced-listing-photos)) | Applies to every Realtor, every state |
| **California AB 723**, in force since **1 Jan 2026** — disclose any image digitally altered to add, remove or change physical elements of a property, and give access to the original ([Lewis Brisbois](https://lewisbrisbois.com/newsroom/legal-alerts/new-california-law-requires-real-estate-agents-and-brokers-to-disclose-ai-a)) | Willful violation is a misdemeanour plus a DRE citation up to $2,500 |
| **Wisconsin Act 69** — same shape, from 1 Jan 2027 | Coming |
| **MLS rules** (CRMLS, MLSListings and others) — label altered images, sometimes upload the original alongside ([Styldod](https://www.styldod.com/blog/mls-ai-photo-compliance-rules-2026)) | Listing removal, fines |
| Material misrepresentation generally | Reported fines to $10,000 and licence suspension |

Two details matter for our design:

1. **Disclosure has to be on the image.** Caption or agent-remarks text is explicitly not enough.
   Our invisible metadata label does not satisfy this on its own.
2. **The original must be reachable.** We already store her upload in R2, so we can do this — and it is a
   feature competitors do not have.

> Not legal advice, and these are mostly secondary sources. Before this ships to US agents it wants a lawyer's
> read, which is already on the list.

---

## 2. The rule that fixes it

> **In listing mode we never invent a setting. A photo comes from one of her photos, or it is not made.**

No fallback to stock locations, ever. If she uploads 3 photos, she cannot get 8 — the count is bound to what
she gave us.

### 2.1 The unit is the listing, not the loose photo

Today the drop box is a flat pile. It should group into a **Listing**: an address plus its photos.

She already has the raw material for free — the MLS set for 2720 is **28 photos**. Six of them is a complete
set of her in that house: doorway, kitchen, living room, primary bedroom, backyard, front.

```
Listing "2720 Ashford Dr"  ← she names it, attests she represents it
  ├── exterior-front.jpg    → her on the porch
  ├── kitchen.jpg           → her at the real island
  ├── living.jpg            → her by the real fireplace
  └── backyard.jpg          → her on the real deck
```

### 2.2 Count follows input

Guillaume's instinct — 1 photo → 2 variations, not 8 — is right, and I would make it the rule:

**photos per listing = uploaded photos × variations (1–3, default 2).**

So 4 photos → 8 outputs, each grounded in a real room, with a different pose and framing. The Create screen
stops asking "how many photos?" and asks **"how many looks per room?"**, which is honest about what is possible.

One caveat on her suggestion: two variations of the *same exterior* is repetitive content. The answer is to make
uploading several rooms the obvious path — the photos already exist in her MLS listing.

### 2.3 Listing batches never mix

A listing batch contains listing photos only. Her brand content — desk, portrait, out in the neighbourhood —
stays a separate batch, where a stock setting is honest because the subject is plainly *her*, not a property.

---

## 3. Compliance as a feature, not a warning

This industry's rules are a moat if we build to them.

| | What we do |
|---|---|
| **Attest** | Creating a listing asks "I represent this property" — the same shape as Shop's store attestation |
| **Visible label** | `visibleAiTag` is **forced on** for listing photos, not optional. The on-image label is what AB 723 and the MLSs ask for |
| **Keep the original** | Her upload stays in R2, downloadable next to the generated photo, and included in the zip — this is the "access to the original" AB 723 requires |
| **Honest Post Kit** | The caption writer is told never to describe rooms, finishes or features it cannot see in her photo |
| **Say it plainly** | The listing screen states: we place you in your photo; we never redecorate, restage or invent a room |

The prompt block already tells the model to leave the architecture, furniture and materials alone
(`materialBlock` in `composer/blocks.ts`). That is the right instruction — it just needs to be the *only* path.

---

## 4. What changes

| Area | Change |
|---|---|
| Data | `post_materials` gains a `listing_id`; new `listings` table (label, attestation, archived) |
| `expandBrand` | Listing mode: iterate materials × variations. **Delete the stock-location fallback in that mode.** |
| `composeBrandPrompt` | Variation index drives pose/framing within the same real room |
| Create screen | Pick a listing → see its rooms → choose looks per room; count is derived, not typed |
| Drop box | Becomes "Listings": grouped, named, attested |
| Labelling | Force the visible tag for any photo built from a listing material |
| Post Kit | Prompt guard against describing unseen features |
| Themes | Review the real-estate theme scenes: the ones that render an interior should be listing-only |

---

## 5. Questions for Guillaume

1. **Variations per room** — default 2, allow up to 3? Or fix it at 2 and let her upload more rooms?
2. **Non-listing brand photos for agents.** Keep the current themes for "photos of me" batches, or restrict
   real-estate themes to settings that cannot be mistaken for a property (office, outdoors, portrait)?
3. **Force the visible AI label on listing photos?** My recommendation is yes, non-optional — it is what the
   rules ask for and it is cheap. It does put a mark on her photo.
4. **What about the 7 photos already generated?** Suggest we flag existing brand batches that used a stock
   interior for a real-estate workspace, so nobody posts them by accident.
5. **Other industries.** The same "never invent the place" rule would help a spa or a gym showing their own
   room. Apply it wherever a material exists, or keep it real-estate-only for now?
