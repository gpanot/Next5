# Agent brief: writing Next5 articles

Read this at the start of every run.

## Who Next5 is

Next5 makes TikTok and Instagram slideshows, videos and Shorts for US small businesses, from their
website, so they get more customers. Posts copy hooks and formats that already get views in the
business's market. The owner approves every post. $2.99 a post, first 3 free, no subscription.

## Who reads our articles

Owners and managers of US small and mid-size businesses (SMEs) that need more customers and have no
marketing team. Mostly local, "non-sexy" trades whose marketing is weak: home services (plumbers,
HVAC, electricians, auto repair), clinics (dentists, chiropractors), local shops and services
(salons, gyms, restaurants, cleaners). Realtors and TikTok Shop sellers are core too, with their own
hubs. They search Google with a problem ("what to post as a plumber", "how to get customers from
TikTok"), not for a product.

Not our reader: founders and startups, and companies of 500+ people that already have a marketing
team. Skip queries written for them ("saas content strategy", "social media manager career").

## The promise of every article

The reader leaves able to do the thing today, even without Next5. Next5 is the shortcut, never a
requirement. If an article only works as an ad, it is not an article.

## Voice

- Plain words. Short sentences. Talk to one owner, as "you".
- Concrete: numbers, examples, exact steps, real hooks they can copy.
- No em dashes. Use a period, a comma or a colon.
- No hype, no filler. The banned phrases are in `src/content/guides/qualityBar.ts`.
- Match the existing articles in `src/content/guides/articles/`.

## Hubs (the `hub` field)

| Hub | Covers |
| --- | --- |
| `post-ideas` | What to post: idea lists, by occasion, by goal |
| `how-to` | Formats and skills: slideshows, hooks, captions, calendar, timing |
| `get-customers` | Turning posts into leads, bookings and sales |
| `cost-alternatives` | What it costs, and the options: freelancer, agency, ChatGPT, tools |
| `industry` | One local trade at a time (not realtors), with that trade's own hooks, examples and customer questions |
| `realtors` | Everything for real estate agents: what to post, listing content, getting leads |
| `tiktok-shop` | Everything for TikTok Shop sellers: product posts, selling, product photos |
| `product` | How to use Next5 itself (kind `guide`) |

Industry articles are only worth publishing when the content is truly different for that trade.
Never clone an article and swap the trade name, and never reuse another article's skeleton (same
opening, same section names, same tables).

## One narrow question

Each article answers one question the way an owner types it. Vaultaire's titles are the model: "Does
CarPlay show your photos on the car screen?", "How to share holiday photos without showing your
camera roll". The narrower the question, the easier it is to be the best answer on Google.

## Article structure

Each article is a TypeScript file in `src/content/guides/articles/`, typed by `Article`
(`src/content/guides/types.ts`), and listed in `src/content/guides/index.ts`. Blog posts go in
`BLOG_POSTS`; product walkthroughs in `GUIDES`.

1. `answer`: the direct reply to the search in 2 or 3 sentences. Shown above the fold.
2. Opening paragraph: why this matters to the owner, in 2 to 3 sentences.
3. The meat: steps, ideas, a table that helps decide, real examples. One `h2` per real sub-question.
4. A "What we saw on real posts" section when Next5 data supports a claim (hooks or formats that
   beat the typical post). Only real numbers. If there is no data, skip the section.
5. A `cta` block after the first useful section, and the article ends with useful content, not a pitch.
6. Common mistakes (when the topic has them).
7. `faq`: 5 to 7 questions people really ask (Google's "People also ask" for the keyword).

Fields to get right:

- `keyword`: the exact search phrase. Must be unique across articles.
- `seoTitle`: 65 characters max. `description`: 70 to 160 characters.
- `cover`: `/images/guides/<slug>.png`, a photo generated for this article that shows the same trade
  or topic (see DAILY_RUN.md step 4). Describe exactly what it shows in `coverAlt`. Older articles use
  a Next5 slideshow folder; keep those as they are.
- A short "How Next5 does this" part where it fits: how Next5 would make this kind of post for the
  reader. One section at most, after the reader already has the free answer. Never describe the
  cover as something Next5 made.
- `published`: today's date. `updated`: set when you improve an existing article.

## Links

- 3 or more links to other Next5 articles inside the body, where they help the reader.
- Add a link to the new article from 3 to 5 existing articles that already get impressions, in a
  sentence where it fits naturally. Prefer articles in the same hub.
- Internal links only to pages that exist (the test checks).

## Truth

- Never invent statistics, studies, quotes, customers or results.
- Platform facts (TikTok features, limits) must be checked on the web the same day.
- Health, legal and money claims need a primary source: the law, the regulator or the official site.
- End with a `Sources` h2 listing the external sources behind the facts, as links. Every source is
  also in the research notes.
- When in doubt, leave it out.
