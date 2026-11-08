#!/usr/bin/env bash
set -euo pipefail

# Reject unknown options before any repository or network operation. A misspelled
# preview flag must never fall through to the commit/tag/push path.
if [[ $# -lt 1 || $# -gt 2 || ( $# -eq 2 && $2 != --dry ) ]]; then
  echo 'Usage: scripts/release.sh <version> [--dry]; the only option is --dry' >&2
  exit 1
fi
version=$1
dry=${2:-}
cd "$(dirname "${BASH_SOURCE[0]}")/.."
node scripts/version.mjs "$version" --validate
if [[ -n "$(git status --porcelain)" ]]; then
  echo 'Error: working tree is not clean; commit or restore changes first.' >&2
  exit 1
fi
if [[ $(git branch --show-current) != main ]]; then
  echo 'Error: releases require the main branch.' >&2
  exit 1
fi
git fetch origin main --tags
head=$(git rev-parse HEAD)
if [[ $head != "$(git rev-parse refs/remotes/origin/main)" ]]; then
  echo 'Error: main is not in sync with origin/main.' >&2
  exit 1
fi
tag="v$version"
if git show-ref --verify --quiet "refs/tags/$tag"; then
  echo "Error: tag '$tag' already exists." >&2
  exit 1
fi
GITHUB_REPOSITORY=cortexkit/opencode-sidebar TARGET_SHA="$head" node scripts/verify-ci.mjs
node scripts/version.mjs "$version"
bun install --lockfile-only
scripts/gate.sh --fast
if [[ $dry == --dry ]]; then
  git diff --stat
  echo "[DRY] Would commit release: $tag, tag $tag, and push main and $tag to origin."
  echo '[DRY] Version edits remain in the working tree; no commit, tag or push was made.'
  exit 0
fi
git add -- package.json bun.lock
if git diff --cached --quiet; then
  echo 'Error: no version changes to commit.' >&2
  exit 1
fi
git commit -m "release: $tag"
git tag -a "$tag" -m "Release $tag"
# Push both refs together so a rejected main push cannot publish a stray tag.
git push --atomic origin main "refs/tags/$tag"
echo "Released $tag; watch https://github.com/cortexkit/opencode-sidebar/actions"
