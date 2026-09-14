#!/usr/bin/env bash
# Vercel build: Prisma client, then (production only) database migrations, then Next.js.
# Migrations run before the new code goes live; if one fails the build fails and the current deployment stays up.
set -euo pipefail

npx prisma generate

if [[ "${VERCEL_ENV:-}" == "production" && -n "${DATABASE_URL:-}" ]]; then
  base="${DATABASE_URL%%\?*}"
  query=""
  [[ "$DATABASE_URL" == *\?* ]] && query="${DATABASE_URL#*\?}"
  # Drop Prisma-only pool params; default to TLS unless the URL says otherwise.
  query=$(printf '%s' "$query" | tr '&' '\n' | grep -vE '^(connection_limit|pool_timeout|pgbouncer)=' | paste -sd '&' - || true)
  [[ "$query" == *sslmode=* ]] || query="${query:+$query&}sslmode=require"
  echo "[build] applying database migrations"
  npx dbmate --url "$base?$query" --migrations-dir db/migrations --no-dump-schema --wait --wait-timeout 30s up
fi

npx next build
