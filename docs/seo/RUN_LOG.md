# Run log

One line per daily run, newest first.

| Date | Target query | Source | Action | Result | First-try pass |
| --- | --- | --- | --- | --- | --- |
| 2026-10-26 | open house social media post ideas (cluster ~1,100/mo US, all LOW: "open house facebook post" 720, "open house captions" 70, "open house instagram post" 40, "open house post ideas" 40) | Backlog, cold start (Search Console: 14 query rows, best 7 impressions at position 9.6, nothing near the 50-impression bar) | New article, hub `realtors` (moved off `industry` after 4 of the last 5) | Shipped: PR #62. Review 1 failed check 5 on 9 claims (an unsourced ZIP-targeting line in the FAQ, 3 table rows asserting fair housing bases not quoted in the notes, and 5 unsourced result claims); one rewrite, review 2 clean on all 9 | No |
| 2026-10-25 | social media for restaurants (210/mo US, LOW) | Backlog, cold start (Search Console: 11 query rows, best 7 impressions, nothing near the 50-impression bar) | New article, hub `industry` | Shipped: PR #61. Review 1 failed check 5 on 3 claims (music rule overstated for Instagram in 2 places, unsourced "every 90 seconds"); one rewrite, review 2 clean on all 9 | No |
| 2026-10-24 | how many hashtags to use on tiktok for business (parents 480 + 480 + 140 + 70/mo US, all LOW) | Backlog, cold start (Search Console: 8 query rows, best 6 impressions) | New article, hub `how-to` (moved off `industry` after 3 in a row) | Shipped: PR #60. Review 1 failed check 5 on 6 unsourced claims; one rewrite, review 2 clean on all 9 | No |
| 2026-10-23 | tiktok for plumbers (plumber tiktok ~20/mo US) | Backlog, cold start (Search Console: 7 query rows site-wide) | New article, hub `industry` | Shipped: PR #59, both review passes clean | Yes |
| 2026-10-22 | social media for hair salons (40/mo US) | Backlog, cold start (Search Console: 2 query rows site-wide) | New article, hub `industry` | Shipped: PR #58, both review passes clean | Yes |
| 2026-10-21 | social media for gyms (70/mo US) | Backlog, cold start (Search Console: 1 impression site-wide) | New article, hub `industry` | Shipped: PR #57, both review passes clean | Yes |
| 2026-10-20 | coming soon real estate post (90/mo US) | Backlog, cold start (Search Console: 0 rows) | New article, hub `realtors` | Shipped after override: 2nd review fail on check 5, reviewer-introduced lines removed | No |
| 2026-10-20 | social media marketing for dentists (210/mo US) | Backlog, cold start | New article, hub `industry` | Dropped by owner: broad agency term (not a narrow question), no dental cover, 2nd review fail on check 5 | No |
| 2026-10-19 | (setup) | | Engine set up: answer box, hubs, CTA tracking, quality test, agent docs | | |

## Indexing checks

| Checked | URL | Verdict |
| --- | --- | --- |
| 2026-10-26 | /blog/social-media-for-hair-salons (published 2026-10-22) | "URL is unknown to Google" 4 days after merge, the third article in a row with that verdict. The sitemap question from the 2026-10-25 note is now answered, and it is not the cause: `searchconsole.sitemaps.list` shows `https://next5.giinger.com/sitemap.xml` submitted 2026-10-25T01:57:18Z and downloaded by Google 2026-10-25T01:57:19Z, with 32 URLs submitted and 0 indexed, and the live sitemap contains all 4 recent articles. So Google has the sitemap and has not crawled the pages yet. Nothing to fix per article. The site is new and has almost no external links, which is the likeliest reason. Stop treating this as a per-run bug: recheck on 2026-11-02, and if 0 of 32 are still indexed, the work to do is links and age, not another resubmit. |
| 2026-10-25 | /blog/social-media-for-gyms (published 2026-10-21) | "URL is unknown to Google" 4 days after merge, the same verdict the 2026-10-20 article got. Two articles in a row unknown to Google is no longer a per-page issue: the sitemap resubmit in step 7 of DAILY_RUN.md has not been confirmed to run after any deploy so far. Before the 2026-10-27 recheck, verify `gum write searchconsole.sitemaps.submit` actually succeeds and that the deploy publishes both URLs into `sitemap.xml`. (First `gum read` attempt this run returned `SERVICE_DOWN`, connection reset; the retry returned the result above.) |
| 2026-10-24 | /blog/coming-soon-real-estate-post (published 2026-10-20) | "URL is unknown to Google" 4 days after merge, while the page itself returns 200. Nothing to fix in the article: Google has not crawled the sitemap entry yet. Recheck on 2026-10-27, and if it is still unknown, look at whether the sitemap resubmit in step 7 is actually running. |

## Weekly summaries

(Every Monday: articles shipped, queries newly in the top 10, clicks, sign-up starts from articles, first-try pass rate.)
