#!/usr/bin/env bash
# R24: a changed snapshot of the showcase is a visible change of the kit. It must
# come with an entry in CHANGELOG.md and a version not lower than the next minor.
#   scripts/visible-change.sh <base commit>
set -euo pipefail
base=${1:?base commit}
if ! git diff --name-only "$base"...HEAD | grep -q '^e2e/__screenshots__/'; then
  echo "Снимки витрины не менялись."
  exit 0
fi
fail=0
if ! git diff --name-only "$base"...HEAD | grep -qx 'CHANGELOG.md'; then
  echo "::error::Снимки витрины изменились, а в CHANGELOG.md нет записи."
  fail=1
fi
ver() { git show "$1:package.json" 2>/dev/null | sed -n 's/.*"version": *"\([0-9]*\)\.\([0-9]*\)\..*/\1 \2/p' | head -1; }
read -r bmaj bmin <<<"$(ver "$base")"
read -r hmaj hmin <<<"$(ver HEAD)"
if [[ -n ${bmaj:-} ]] && ! { ((hmaj > bmaj)) || { ((hmaj == bmaj)) && ((hmin > bmin)); }; }; then
  echo "::error::Снимки витрины изменились: версия должна вырасти не меньше чем на minor (было $bmaj.$bmin, стало $hmaj.$hmin)."
  fail=1
fi
exit $fail
