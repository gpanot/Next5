#!/usr/bin/env bash
# One-time production launch of Next5 Brand + Shop (P11.6).
# Run from next5-landing:  bash scripts/launch-business.sh
# Asks before every step that changes production. Production env is pulled to a temp dir and deleted on exit.
set -euo pipefail

bold() { printf '\n\033[1m%s\033[0m\n' "$1"; }
confirm() { read -r -p "$1 [y/N] " answer; [[ "$answer" == "y" || "$answer" == "Y" ]]; }

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

bold "1/6 Pull production environment (temporary)"
vercel env pull "$TMP/prod.env" --environment=production --yes >/dev/null
set -a
# shellcheck disable=SC1091
. "$TMP/prod.env"
set +a
PRISMA_URL="$DATABASE_URL"
DBMATE_URL="${DATABASE_URL%%\?*}?sslmode=require"   # dbmate ignores Prisma's pool params
echo "Database host: $(echo "$DATABASE_URL" | sed -E 's#.*@([^/]+)/.*#\1#')"

bold "2/6 Database migrations"
npx dbmate --url "$DBMATE_URL" --migrations-dir db/migrations status
if confirm "Apply pending migrations (additive: new business tables only)?"; then
  npx dbmate --url "$DBMATE_URL" --migrations-dir db/migrations --no-dump-schema up
fi

bold "3/6 Seed catalog (set templates, themes, Studio models → R2). Idempotent."
if confirm "Seed the production catalog?"; then
  DATABASE_URL="$PRISMA_URL" NEXT5_STORAGE=r2 NODE_ENV=production npx tsx scripts/seed-business.ts
fi

set_env() { # name value — replaces the production value
  vercel env rm "$1" production --yes >/dev/null 2>&1 || true
  printf '%s' "$2" | vercel env add "$1" production >/dev/null
  echo "  set $1"
}

bold "4/6 Business environment variables"
if confirm "Set VND_PER_USD, NEXT5_STORAGE, GENERATION_MAX_CONCURRENT, NEXT5_MOCK_PAYMENTS=false, CRON_SECRET, WAVESPEED_WEBHOOK_SECRET?"; then
  set_env VND_PER_USD 26000
  set_env NEXT5_STORAGE r2
  set_env GENERATION_MAX_CONCURRENT 6
  set_env NEXT5_MOCK_PAYMENTS false
  [[ -n "${CRON_SECRET:-}" ]] && echo "  CRON_SECRET already set — kept" || set_env CRON_SECRET "$(openssl rand -hex 32)"
  if [[ -z "${WAVESPEED_WEBHOOK_SECRET:-}" ]]; then
    # Business generation is webhook-driven (no cron): WaveSpeed signs callbacks with this account secret.
    ws_secret=$(curl -fsS -H "Authorization: Bearer $WAVESPEED_API_KEY" https://api.wavespeed.ai/api/v3/webhook/secret \
      | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);const d=j.data??j;const v=typeof d==="string"?d:(d.secret??d.webhook_secret??"");process.stdout.write(v)})')
    if [[ "$ws_secret" == whsec_* ]]; then set_env WAVESPEED_WEBHOOK_SECRET "$ws_secret"; else echo "  Could not read the WaveSpeed webhook secret — set WAVESPEED_WEBHOOK_SECRET by hand (wavespeed.ai → API keys → Webhook secret)."; fi
  else
    echo "  WAVESPEED_WEBHOOK_SECRET already set — kept"
  fi
  [[ "${NEXT_PUBLIC_APP_URL:-}" == https://* ]] || echo "  WARNING: NEXT_PUBLIC_APP_URL must be the public https URL, or WaveSpeed webhooks are not attached."
  read -r -p "Email that receives early-access request alerts (blank to skip): " admin_email
  [[ -n "$admin_email" ]] && set_env NEXT5_ADMIN_EMAIL "$admin_email"
fi

bold "5/6 Launch flag"
if confirm "Set NEXT5_BUSINESS_ENABLED=true (/ becomes the business home on the next deploy)?"; then
  set_env NEXT5_BUSINESS_ENABLED true
fi

bold "6/6 Deploy"
if confirm "Deploy to production now (vercel --prod)?"; then
  vercel --prod
fi

bold "Done."
echo "Rollback: vercel env rm NEXT5_BUSINESS_ENABLED production --yes && vercel --prod   (/ falls back to the consumer home)"
echo "Then enable Web Analytics once: vercel.com → next5 → Analytics → Enable."
