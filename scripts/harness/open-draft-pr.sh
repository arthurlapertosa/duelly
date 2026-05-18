#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  scripts/harness/open-draft-pr.sh --title "PR title" [--base main] [--body-file .pr-body.generated.md]
  scripts/harness/open-draft-pr.sh --title "PR title" --dry-run

Opens a GitHub draft PR with gh. Use --dry-run to validate inputs without network calls.
USAGE
}

TITLE=""
BASE="${DEFAULT_BASE_BRANCH:-main}"
BODY_FILE=".pr-body.generated.md"
DRY_RUN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --title) TITLE="${2:-}"; shift 2 ;;
    --base) BASE="${2:-}"; shift 2 ;;
    --body-file) BODY_FILE="${2:-}"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    --help|-h) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage; exit 2 ;;
  esac
done

if [[ -z "$TITLE" ]]; then
  echo "Missing --title" >&2
  usage
  exit 2
fi

BRANCH="$(git branch --show-current)"
if [[ -z "$BRANCH" ]]; then
  echo "Not on a named branch." >&2
  exit 1
fi

if [[ "$BRANCH" == "$BASE" || "$BRANCH" == "main" || "$BRANCH" == "master" ]]; then
  echo "Refusing to open PR from protected/base branch: $BRANCH" >&2
  exit 1
fi

if [[ ! -f "$BODY_FILE" ]]; then
  echo "Missing PR body file: $BODY_FILE" >&2
  echo "Generate one with scripts/harness/render-pr-body.mjs" >&2
  exit 1
fi

if [[ $DRY_RUN -eq 1 ]]; then
  cat <<EOF
{
  "title": "$TITLE",
  "base": "$BASE",
  "head": "$BRANCH",
  "bodyFile": "$BODY_FILE",
  "draft": true
}
EOF
  exit 0
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI is required to open the PR." >&2
  exit 1
fi

gh pr create --draft --base "$BASE" --head "$BRANCH" --title "$TITLE" --body-file "$BODY_FILE"
