#!/usr/bin/env bash
set -euo pipefail

usage() {
  printf 'Usage: %s <agent-name> <task-slug>\n' "$0" >&2
  printf 'Example: %s agent-a homepage-cms\n' "$0" >&2
}

if [ "$#" -ne 2 ]; then
  usage
  exit 2
fi

agent_raw="$1"
task_raw="$2"

sanitize() {
  printf '%s' "$1" \
    | tr '[:upper:]' '[:lower:]' \
    | sed -E 's/[^a-z0-9._-]+/-/g; s/^-+//; s/-+$//'
}

agent="$(sanitize "$agent_raw")"
task="$(sanitize "$task_raw")"

if [ -z "$agent" ] || [ -z "$task" ]; then
  usage
  exit 2
fi

repo_root="$(git rev-parse --show-toplevel)"
repo_name="$(basename "$repo_root")"
workspace_root="$(dirname "$repo_root")"
timestamp="$(date -u +%Y%m%d%H%M%S)"
branch="agent/${agent}/${timestamp}-${task}"
worktree_parent="${AGENT_WORKTREE_ROOT:-"${workspace_root}/${repo_name}-worktrees"}"
worktree_path="${worktree_parent}/${agent}-${task}-${timestamp}"

cd "$repo_root"

current_branch="$(git branch --show-current)"
if [ "$current_branch" != "dev" ]; then
  printf 'Canonical clone must be on dev, currently on %s\n' "$current_branch" >&2
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  printf 'Canonical clone has local changes. Commit/stash them before creating worktrees.\n' >&2
  exit 1
fi

git fetch origin dev
git merge --ff-only origin/dev
mkdir -p "$worktree_parent"
git worktree add -b "$branch" "$worktree_path" dev

printf 'Created worktree:\n'
printf '  path:   %s\n' "$worktree_path"
printf '  branch: %s\n' "$branch"
printf '\nNext:\n'
printf '  cd %s\n' "$worktree_path"
printf '  python3 undersight-serve.py\n'
