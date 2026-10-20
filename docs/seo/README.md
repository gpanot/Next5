# SEO engine: one useful article a day

Next5 grows organic traffic with an agent that publishes 1 or 2 genuinely useful articles per day,
each chosen from real Google data and linked into pages that already rank. It never writes for volume.

The model is Vaultaire's (Rasty Turek): a daily Claude run reads Search Console through
[gum](https://gumcli.dev/), finds queries where the site is shown but not clicked, writes one guide
for that exact query, links it from pages with traffic, and repeats the next morning.

## Files

| File | What it is |
| --- | --- |
| [AGENT_BRIEF.md](AGENT_BRIEF.md) | Who we write for, the voice, the hubs, the article format. The agent rereads it every run. |
| [QUALITY_BAR.md](QUALITY_BAR.md) | The publish checklist and the reviewer rubric. |
| [DAILY_RUN.md](DAILY_RUN.md) | The exact instructions for each morning run, step by step, with the gum commands. |
| [KEYWORD_BACKLOG.md](KEYWORD_BACKLOG.md) | Seed topics per hub, to validate with keyword data. Used while Search Console is thin. |
| [RUN_LOG.md](RUN_LOG.md) | One line per run: what was targeted, what shipped, what was skipped and why. |

In code:

- `src/content/guides/articles/*.ts`: one typed file per article (no Markdown, the compiler checks it).
- `src/content/guides/qualityBar.ts`: the numbers of the quality bar.
- `tests/content/articles.test.ts`: the publish gate. Red test, no publish.

## One-time setup (owner)

1. **Search Console**: verify `https://next5.giinger.com/` as a URL-prefix property and submit
   `https://next5.giinger.com/sitemap.xml`. Data starts collecting from that day.
2. **Google Cloud project**: enable the Search Console API (and the Google Ads API if using Keyword
   Planner), configure the OAuth consent screen with your account as a test user, create a
   Desktop OAuth client.
3. **gum** on the machine that runs the agent:
   ```bash
   # install: see https://gumcli.dev/install.html
   printf '%s' "$GOOGLE_OAUTH_CLIENT_SECRET" | gum auth use-oauth-client --client-id "$GOOGLE_OAUTH_CLIENT_ID" --secret-stdin
   gum login --service searchconsole
   gum auth status --scopes webmasters,webmasters.readonly
   gum setup --dry-run && gum setup --target claude --features skills,mcp --yes
   ```
4. **Keyword data** (optional at first): keep using treg as today, or add Google Ads
   Keyword Planner through gum (`gum login --service googleads`, needs a developer token,
   which can take days to approve).
5. **Schedule the run**: a daily scheduled Claude task, in this repo, whose prompt is
   "Follow docs/seo/DAILY_RUN.md". It opens a pull request per article.
6. **Review**: for the first 4 weeks, read and merge each PR yourself (2 minutes). After 20
   articles in a row pass review without edits, let the run merge its own PRs when CI is green.

## Measuring

- Search Console: impressions, clicks, CTR, position per article.
- Vercel Analytics custom event `site_form_submit` with `source` = `blog/<slug>` or
  `guide/<slug>`: how many readers of each article started a sign-up.
- RUN_LOG.md: share of drafts that passed review on the first try (quality health).
