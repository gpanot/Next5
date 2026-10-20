#!/bin/zsh
# Daily SEO run: one headless Claude Code run that follows docs/seo/DAILY_RUN.md and opens at most one PR.
# launchd (~/Library/LaunchAgents/com.next5.seo-daily.plist) calls it every hour from 8:00 to 22:00; a
# marker file per Saigon day makes sure only one run happens. The run uses its own clone in
# ~/.next5-seo/repo (outside ~/Documents, which macOS blocks for background jobs), reset to origin/main,
# so the main checkout and its uncommitted work are never touched. launchd runs the copy at
# ~/.next5-seo/seo-daily.sh: after editing this file, copy it there.
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
LOG="$LOG_DIR/$TODAY.log"
STALE_SECONDS=7200
MAX_ATTEMPTS=3
mkdir -p "$LOG_DIR"

log() { print -r -- "[$(TZ=Asia/Ho_Chi_Minh date '+%F %T')] $*" >> "$LOG"; }

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
