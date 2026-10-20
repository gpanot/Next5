# SEO engine: one useful article a day

Next5 grows organic traffic with an agent that publishes at most 1 genuinely useful article per day,
chosen from real Google data and linked into pages that already rank. It never writes for volume.

The model is Vaultaire's (Rasty Turek): a daily Claude run reads Search Console and Keyword Planner
through [gum](https://gumcli.dev/), finds queries where the site is shown but not clicked, writes one
guide for that exact query, links it from pages with traffic, and repeats the next morning. Google
picks a new page up in 3 to 4 days. Vaultaire has published about 120 guides since March 2026, about
one every two days: few pages, each one strong.

## What we copy from Vaultaire

Read [vaultaire.app/guides](https://vaultaire.app/guides/) once before changing this engine.

| Vaultaire does | Next5 does |
| --- | --- |
| One narrow question per guide, in the searcher's words ("Does CarPlay show your photos?") | Same. Prefer the narrow question over the broad head term |
| The direct answer in the first lines | The `answer` box |
| An image per guide, and the product shown where it solves the problem | A generated cover photo for the same trade or topic, and a short "How Next5 does this" part |
| A sources list on facts that matter ("What this is based on") | A `Sources` section with primary sources |
| 4 or more links to sibling guides inside the body | 3 or more in the body, plus 3 to 5 links in from pages with traffic |
| Scenario pages ("My kid found my private photos") and free tools | Later (see Next steps). Not part of the daily run yet |

## Files

| File | What it is |
| --- | --- |
| [AGENT_BRIEF.md](AGENT_BRIEF.md) | Who we write for, the voice, the hubs, the article format. The agent rereads it every run. |
| [QUALITY_BAR.md](QUALITY_BAR.md) | The publish checklist and the reviewer rubric. |
| [DAILY_RUN.md](DAILY_RUN.md) | The exact instructions for each morning run, step by step, with the gum commands. |
| [KEYWORD_BACKLOG.md](KEYWORD_BACKLOG.md) | Seed topics per hub, to validate with keyword data. Used while Search Console is thin. |
| `research/<slug>.md` | One file per article: query data, top 5 results, People also ask, every fact with its source. The reviewer checks against it. |
| [RUN_LOG.md](RUN_LOG.md) | One line per run: what was targeted, what shipped, what was skipped and why. |

In code:

- `src/content/guides/articles/*.ts`: one typed file per article (no Markdown, the compiler checks it).
- `src/content/guides/qualityBar.ts`: the numbers of the quality bar.
- `tests/content/articles.test.ts`: the publish gate. Red test, no publish.

## One-time setup (owner)

1. **Search Console**: the property is the domain property `sc-domain:giinger.com` (verified). It
   also covers other giinger.com sites, so every query filters to pages that start with
   `https://next5.giinger.com/`. The sitemap `https://next5.giinger.com/sitemap.xml` was submitted on
   2026-10-18 and resubmitted with gum on 2026-10-19. Done.
2. **Google Cloud project**: enable the Search Console API (and the Google Ads API if using Keyword
   Planner), configure the OAuth consent screen with your account as a test user, create a
   Desktop OAuth client.
3. **gum** on the machine that runs the agent:
   ```bash
   # install: see https://gumcli.dev/install.html
   printf '%s' "$GOOGLE_OAUTH_CLIENT_SECRET" | gum auth use-oauth-client --client-id "$GOOGLE_OAUTH_CLIENT_ID" --secret-stdin
   gum login --service searchconsole
   gum doctor        # "BYO OAuth ready" means it works (`gum auth status` checks gcloud ADC, ignore it)
   gum setup --dry-run --target claude --features skills,mcp
   gum setup --target claude --features skills,mcp --yes
   claude mcp add --scope user gum -- gum mcp --stdio   # Claude Code reads ~/.claude.json, not ~/.claude/mcp.json
   ```
   Done on 2026-10-19.
4. **Keyword data**: Keyword Planner through gum, as Vaultaire does. Google Ads manager
   `997-919-1937`, client account `870-307-4080` (Next5), Basic API access on the gum Cloud project
   (15,000 operations a day, free). Google no longer requires a developer token; gum still stores the
   test one. The OAuth app is in production, so logins do not expire after 7 days. Done on 2026-10-20:
   ```bash
   printf '%s' "$GOOGLE_ADS_TEST_TOKEN" | gum auth use-ads-developer-token --stdin
   gum login --service googleads
   ```
   treg (DataForSEO) stays as a fallback.
5. **Schedule the run**: a local launchd job on the owner's Mac, where gum, treg and the keys work
   (set up 2026-10-20). `~/Library/LaunchAgents/com.next5.seo-daily.plist` calls
   `~/.next5-seo/seo-daily.sh` (a copy of [scripts/seo-daily.sh](../../scripts/seo-daily.sh)) every hour
   from 8:00 to 22:00 Saigon time. A marker file per day (`~/.next5-seo/YYYY-MM-DD`: done, skipped,
   started, failed) makes sure only one run happens a day. The run uses its own clone in
   `~/.next5-seo/repo`, reset to `origin/main`, because macOS blocks background jobs in `~/Documents`.
   It runs Claude Code headless with the allowed tools listed in the script and opens at most one PR.
   ```bash
   cp scripts/seo-daily.sh ~/.next5-seo/seo-daily.sh        # after every edit of the script
   SEO_DAILY_CHECK=1 zsh ~/.next5-seo/seo-daily.sh          # tool check, changes nothing
   tail -50 ~/.next5-seo/logs/$(TZ=Asia/Ho_Chi_Minh date +%F).log
   launchctl print gui/$(id -u)/com.next5.seo-daily         # status
   launchctl bootout gui/$(id -u)/com.next5.seo-daily       # stop
   ```
6. **Review**: for the first 4 weeks, read and merge each PR yourself (2 minutes). After 20
   articles in a row pass review without edits, let the run merge its own PRs when CI is green.

## Decisions to make before more articles

- **Domain.** `next5.giinger.com` is final (confirmed 2026-10-20). All authority builds on it.
  Never move the articles.

## Next steps (not in the daily run yet)

- Hub pages for `realtors` and `tiktok-shop` (for example `/guides/realtors`) once each hub has 5
  articles. A hub page with 1 or 2 articles is thin.
- Scenario pages: one owner situation per page ("My TikTok gets 200 views", "I have no time to post").
- Free tools: a hook generator, a calendar template.

## Measuring

- Search Console: impressions, clicks, CTR, position per article.
- Vercel Analytics custom event `site_form_submit` with `source` = `blog/<slug>` or
  `guide/<slug>`: how many readers of each article started a sign-up.
- RUN_LOG.md: share of drafts that passed review on the first try (quality health).
