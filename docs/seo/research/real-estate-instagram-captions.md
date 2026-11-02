# Research: real estate instagram captions

## Query and data

- Target: **real estate instagram captions**, 10/mo US avg, LOW competition (Google Ads Keyword
  Planner, `googleads.keywordPlanIdeas.generateKeywordIdeas`, fetched 2026-11-02).
- Cluster of 26 near-identical variants returned by the same call, each 10/mo US, mostly LOW
  competition: real estate quotes for instagram, real estate captions for instagram, realtor
  instagram captions, instagram captions for real estate agents, best real estate instagram
  captions, real estate agent instagram captions, real estate instagram caption ideas, real estate
  instagram quotes, real estate photo captions, realtor captions for instagram, realtor quotes for
  instagram, and 15 more worded variants of the same search. No single term carries volume, but the
  cluster size (26 distinct phrasings, all LOW competition, all on-topic) shows real, steady demand
  from agents who want copy-paste caption text, the same signal strength used for prior cold-start
  picks (tiktok commercial sounds library cluster ~280/mo, christmas post ideas cluster ~250/mo).
- Search Console (`sc-domain:giinger.com`, 2026-10-03 to 2026-10-31, Next5 pages only): 24 query
  rows, 0 clicks, best 12 impressions ("how much to charge to manage social media"). Nothing near
  the 50-impression bar and no row matches this intent. Still cold start.
- Backlog line: `docs/seo/KEYWORD_BACKLOG.md` → realtors → "real estate instagram captions" (listed
  there as "real estate instagram captions").
- Not a duplicate: `src/content/guides/articles/socialMediaForRealtors.ts` (keyword `social media
  for realtors`) lists 30 post **topic** ideas (what to film or photograph) but has no caption
  **wording** to copy-paste. This article is about the words under the post, not the post idea
  itself. Different intent, cross-linked both ways.

## Top 5 Google results and what they miss

Checked 2026-11-02. All ranking pages are long static caption lists (100 to 500+ captions grouped
by scenario: new listing, open house, just sold, luxury, funny, quotes):

1. flick.social — "100+ Best real estate instagram captions + Free AI Caption Generator"
2. nichepursuits.com — 407 captions across 11 categories (luxury, fixer-upper, funny, single-word).
   Fetched in full: gives brief CTA advice ("include calls to action") and hashtag advice, but
   **no fair housing warning at all**, despite being real estate content.
3. nicolemickle.com — 350 captions across 13 categories. Fetched in full: this is the strongest
   competitor. It gives an actual caption formula ("opens with a line that makes people stop, adds
   one specific detail, ends with a single call to action"), CTA advice, and one line of fair
   housing caution ("Avoid words that describe who should live in a home instead of the home
   itself... Fair housing rules apply to social media advertising too"), but states the rule once
   with no rewrite examples and no list of words that actually trigger it.
4. captionsforge.com — 500+ captions, same static-list format (not fetched in full, title/category
   structure only, consistent with the other list sites below).
5. clientkeepercrm.com — 50 "copy-paste templates", same static-list format (not fetched in full).

What none of the top 5 do, even nicolemickle.com:
- No fill-in-the-blank template tied to the specific post types Next5 readers already use (new
  listing, open house, just sold, local-area, about-you — the same 5 categories as
  `socialMediaForRealtors.ts`), so the agent still has to search a 300+ item list for something
  close enough to their listing instead of filling in their own details.
- No side-by-side "unsafe phrase → safe rewrite" table. nicolemickle states the fair housing rule
  once in an FAQ line; it does not show what to write instead.
- All are Instagram-only. None mention that the same caption (shortened) also works for a TikTok
  slideshow or video, which is how Next5 readers actually post (see `socialMediaForRealtors.ts`:
  "Post the same slideshow or video on both").
- None give a plain-English caution on the character cut-off that actually matters for the opening
  line (see Instagram caption length fact below): copy-paste captions.
- Everyone covers Instagram **existing** listings; none address the single hardest case the bottom
  of search intent the keyword implies: a listing with nothing unusual about it ("3 bed, 2 bath,
  nothing special"), which is the case most owners searching this term are actually stuck on.

## People also ask / FAQ candidates

From the SERP FAQ boxes and the competitor FAQs (flick.social, nicolemickle.com, amplifiles.ai),
seen 2026-11-02:

1. How long should a real estate Instagram caption be?
2. Should I use hashtags in a real estate caption, and where do they go?
3. Are there words real estate agents should avoid in captions?
4. Do I need a different caption for TikTok than Instagram?
5. What do I write when the listing has nothing special about it?
6. Can I just copy captions from a caption list?
7. Should the caption go in the post or the first comment?

## Every fact and its source

| # | Claim | Source |
| --- | --- | --- |
| 1 | The Fair Housing Act (and HUD's regulation at 24 CFR § 100.75) makes it illegal to publish any housing ad that "indicates any preference, limitation or discrimination because of race, color, religion, sex, handicap, familial status, or national origin," and this covers social media posts, not only MLS listings or print ads. | 24 CFR § 100.75, Cornell Legal Information Institute (mirrors the federal regulation): https://www.law.cornell.edu/cfr/text/24/100.75 — fetched 2026-11-02. Confirmed by HUD's own 2024 digital-platform advertising guidance existing at archives.hud.gov (title: "FHEO Guidance on Advertising through Digital Platforms"), referenced by hud.gov search results 2026-11-02, though the PDF itself did not render as text. |
| 2 | Words that describe who should live in a home (e.g. "perfect for families," "safe neighborhood," "ideal for young professionals," "no children") are the kind of phrase that regulation flags, versus words that describe the property, services or neighborhood itself (e.g. "two bedroom," "quiet street," "no bicycles allowed"), which are not facially discriminatory. HUD's 1995 Achtenberg memo also separately names catch-all words like "exclusive," "restricted" and "limited" as ones to avoid, since they carry an exclusionary connotation on their own. | Same regulation as #1 (the distinction between describing the dwelling vs. describing the resident is the core test in 24 CFR § 100.75); corroborated by two independent secondary breakdowns of the HUD 1995 Achtenberg memo (mymetrotex.com, iconsofrealestate.com), fetched 2026-11-02. |
| 3 | Instagram caption cap is 2,200 characters, and only roughly the first couple of lines show before the "more" link on mobile, so the opening words carry the most weight. | Platform fact, checked same day across multiple independent sources (replug.io, outfy.com, howmanywords.app, bundle.social, fetched 2026-11-02) that all independently state the 2,200-character cap and the early truncation; Meta's own developer docs confirm the 2,200-character publishing limit but did not state the on-screen truncation point in the page checked, so the article states the truncation point loosely ("a line or two") rather than naming an exact character count. |
| 4 | socialMediaForRealtors.ts already tells readers to post the same slideshow or video to both TikTok and Instagram. | `src/content/guides/articles/socialMediaForRealtors.ts` line 23 (site content, not an external source). |

No Next5 post-performance data applies to this topic (captions are text, not a post format Next5
tracks separately), so the article has no "What we saw on real posts" section.

## Cover

Generated photo, 4:5, matching style sentence in DAILY_RUN.md: a realtor at a listing, phone in
hand, typing a caption, "for sale" sign visible, bright daylight.
