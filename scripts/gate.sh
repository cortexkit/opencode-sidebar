#!/usr/bin/env bash
set -euo pipefail

step=arguments
commit=unknown
# macOS Bash 3.2 can abort an unset array expansion with status zero. Only an
# explicitly completed gate may report success, even when the shell exits zero.
finished=
finish() {
  local result=$?
  trap - EXIT
  if [[ $result -eq 0 && -z $finished ]]; then result=1; fi
  if [[ $result -eq 0 ]]; then
    printf 'GATE_OK %s\n' "$commit"
  else
    printf 'GATE_FAILED %s\n' "$step"
  fi
  exit "$result"
}
trap finish EXIT
if [[ $# -gt 1 || ( $# -eq 1 && $1 != --fast ) ]]; then
  printf 'Usage: scripts/gate.sh [--fast]\n' >&2
  exit 2
fi
fast=${1:-}
step=checkout
cd "$(dirname "${BASH_SOURCE[0]}")/.."
commit=$(git rev-parse HEAD)
run_step() {
  step=$1
  shift
  printf '\n== %s ==\n' "$step"
  "$@"
}
ignored_files() {
  local tracked
  tracked=$(git ls-files -ci --exclude-standard -- .cortexkit)
  test -z "$tracked" || { printf '%s\n' "$tracked"; return 1; }
}
export NO_COLOR=1
run_step frozen-lockfile bun install --frozen-lockfile
run_step build bun run build
run_step types bun run types
run_step lint bun run lint
run_step format bun run format:check
run_step ignored-cortexkit ignored_files
if [[ $fast == --fast ]]; then finished=1; exit 0; fi
run_step tests bun test
run_step peer-floor bun run check:floor
run_step opentui-0511 bun run check:opentui-0511
finished=1
