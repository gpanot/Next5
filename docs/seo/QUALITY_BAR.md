# Quality bar

At most 2 articles a day. An article that fails this bar does not ship. Skipping a day is fine;
publishing a weak page is not, because Google judges the whole site by its weakest pages.

## Checked by the test (`npm test -- tests/content`)

For every article published from `QUALITY_BAR_SINCE` (`src/content/guides/qualityBar.ts`):

- Has an `answer` of 400 characters or less.
- 800 to 1,800 words.
- Links to at least 3 other articles, and at least 1 existing article links to it.
- At least 5 FAQ answers.
- No banned filler phrases, no em dashes.
- Unique keyword, search-sized title and description, real cover, a CTA, no broken links.

## Checked by the reviewer (a separate pass that did not write the draft)

Score each line pass or fail. Any fail means one rewrite; a second fail means skip the day.

| # | Check | Fails when |
| --- | --- | --- |
| 1 | Answers the search | The `answer` does not directly reply to the keyword |
| 2 | Useful without Next5 | A reader could not act on it without signing up |
| 3 | Better than the top 5 results | It says nothing the current top results do not already say |
| 4 | Specific | Advice is generic ("post consistently", "know your audience") with no example or number |
| 5 | True | Any number, quote or claim without a real source or Next5 data |
| 6 | One reader | It tries to talk to every business at once instead of the one in the keyword |
| 7 | Not a duplicate | Another article already serves the same intent (improve that one instead) |
| 8 | Reads like a person | Repetitive structure, padded sections, list for the sake of a list |

The reviewer writes its verdict in the PR description: each check with pass or fail and one line why.

## Signs the loop is drifting

- First-try pass rate in RUN_LOG.md drops below 70%.
- New articles start to look alike (same opening, same section names).
- Articles get indexed but stay below position 30 after 6 weeks.

When any of these shows up, stop publishing new articles for a week and improve existing ones.
