#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  scripts/harness/new-task-worktree.sh --task "short description" [--base main] [--root ../worktrees]
  scripts/harness/new-task-worktree.sh --help

Creates a dedicated git worktree and branch for one task.
USAGE
}

TASK=""
BASE="${DEFAULT_BASE_BRANCH:-main}"
ROOT_DIR="${WORKTREE_ROOT:-../worktrees}"
DRY_RUN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --task) TASK="${2:-}"; shift 2 ;;
    --base) BASE="${2:-}"; shift 2 ;;
    --root) ROOT_DIR="${2:-}"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    --help|-h) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage; exit 2 ;;
  esac
done

if [[ -z "$TASK" ]]; then
  echo "Missing --task" >&2
  usage
  exit 2
fi

if ! git rev-parse --show-toplevel >/dev/null 2>&1; then
  echo "This script must run inside a git repository." >&2
  exit 1
fi

REPO_ROOT="$(git rev-parse --show-toplevel)"
REPO_NAME="$(basename "$REPO_ROOT")"
SLUG="$(printf '%s' "$TASK" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//' | cut -c1-72)"
if [[ -z "$SLUG" ]]; then
  echo "Could not derive a safe slug from task: $TASK" >&2
  exit 1
fi

BRANCH="task/$SLUG"
WORKTREE_PATH="$ROOT_DIR/$REPO_NAME-$SLUG"

if [[ $DRY_RUN -eq 1 ]]; then
  cat <<EOF
{
  "repoRoot": "$REPO_ROOT",
  "base": "$BASE",
  "branch": "$BRANCH",
  "worktreePath": "$WORKTREE_PATH"
}
EOF
  exit 0
fi

mkdir -p "$ROOT_DIR"
cd "$REPO_ROOT"

git fetch --all --prune >/dev/null 2>&1 || true

if git rev-parse --verify "$BRANCH" >/dev/null 2>&1; then
  echo "Branch already exists: $BRANCH" >&2
  exit 1
fi

if [[ -e "$WORKTREE_PATH" ]]; then
  echo "Worktree path already exists: $WORKTREE_PATH" >&2
  exit 1
fi

git worktree add -b "$BRANCH" "$WORKTREE_PATH" "$BASE"

cat <<EOF
Created worktree:
  branch: $BRANCH
  path:   $WORKTREE_PATH

Next:
  cd "$WORKTREE_PATH"
  npm run qa
EOF
