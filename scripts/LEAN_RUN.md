# Next5 SEO run

Ship 1 article a day. Shipping nothing is the last resort: a failing cover, a failing claim or a bad target is something you fix or cut, not a reason to end the run. Only ship nothing when no target can pass the bar today, and log why.

1. **Pick 1 target** from the data below. Use a Search Console gap when one fits: improve the existing article if it already targets the intent and ranks 8 to 30 (set `updated`), otherwise write a new one. On a cold start, pick from the keyword tables and backlog. Prefer a narrow question an owner types over a broad head term owned by agencies. Score = volume or impressions × intent. Intent is high when the searcher is an owner with the problem Next5 solves. Never reuse a keyword from the live articles. If you need one more check:
   `gum read googleads.keywordPlanIdeas.generateKeywordIdeas --format raw --args '{"customerId":"8703074080","loginCustomerId":"9979191937","keywords":["<seed>"],"geoTargetConstants":["2840"],"language":"1000"}'`
2. **Research.** Read the current top 5 Google results, note what they all miss, collect People also ask questions, check every platform fact. Health, legal and money facts need a primary source. Write `docs/seo/research/<slug>.md`: query and data, top 5 and what they miss, People also ask, every fact with its source URL.
3. **Write.** Read about 40 lines of one article in the same hub for style. Create `src/content/guides/articles/<camelCaseName>.ts`, add it to `BLOG_POSTS` in `src/content/guides/index.ts`. Link to it from 3 to 5 existing articles where it truly helps. Then check every number, rule, quote and result claim line by line against the notes. A claim with no row in the notes: delete it or turn it into plain advice.
4. **Cover.** Run once:
   `~/.next5-seo/make-cover.sh <slug> "<a small business owner of this trade, doing a real task, in their own place>." "<alt>"`
   No papers or signs in the scene. Open the image once. Regenerate at most once if it is wrong.
   The cover never blocks the article: if the second image is still wrong, run it once more with a scene that has no device and no screen at all (just the person and their hands at the task). If that is still wrong, point `cover` at the image of a live article in the same hub, write a fresh `coverAlt`, and add one PR line: "cover reused, to replace".
5. **Review.** Start one Agent (general-purpose). Give it only: the draft path, the notes path, the 9 checks from the quality bar below, and these limits: read only those 2 files plus the cover, no web, reply in at most 25 lines with pass or fail per check, one reason and any exact replacement line naming its notes row. Then run `npx vitest run tests/content`. Any fail: one rewrite, applying only suggested lines whose facts are in the notes, then one more Agent review and test run. A second fail: do not discard the whole draft. Delete or rewrite only the lines the reviewer failed, replace them with a sourced line from the notes or with plain advice, then run the tests again (they enforce the word floor, so add sourced material if the cuts take it under). Ship it if the tests pass and the remaining text still answers the target query. Discard only when the target itself is unworkable, and then say so in one line and pick a different target in the same run if budget is left.
6. **Publish.**
   ```bash
   git checkout -b seo/<slug> origin/main
   git add -A && git commit -m "seo: <title>"
   git push -u origin seo/<slug>
   gh pr create --base main --title "seo: <title>" --body "<target query, its data, reviewer verdicts>"
   ```
   Never merge. Before the commit, insert one newest-first line in docs/seo/RUN_LOG.md. On a Monday also add the 5-line weekly summary.

Never: more than 1 article, a duplicate intent, name-swapped bulk pages, the Indexing API, edits outside `src/content/guides/`, `docs/seo/`, `public/images/guides/` and `public/images/manifest.json`.

## Token rules (these keep the run cheap)

- Everything you need to start is in this prompt. Do not read DAILY_RUN.md, README.md, AGENT_BRIEF.md, QUALITY_BAR.md or KEYWORD_BACKLOG.md.
- Do not re-run the Search Console or Keyword Planner calls for data given below. One extra Keyword Planner call is fine only when no candidate below fits.
- Never read a whole existing article. Find text with Grep, then Read with offset and limit around that line only.
- Read RUN_LOG.md with limit 8 only, then insert your line.
- Do not re-read a file you just wrote or edited.
- Research budget: 3 WebSearch calls and 7 WebFetch calls, more only for a primary source on a health, legal or money fact. Write findings into the research notes right away.
- Do not run `npx tsc`. The publish script runs its own checks.
- Keep your text between tool calls to one short line.
