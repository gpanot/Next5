# Paper Route teardown (2026-11-02)

Competitor: trypaperroute.com, content service for US real estate agents ($29-$79 a month). Their guide pages are cited by Perplexity and ChatGPT. Scraped with `treg call treg.web.extract` (direct fetch and WebFetch return 403; treg works, about $0.001 a page).

## Site map (from their sitemap)

- /compare, /compare/{roomvu, coffee-and-contracts, agent-crate, luxury-presence}
- /alternatives, /alternatives/{roomvu, coffee-and-contracts, agent-crate}
- /guides plus 6 guides: ai-tools-for-real-estate-agents, done-for-you-social-media-for-real-estate-agents, real-estate-social-media-marketing, social-media-management-for-busy-real-estate-agents, real-estate-social-media-under-100-a-month, real-estate-social-media-statistics
- /tools/real-estate-commission-calculator
- /llms.txt with a `.md` twin of every page (for example /pricing.md, /compare.md)
- Note: /guide is a 404. The real path is /guides.

## Why AI engines cite them

1. Every page opens with a 2-sentence self-description, a "not the right pick for X" line and an "Updated <date>" stamp.
2. Question headings ("How much do ... cost?", "Which list should I read?") each followed by a direct answer in the first sentence.
3. Tables with price, source link and "checked <date>" for every vendor fact.
4. Every statistic is one sentence: number, sample size, source link, month and year.
5. Their own original data (review of 182 and 495 agent Instagram accounts) with a Methodology section. This is the strongest hook for citation.
6. Markdown twin for each page plus llms.txt with "when to use / not a fit" guidance.
7. Honest "choose the competitor if..." lines. Raises trust, and models quote it.

## What we can reuse (public facts only, never their copy)

- Vendor prices and plans in /alternatives/ (each links the vendor page): AutoReel, Curated Social, PropWalk, The Social Broker, Agent Crate, Reel-E, Coffee & Contracts, Roomvu, RealEstateContent.ai, Social Realtr, Luxury Presence. Re-verify on vendor pages before publishing.
- NAR / Zillow / Realtor.com / Pew / Meta / Wyzowl figures in their stats guide. Primary-source URLs are in the scraped page. Re-open each source and re-verify before use.
- Page structure and the question list (templates, not text).

## Do not copy

- Their sentences, their table text, their own survey numbers (182 / 495 accounts study). Those are their data.
