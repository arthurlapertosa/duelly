#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  scripts/harness/close-worktree.sh --path ../worktrees/repo-task-slug [--delete-branch]

Removes a git worktree after QA/HITL approval. The caller is responsible for ensuring the PR is approved/closed.
USAGE
}

PATH_TO_REMOVE=""
DELETE_BRANCH=0
DRY_RUN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --path) PATH_TO_REMOVE="${2:-}"; shift 2 ;;
    --delete-branch) DELETE_BRANCH=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    --help|-h) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage; exit 2 ;;
  esac
done

if [[ -z "$PATH_TO_REMOVE" ]]; then
  echo "Missing --path" >&2
  usage
  exit 2
fi

if [[ ! -d "$PATH_TO_REMOVE/.git" && ! -f "$PATH_TO_REMOVE/.git" ]]; then
  echo "Not a git worktree path: $PATH_TO_REMOVE" >&2
  exit 1
fi

BRANCH="$(git -C "$PATH_TO_REMOVE" branch --show-current)"
if [[ -z "$BRANCH" ]]; then
  echo "Could not detect branch in worktree." >&2
  exit 1
fi

if [[ $DRY_RUN -eq 1 ]]; then
  cat <<EOF
{
  "path": "$PATH_TO_REMOVE",
  "branch": "$BRANCH",
  "deleteBranch": $DELETE_BRANCH
}
EOF
  exit 0
fi

git worktree remove "$PATH_TO_REMOVE"
if [[ $DELETE_BRANCH -eq 1 ]]; then
  git branch --delete "$BRANCH"
fi
