# Daily run

This is what the scheduled agent does each morning. Read AGENT_BRIEF.md and QUALITY_BAR.md first.
Ship at most 1 article. If nothing passes the bar, ship nothing and log why.

## 1. Pull the data

Search Console, last 28 days, by query and page. The property is the domain property
`sc-domain:giinger.com`, so always filter to Next5 pages (Search Console has no "starts with"
operator, so use a regex):

```bash
gum read searchconsole.searchanalytics.query --output json --args '{
  "siteUrl": "sc-domain:giinger.com",
  "body": {
    "startDate": "<today minus 30 days>",
    "endDate": "<today minus 2 days>",
    "dimensions": ["query", "page"],
    "rowLimit": 1000,
    "dimensionFilterGroups": [{"filters": [
      {"dimension": "page", "operator": "includingRegex", "expression": "^https://next5\\.giinger\\.com/"}
    ]}]
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
KEYWORD_BACKLOG.md instead, and check volume with Keyword Planner through gum (Google Ads client
account `8703074080` under manager `9979191937`, US, English):

```bash
# Volume for a list of candidates (up to 10,000 keywords per call)
gum read googleads.keywordPlanIdeas.generateKeywordHistoricalMetrics --output json --args '{
  "customerId": "8703074080", "loginCustomerId": "9979191937",
  "keywords": ["<candidate 1>", "<candidate 2>"], "geoTargetConstants": ["2840"], "language": "1000"
}'

# New ideas around a seed. Use --format raw: the default output drops keywordIdeaMetrics
gum read googleads.keywordPlanIdeas.generateKeywordIdeas --format raw --args '{
  "customerId": "8703074080", "loginCustomerId": "9979191937",
  "keywords": ["<seed>"], "geoTargetConstants": ["2840"], "language": "1000"
}'
```

Use treg (`dataforseo.google.keywords.volume`) only if gum fails. Prefer a narrow question an owner types ("what to post on TikTok as a
dentist") over a broad head term owned by agencies ("dental marketing"). Narrow questions often show
little or no volume: that is fine when Google shows them in "People also ask" or related searches.

## 3. Pick 1 target

Score = impressions (or monthly volume) × intent. Intent is high when the searcher is an owner
with the problem Next5 solves ("what to post as a plumber"), low when it is curiosity or another
audience ("tiktok memes"). Check the keyword is not already an article's `keyword`.

## 4. Research

- Read the current top 5 Google results for the query. Note what they all miss.
- Collect "People also ask" questions for the FAQ.
- Check any platform fact you will state.
- Health, legal and money topics (HIPAA, taxes, prices, insurance, licensing) need a primary source
  for every factual claim: the law, the regulator or the official site. A news or vendor blog is not
  enough on its own.
- Write the research notes to `docs/seo/research/<slug>.md`: the query and its data, the top 5 and
  what they miss, the "People also ask" questions, and every fact you will state with its source URL.
  The reviewer checks the draft against this file.
- Make the cover: one photo of the same trade or topic as the article, generated with the
  web-imagery skill. Bright daylight, realistic, 4:5, no text other than what the scene needs (a
  yard sign is fine). Never reuse another article's cover. Never use an unrelated one.
  Every cover shares one look: a small business owner of the article's trade, busy with a real
  task, in their own place. Write the subject sentence, then append the style sentence unchanged.
  ```bash
  STYLE="Candid documentary photograph for a magazine feature, the person is busy with the task and does not look at the camera, ordinary real-looking people with natural skin texture and everyday clothes, real lived-in place, plain walls and surfaces free of papers, signs and labels, bright soft natural daylight, true-to-life muted colors, shot on a 35mm lens at eye level, gentle depth of field, subtle film grain, vertical 4:5 frame with the subject in the middle third"
  node ~/.claude/skills/web-imagery/gen-image.mjs --prompt "<who, doing what, where>. $STYLE" \
    --out public/images/guides/<slug>.png --size 1024x1280 --model black-forest-labs/FLUX-2-pro --alt "<alt>"
  ```
  Then compress it under 1 MB (sharp `png({ palette: true, quality: 95, dither: 1 })` gives about
  800 KB) and update `bytes` in the manifest entry (`public/images/manifest.json`). The test fails
  when the cover is not in the manifest. Next5 slideshows are not needed for articles.
- Look for real post results in Next5 data. Never invent numbers.

## 5. Write the draft (writer pass)

Create `src/content/guides/articles/<camelCaseName>.ts`, add it to `BLOG_POSTS` in
`src/content/guides/index.ts`, following AGENT_BRIEF.md. Then add a link to it from 3 to 5
existing articles where it truly helps the reader.

Before the review, the writer does its own check 5 pass, line by line: every number, rule, platform
detail, quote or result claim must point to a row in the research notes. If it does not, delete the
claim or turn it into plain advice ("try", "test", "check your own numbers"). Never keep an outcome
claim ("this gets more bookings") without a source. Most first-review fails so far were check 5.

## 6. Review (reviewer pass)

A separate pass that did not write the draft scores it against QUALITY_BAR.md. Every round it
rereads the whole draft and the research notes, including any text it suggested itself. Then run:

```bash
npx vitest run tests/content
npx tsc --noEmit
```

Any fail: one rewrite. Before applying the reviewer's suggested lines, check each one against the
research notes: apply it only if its facts are in the notes (or it is plain advice), otherwise drop
the line or the sentence it replaces. A second fail: discard the draft and log the reason.

## 7. Publish

```bash
git checkout -b seo/<slug> origin/main
git add -A && git commit -m "seo: <title>"
git push -u origin seo/<slug>
gh pr create --base main --title "seo: <title>" --body "<target query, its data, both reviewer verdicts>"
```

During the first 4 weeks the owner merges. After that, merge when CI is green.
After the deploy, resubmit the sitemap:

```bash
gum write searchconsole.sitemaps.submit --allow-write --args '{"siteUrl":"sc-domain:giinger.com","feedpath":"https://next5.giinger.com/sitemap.xml"}'
```

## 8. Check and log

- For articles published 4 to 7 days ago, check indexing:
  ```bash
  gum read searchconsole.urlInspection.index.inspect --args '{"body":{"inspectionUrl":"<url>","siteUrl":"sc-domain:giinger.com"}}'
  ```
- Append one line per run to RUN_LOG.md.
- Every Monday, add a 5-line weekly summary under the log: articles shipped, queries newly in the
  top 10, clicks, `site_form_submit` events from articles, first-try pass rate.

## Never

- More than 1 article in a day.
- Two articles on the same keyword or intent.
- Bulk pages with only a name swapped (city, trade).
- The Indexing API (Google limits it to job and livestream pages).
- Editing anything outside `src/content/guides/` and `docs/seo/` in an SEO run.
