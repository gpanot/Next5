# Agent brief: writing Next5 articles

Read this at the start of every run.

## Who Next5 is

Next5 makes TikTok and Instagram slideshows, videos and Shorts for US small businesses, from their
website, so they get more customers. Posts copy hooks and formats that already get views in the
business's market. The owner approves every post. $2.99 a post, first 3 free, no subscription.

## Who reads our articles

US small business owners who need more customers and have no time or team for social media:
realtors, home services (plumbers, HVAC, electricians, auto repair), local shops and services
(salons, gyms, restaurants, clinics, cleaners) and TikTok Shop sellers. They search Google with a
problem ("what to post as a realtor", "how to get customers from TikTok"), not for a product.

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
| `industry` | One trade at a time, with that trade's own hooks, examples and customer questions |
| `product` | How to use Next5 itself (kind `guide`) |

Industry articles are only worth publishing when the content is truly different for that trade.
Never clone an article and swap the trade name.

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
- `cover`: a folder in `public/images/auto-slideshow/` with a real Next5 slideshow. Pick the one
  closest to the topic and describe it in `coverAlt`.
- `published`: today's date. `updated`: set when you improve an existing article.

## Links

- 3 or more links to other Next5 articles inside the body, where they help the reader.
- Add a link to the new article from 3 to 5 existing articles that already get impressions, in a
  sentence where it fits naturally. Prefer articles in the same hub.
- Internal links only to pages that exist (the test checks).

## Truth

- Never invent statistics, studies, quotes, customers or results.
- Platform facts (TikTok features, limits) must be checked on the web the same day.
- When in doubt, leave it out.
