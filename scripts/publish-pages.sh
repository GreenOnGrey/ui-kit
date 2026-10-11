#!/usr/bin/env bash
# Puts dist-showcase into /vX.Y.Z/ of the gh-pages branch. Folders of earlier
# versions are never touched (arch §6); the root shows the highest version.
#   scripts/publish-pages.sh <version>
set -euo pipefail
version=${1:?version}
src=$PWD/dist-showcase
[[ -f $src/index.html && -f $src/styles.css ]] || { echo "dist-showcase is not built"; exit 1; }
work=$(mktemp -d)
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
if git ls-remote --exit-code --heads origin gh-pages >/dev/null; then
  git worktree add "$work" origin/gh-pages --detach
else
  git worktree add --detach "$work"
  git -C "$work" checkout --orphan gh-pages
  git -C "$work" rm -rfq .
fi
[[ ! -e $work/v$version ]] || { echo "::error::/v$version/ is already published and is immutable"; exit 1; }
mkdir "$work/v$version"
cp -r "$src"/. "$work/v$version/"
touch "$work/.nojekyll"
highest=$(cd "$work" && ls -d v*/ | tr -d 'v/' | sort -V | tail -1)
if [[ $highest == "$version" ]]; then
  find "$work" -mindepth 1 -maxdepth 1 ! -name '.git' ! -name 'v*' ! -name '.nojekyll' -exec rm -rf {} +
  cp -r "$src"/. "$work/"
fi
git -C "$work" add -A
git -C "$work" commit -qm "Витрина $version"
git -C "$work" push origin HEAD:gh-pages
