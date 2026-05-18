#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  scripts/harness/commit-granular.sh --message "type(scope): description"

Commits staged changes only. The script refuses empty staged diffs and weak messages.
USAGE
}

MESSAGE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --message|-m) MESSAGE="${2:-}"; shift 2 ;;
    --help|-h) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage; exit 2 ;;
  esac
done

if [[ -z "$MESSAGE" ]]; then
  echo "Missing --message" >&2
  usage
  exit 2
fi

if [[ ${#MESSAGE} -lt 12 || ! "$MESSAGE" =~ ^[a-z]+\([a-z0-9-]+\):\ .+ ]]; then
  echo "Commit message should look like: type(scope): concise description" >&2
  exit 1
fi

if git diff --cached --quiet; then
  echo "No staged changes to commit." >&2
  exit 1
fi

git commit -m "$MESSAGE"
