#!/bin/zsh
# Daily SEO run: one headless Claude Code run that follows docs/seo/DAILY_RUN.md and opens at most one PR.
# launchd (~/Library/LaunchAgents/com.next5.seo-daily.plist) calls it every hour from 8:00 to 22:00; a
# marker file per Saigon day makes sure only one run happens. The run uses its own clone in
# ~/.next5-seo/repo (outside ~/Documents, which macOS blocks for background jobs), reset to origin/main,
# so the main checkout and its uncommitted work are never touched. launchd runs the copy at
# ~/.next5-seo/seo-daily.sh: after editing this file, copy it there.
#
# Auto-publish (owner's choice 2026-10-21): when the run ships a PR that only touches article paths, this
# script runs the content tests, merges it, checks the live page and the sitemap, and resubmits the sitemap.
# At the end it emails the owner a report (one line per step, ok or failed) with a copy of the article
# (scripts/seo-email.ts). Skipped runs and the last failed attempt get a report too. Any PR that touches
# other files is left open. The email needs SENDING_KEY and SEO_EMAIL_TO in ~/.next5-seo/secrets.env.
#
# Marker ~/.next5-seo/YYYY-MM-DD, first word:
#   done | skipped  -> nothing more today
#   started         -> a run is in progress; retried only when it is older than 2 hours
#   failed          -> retried next hour, at most 3 attempts a day
# SEO_DAILY_CHECK=1 runs a tool check instead of the daily run (changes nothing, writes no marker).
set -uo pipefail

export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$HOME/.local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"
STATE_DIR="$HOME/.next5-seo"
LOG_DIR="$STATE_DIR/logs"
REPO="$STATE_DIR/repo"
TODAY="$(TZ=Asia/Ho_Chi_Minh date +%F)"
MARKER="$STATE_DIR/$TODAY"
ATTEMPTS="$STATE_DIR/$TODAY.attempts"
REPORT="$STATE_DIR/$TODAY.report"
LOG="$LOG_DIR/$TODAY.log"
STALE_SECONDS=7200
MAX_ATTEMPTS=3
mkdir -p "$LOG_DIR"

log() { print -r -- "[$(TZ=Asia/Ho_Chi_Minh date '+%F %T')] $*" >> "$LOG"; }

SITE="https://next5.giinger.com"
ARTICLE_PATHS='^(src/content/guides/|docs/seo/|public/images/guides/|public/images/manifest\.json$)'

# Polls the article URL until it answers 200, up to 20 minutes (the Vercel deploy after the merge).
wait_live() {
  local i
  for i in {1..40}; do
    [[ "$(curl -s -o /dev/null -w '%{http_code}' "$1")" == 200 ]] && return 0
    sleep 30
  done
  return 1
}

# One report line per step, "ok|fail|skip<TAB>label", emailed at the end by send_report.
check() {
  print -r -- "$1	$2" >> "$REPORT"
  log "$1: $2"
  [[ "$1" == ok ]]
}

# Emails the report, with a copy of the article when there is one. A Mac notification if the email fails.
# The email script runs from the ~/.next5-seo copy, like this file, so it works before it reaches main.
# IPv4 first: Node timed out reaching Maileroo over IPv6 on the Mac (2026-10-21).
send_report() {
  cp "$STATE_DIR/seo-email.ts" scripts/seo-email.ts \
    && ( set -a; source "$STATE_DIR/secrets.env"
         NODE_OPTIONS=--dns-result-order=ipv4first npx tsx scripts/seo-email.ts "$TODAY" "$REPORT" "$@" ) >> "$LOG" 2>&1 \
    || { log "email failed"; osascript -e 'display notification "Report email failed, see the log" with title "Next5 SEO run"'; }
}

# Checks, merges and verifies an article PR, step by step, then emails the report.
# The article is read from the PR branch (pull/<n>/head), which stays fetchable after the merge.
publish_article() {
  local pr_url="$1" slug
  slug="$(gh pr view "$pr_url" --json headRefName -q .headRefName)"; slug="${slug#seo/}"
  check ok "Article written and PR opened: $pr_url"
  publish_steps "$pr_url" "$slug"
  send_report "$slug" "$pr_url"
}

publish_steps() {
  local pr_url="$1" slug="$2" page="$SITE/blog/$2"
  git fetch -q origin "pull/${pr_url##*/}/head" && git checkout -q --detach FETCH_HEAD \
    || { check fail "Could not fetch the PR branch"; return 1; }
  if gh pr view "$pr_url" --json files -q '.files[].path' | grep -qvE "$ARTICLE_PATHS"; then
    check fail "PR touches files outside the article folders: left open for your review"; return 1
  fi
  check ok "Only article files changed"
  npx vitest run tests/content >> "$LOG" 2>&1 || { check fail "Content tests failed: not published"; return 1; }
  check ok "Content tests pass"
  gh pr merge "$pr_url" --squash >> "$LOG" 2>&1 || { check fail "Merge failed: not published"; return 1; }
  check ok "PR merged"
  wait_live "$page" || { check fail "Page not live after 20 minutes: check the Vercel deploy"; return 1; }
  check ok "Page live: $page"
  curl -s "$SITE/sitemap.xml" | grep -q "/blog/$slug<" && check ok "Page listed in sitemap.xml" \
    || check fail "Page missing from sitemap.xml"
  gum write searchconsole.sitemaps.submit --allow-write \
    --args "{\"siteUrl\":\"sc-domain:giinger.com\",\"feedpath\":\"$SITE/sitemap.xml\"}" >> "$LOG" 2>&1 \
    && check ok "Sitemap resubmitted to Google Search Console" || check fail "Sitemap resubmit to Google failed"
  gh api -X DELETE "repos/{owner}/{repo}/git/refs/heads/seo/$slug" >> "$LOG" 2>&1 \
    && check ok "PR branch deleted" || check fail "PR branch not deleted"
}

ALLOWED_TOOLS=(
  Read Edit Write Glob Grep WebFetch WebSearch Agent Skill
  "mcp__treg__catalog_search" "mcp__treg__catalog_get" "mcp__treg__call" "mcp__treg__review"
  "Bash(git:*)" "Bash(gh pr create:*)" "Bash(gh pr view:*)" "Bash(gh pr list:*)" "Bash(gh auth status:*)"
  "Bash(gum:*)" "Bash($HOME/.local/bin/gum:*)" "mcp__gum__*" "Bash(npx vitest:*)" "Bash(npx tsc:*)" "Bash(node:*)" "Bash(python3:*)"
  "Bash(ls:*)" "Bash(cat:*)" "Bash(head:*)" "Bash(tail:*)" "Bash(grep:*)" "Bash(wc:*)" "Bash(mkdir:*)"
  "Bash(cp:*)" "Bash(mv:*)" "Bash(date:*)" "Bash(curl -s:*)" "Bash(jq:*)"
)
run_claude() {
  claude -p "$1" \
    --permission-mode acceptEdits \
    --add-dir "$HOME/.claude/skills" \
    --allowedTools "${ALLOWED_TOOLS[@]}" \
    --output-format text >> "$LOG" 2>&1
}

if [[ "${SEO_DAILY_CHECK:-0}" == 1 ]]; then
  log "tool check start"
  cd "$REPO" || { log "repo missing: $REPO"; exit 1; }
  run_claude "Tool check for the daily SEO run. Change nothing, commit nothing. Run: gum doctor; gum read searchconsole.sites.list --output json --args '{}'; gh auth status; npx vitest run tests/content; call mcp__treg__catalog_search with query 'keyword search volume'. Then print one line per check: OK or FAIL with the reason."
  log "tool check end (exit $?)"
  exit 0
fi

# SEO_PUBLISH_PR=<pr url> publishes and emails one PR by hand (for a run that shipped before auto-publish).
if [[ -n "${SEO_PUBLISH_PR:-}" ]]; then
  cd "$REPO" || exit 1
  : > "$REPORT"
  publish_article "$SEO_PUBLISH_PR"
  exit 0
fi

state="" ; started_at=0
if [[ -f "$MARKER" ]]; then
  read -r state started_at < "$MARKER"
fi
case "$state" in
  done|skipped) exit 0 ;;
  started)
    (( $(date +%s) - ${started_at:-0} < STALE_SECONDS )) && exit 0
    log "previous run started at $started_at looks stuck, retrying" ;;
esac

attempts=$(( $(cat "$ATTEMPTS" 2>/dev/null || echo 0) + 1 ))
if (( attempts > MAX_ATTEMPTS )); then
  [[ "$state" == "failed" ]] && { print "skipped $(date +%s) max-attempts" > "$MARKER"; log "gave up after $MAX_ATTEMPTS attempts"; }
  exit 0
fi
print "$attempts" > "$ATTEMPTS"
print "started $(date +%s)" > "$MARKER"
log "run start (attempt $attempts)"

cd "$REPO" || { log "repo missing: $REPO"; print "failed $(date +%s)" > "$MARKER"; exit 1; }
git fetch -q origin && git checkout -q --detach origin/main && git reset -q --hard origin/main \
  && git clean -fdq -e node_modules -e .env.local || { log "git refresh failed"; print "failed $(date +%s)" > "$MARKER"; exit 1; }

run_claude "Today is $TODAY. Follow docs/seo/DAILY_RUN.md. Ship at most 1 article as a PR. Never merge. Log the run in RUN_LOG.md. End your reply with exactly one last line: 'RESULT: shipped <PR url>' if you opened an article PR, or 'RESULT: skipped <one-line reason>' if you shipped no article."
code=$?

result="$(grep -E '^RESULT: (shipped|skipped)' "$LOG" | tail -1)"
if (( code == 0 )) && [[ "$result" == "RESULT: shipped"* ]]; then
  print "done $(date +%s)" > "$MARKER"
elif (( code == 0 )) && [[ "$result" == "RESULT: skipped"* ]]; then
  print "skipped $(date +%s)" > "$MARKER"
else
  print "failed $(date +%s)" > "$MARKER"
fi
log "run end (exit $code) -> $(cut -d' ' -f1 "$MARKER") ${result:-no RESULT line}"

# The marker already says done, so a failed publish is never retried as a second article.
# A skipped run and the last failed attempt also send a report, so a quiet day never hides a bug.
: > "$REPORT"
case "$(cut -d' ' -f1 "$MARKER")" in
  done) publish_article "${result#RESULT: shipped }" ;;
  skipped) check skip "No article today: ${result#RESULT: skipped }"; send_report ;;
  failed) (( attempts == MAX_ATTEMPTS )) && { check fail "Run failed $MAX_ATTEMPTS times (exit $code), no article today"; send_report; } ;;
esac
