#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
if [[ -n "$(git status --porcelain)" ]]; then
  printf '%s\n' 'Refusing to sync a dirty working tree.' >&2
  exit 1
fi
git fetch https://github.com/Stardm0/MoonTV.git main
upstream="$(git rev-parse FETCH_HEAD)"
base="$(git rev-parse HEAD)"
if git merge-base --is-ancestor "$upstream" HEAD; then
  printf '%s\n' 'Already contains the latest Stardm0 commit.'
  if [[ -n "${GITHUB_OUTPUT:-}" ]]; then printf 'changed=false\n' >> "$GITHUB_OUTPUT"; fi
  exit 0
fi
branch="codex/stardm0-sync-${upstream:0:12}-${base:0:7}"
git switch -c "$branch"
protected=()
while IFS= read -r file; do protected+=("$file"); done < <(node -e 'const b=require("./customization-baseline.json"); console.log([...Object.keys(b.protectedFiles), ...b.protectedSyncFiles].join("\n"))')
merge_status=0
git merge --no-commit --no-ff "$upstream" || merge_status=$?
# These files belong to this site; only application code follows upstream.
git restore --source="$base" --staged --worktree -- "${protected[@]}"
conflicts="$(git diff --name-only --diff-filter=U)"
if [[ -n "$conflicts" ]]; then
  printf 'Manual resolution required; production was not changed:\n%s\n' "$conflicts" >&2
  exit 1
fi
if [[ "$merge_status" -ne 0 ]] && ! git rev-parse --verify MERGE_HEAD >/dev/null 2>&1; then
  printf '%s\n' 'Upstream merge failed before a merge commit could be prepared.' >&2
  exit 1
fi
node scripts/check-customizations.cjs
git commit -m "chore: sync Stardm0 ${upstream:0:12} preserving site customizations"
if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  printf 'changed=true\nbranch=%s\nupstream=%s\n' "$branch" "$upstream" >> "$GITHUB_OUTPUT"
fi
printf 'Prepared %s. Run tests and a preview build before merging into main.\n' "$branch"
