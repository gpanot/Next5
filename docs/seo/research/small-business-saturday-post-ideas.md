# Research: small business saturday post ideas

## Query and data

- Target keyword: "small business saturday post ideas"
- Google Ads Keyword Planner (customer 8703074080, US, English), `generateKeywordHistoricalMetrics`,
  run 2026-10-30: avg monthly searches 20, LOW competition. Seasonal spike: October 2025 = 10,
  **November 2025 = 140**, December 2025 = 10, all other months 0-10.
- Related checked same call: "small business saturday social media ideas" (no metrics returned, too
  low volume to report), "small business saturday instagram caption" (no metrics), "small business
  saturday flyer ideas" (avg 10/mo, November 2025 = 50).
- Broad head term "small business saturday" (generateKeywordIdeas, same call): avg 9,900/mo,
  November 2025 = 90,500. Owned by American Express, local Chambers of Commerce and generic
  marketing-blog listicles, not a question a single owner types, so not the target.
- Search Console (2026-09-30 to 2026-10-28, Next5 pages only): 18 query rows, 0 clicks, best 9
  impressions. No row is a Small Business Saturday query. Cold start, picked from
  `docs/seo/KEYWORD_BACKLOG.md`.
- Not a duplicate: no existing article has this keyword (checked every `keyword:` field in
  `src/content/guides/articles/*.ts`). `christmasSocialMediaPostIdeas.ts` mentions Small Business
  Saturday in one caption example inside a broader December calendar; this article is the deep,
  single-day answer the broad one only touches, so it is a distinct intent, not a duplicate.
- Timing: write and ship before "early November" per the backlog note. Today is 2026-10-30, four
  weeks before the day itself (November 28, 2026), enough runway to index before the search spike.

## The date and the history (primary sources)

- Small Business Saturday 2026 falls on **November 28, 2026**, the Saturday after Thanksgiving,
  between Black Friday and Cyber Monday. Source: en.wikipedia.org/wiki/Small_Business_Saturday
  ("This Saturday is always the last one in November, so it falls between November 24 and
  November 30" + "on the Saturday after Thanksgiving in the United States").
- Founded by American Express in 2010, first observed November 27, 2010, in partnership with the
  National Trust for Historic Preservation, Boston Mayor Thomas M. Menino and Roslindale Village
  Main Street. Source: en.wikipedia.org/wiki/Small_Business_Saturday.
- The hashtag #ShopSmall predates the campaign ("existed since early 2010") and was the hashtag used
  to promote the first event alongside #smallbusinesssaturday / #smallbizsaturday; the 2010 event
  generated "more than one million Facebook 'like' registrations and nearly 30,000 tweets" under
  those tags. Source: en.wikipedia.org/wiki/Small_Business_Saturday.
- The US Small Business Administration co-sponsors the day (confirmed via SBA's own observance
  page, already cited as a source in `christmasSocialMediaPostIdeas.ts`:
  https://www.sba.gov/about-sba/organization/observances/small-business-saturday/). Reused here for
  the same fact (government co-sponsor), not a new claim.
- American Express's own page (americanexpress.com/en-us/benefits/shop-small/) failed to load
  (parse error, header overflow) during this run. Did not use any claim that depends on it; every
  AMEX-origin fact above is instead sourced to Wikipedia, which cites AMEX's own announcements.

NOT VERIFIED (dropped, do not state): any claim naming American Express's current total lifetime
spending figure ($200B/$19.8B appeared in search snippets but each belongs to a different year's
press release, not independently opened and read this run) and the TikTok "#ShopSmall Accelerator"
$100 ad credit (seen only in an AI-generated search summary, not an opened primary page). If either
is needed, open the primary press release/TikTok page directly before stating it.

## Top 5 results and what they miss

Searched "small business saturday post ideas". Opened the top results that returned content:

1. **wordstream.com/blog/small-business-saturday-marketing** — blocked this run (HTTP 403). Known
   from the search snippet to be a broad 17-idea marketing listicle (flyers, email, in-store signage
   mixed with social), not social-specific.
2. **cloudcampaign.com/blog/small-business-saturday-social-media-posts** — opened. 3 post types
   (community connection post, product-story Reel/TikTok, interactive shop-local contest), generic
   hashtags (#SmallBusinessSaturday, #ShopSmall, #SupportLocal), advice to "batch and pre-schedule,"
   no actual caption text, no day-by-day schedule, no split between a shop with inventory and a
   service business.
3. **blog.brandbastion.com/inspiration/small-business-saturday-ideas** — not opened this run (time
   budget); search snippet shows the same category of advice as the others (community post, product
   story, giveaway, customer appreciation).
4. **thryv.com/blog/make-splash-small-business-saturday** — not opened; snippet-level only.
5. **localiq.com/blog/small-business-saturday-ideas** — opened. One social tactic only ("share your
   plans, invite people to shop"), two hashtags, no schedule, TikTok not mentioned at all, the rest
   of the article is non-social (flyers, paid ads, email).

What every one of them misses, confirmed across the two fully opened pages and the snippets of the
rest:

- No ready-to-copy caption text tied to a specific day (a week before vs. the morning of vs. the
  Monday after). Advice stays at the strategy level ("tell a story," "batch content").
- No service-business angle. All examples assume a shop with physical product to photograph; none
  address a business with nothing to put in a photo (a plumber, a dentist, a cleaner).
- TikTok is mentioned by name in only one of the two opened pages (cloudcampaign), and only as "Reels
  or TikToks" for one idea, not as its own format.
- None explain why the date moves or name a primary source for it; several outside the top 5 (seen
  in the broader date search) just assert "November 28" with no citation.

## People Also Ask / related questions seen

Collected from the two search queries run this session ("small business saturday post ideas" and
"when is small business saturday 2026 what is it who started it"):

- When is Small Business Saturday 2026 / What date is it?
- What is Small Business Saturday?
- Who started Small Business Saturday?
- What hashtag do you use for Small Business Saturday? (#ShopSmall)
- What should I post for Small Business Saturday if I don't sell a product?
- Small Business Saturday caption ideas / examples (from the caption-focused search: community,
  cause-support, short/punchy styles — used only as a style reference, no caption copied verbatim
  since none of those sources state where their example came from).

## Next5 data

No Next5 post data exists for Small Business Saturday content yet (new seasonal topic, first year
covering it). No "What we saw on real posts" section in this article; skip per AGENT_BRIEF.md.

## Cover

Generated via web-imagery skill: a shop owner taping up a "Shop Small" or handwritten sign in a
storefront window, bright daylight, matches the AGENT_BRIEF.md style sentence. Saved at
`public/images/guides/small-business-saturday-post-ideas.png`, unique, not reused from any other
article.
