#!/usr/bin/env bash
# Vercel "Ignored Build Step" (vercel.json ignoreCommand): exit 0 skips the build, exit 1 builds.
# Skips every preview (branch) build, and a production push whose changes since the last deployed commit touch only files the site does not use: the render worker
# (Railway builds it), tests, docs, Markdown and local scripts. scripts/vercel-build.sh is the build itself, so it builds.
# When the last deployed commit is unknown or not in Vercel's shallow clone, it builds (safe default).
set -uo pipefail

# Branch pushes (preview deployments) never build: changes are tested on localhost, and each PR would otherwise build
# twice (its branch, then main on merge). Only main (production) builds.
if [[ "${VERCEL_ENV:-}" != "production" ]]; then
  echo "[ignore] ${VERCEL_GIT_COMMIT_REF:-branch} is a preview: skipping build"
  exit 0
fi

base="${VERCEL_GIT_PREVIOUS_SHA:-}"
if [[ -z "$base" ]] || ! git cat-file -e "${base}^{commit}" 2>/dev/null; then
  echo "[ignore] no previous deployed commit in the clone: building"
  exit 1
fi

# A redeploy of the deployed commit is deliberate (an env var changed): build.
if [[ "$(git rev-parse "${base}^{commit}")" == "$(git rev-parse HEAD)" ]]; then
  echo "[ignore] redeploy of ${base:0:7}: building"
  exit 1
fi

changed=$(git diff --name-only "$base" HEAD) || exit 1
site=$(printf '%s\n' "$changed" | grep -vE '^(blitz-worker|tests|docs)/|\.md$|^scripts/' | grep -v '^$')
build_script=$(printf '%s\n' "$changed" | grep -xE 'scripts/vercel-(build|ignore)\.sh')

if [[ -z "$site" && -z "$build_script" ]]; then
  echo "[ignore] only worker/tests/docs/scripts changed since ${base:0:7}: skipping build"
  exit 0
fi
echo "[ignore] site files changed since ${base:0:7}: building"
exit 1
