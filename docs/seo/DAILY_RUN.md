# Daily run

This is what the scheduled agent does each morning. Read AGENT_BRIEF.md and QUALITY_BAR.md first.
Ship at most 2 articles. If nothing passes the bar, ship nothing and log why.

## 1. Pull the data

Search Console, last 28 days, by query and page:

```bash
gum read searchconsole.searchanalytics.query --output json --args '{
  "siteUrl": "https://next5.giinger.com/",
  "body": {
    "startDate": "<today minus 30 days>",
    "endDate": "<today minus 2 days>",
    "dimensions": ["query", "page"],
    "rowLimit": 1000
  }
}'
```

(Run `gum describe searchconsole.searchanalytics.query` once if the argument shape has changed.)

## 2. Find the gaps

Keep rows where:

- impressions are high for the site (start at 50 or more in 28 days; raise it as traffic grows),
- CTR is low (under 2%),
- average position is between 8 and 60.

For each kept query, decide:

- **Improve**: an existing article already targets this intent but ranks 8 to 30. Improve that
  article (deeper answer, better title, FAQ, links) and set its `updated` date. Often worth more
  than a new page.
- **New article**: no article serves this intent.
- **Drop**: off-topic for Next5 readers, or no buying intent.

**Cold start**: while Search Console has fewer than about 20 useful queries, pick from
KEYWORD_BACKLOG.md instead, checking volume with treg or Keyword Planner
(`gum read googleads.keywordPlanIdeas.generateKeywordHistoricalMetrics`).

## 3. Pick 1 or 2 targets

Score = impressions (or monthly volume) × intent. Intent is high when the searcher is an owner
with the problem Next5 solves ("what to post as a plumber"), low when it is curiosity or another
audience ("tiktok memes"). Check the keyword is not already an article's `keyword`.

## 4. Research

- Read the current top 5 Google results for the query. Note what they all miss.
- Collect "People also ask" questions for the FAQ.
- Check any platform fact you will state.
- Look for Next5 evidence: a matching slideshow cover in `public/images/auto-slideshow/`, and real
  post results if available. Never invent numbers.

## 5. Write the draft (writer pass)

Create `src/content/guides/articles/<camelCaseName>.ts`, add it to `BLOG_POSTS` in
`src/content/guides/index.ts`, following AGENT_BRIEF.md. Then add a link to it from 3 to 5
existing articles where it truly helps the reader.

## 6. Review (reviewer pass)

A separate pass that did not write the draft scores it against QUALITY_BAR.md. Then run:

```bash
npx vitest run tests/content
npx tsc --noEmit
```

Any fail: one rewrite. A second fail: discard the draft and log the reason.

## 7. Publish

```bash
git checkout -b seo/<slug>
git add -A && git commit -m "seo: <title>"
git push -u origin seo/<slug>
gh pr create --title "seo: <title>" --body "<target query, its data, reviewer verdict>"
```

During the first 4 weeks the owner merges. After that, merge when CI is green.
After the deploy, resubmit the sitemap:

```bash
gum write searchconsole.sitemaps.submit --allow-write --args '{"siteUrl":"https://next5.giinger.com/","feedpath":"https://next5.giinger.com/sitemap.xml"}'
```

## 8. Check and log

- For articles published 4 to 7 days ago, check indexing:
  ```bash
  gum read searchconsole.urlInspection.index.inspect --args '{"body":{"inspectionUrl":"<url>","siteUrl":"https://next5.giinger.com/"}}'
  ```
- Append one line per run to RUN_LOG.md.
- Every Monday, add a 5-line weekly summary under the log: articles shipped, queries newly in the
  top 10, clicks, `site_form_submit` events from articles, first-try pass rate.

## Never

- More than 2 articles in a day.
- Two articles on the same keyword or intent.
- Bulk pages with only a name swapped (city, trade).
- The Indexing API (Google limits it to job and livestream pages).
- Editing anything outside `src/content/guides/` and `docs/seo/` in an SEO run.
