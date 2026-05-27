#!/usr/bin/env bash
# Writes frontend/.env for production builds. The file is gitignored and must
# never contain QA wallet private keys.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEPLOYMENT_ENV="${DEPLOYMENT_ENV:-$REPO_ROOT/cache/production/deployment.env}"
FRONTEND_ENV="${FRONTEND_ENV:-$REPO_ROOT/frontend/.env}"

if [[ "${1:-}" == "--self-test" ]]; then
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' EXIT
  FRONTEND_ENV="$tmp_dir/frontend.env" \
    DEPLOYMENT_ENV="$tmp_dir/missing.env" \
    SKIP_DOTENV=1 \
    VITE_API_BASE_URL=https://api-duelly.typewith.ai \
    VITE_ALLOWED_HOSTS=duelly.typewith.ai \
    VITE_QA_WALLET=false \
    "$0"
  grep -q '^VITE_DUELLY_API_MODE=http$' "$tmp_dir/frontend.env"
  grep -q '^VITE_DUELLY_TEMPLATE_MODE=live$' "$tmp_dir/frontend.env"
  grep -q '^VITE_API_BASE_URL=https://api-duelly.typewith.ai$' "$tmp_dir/frontend.env"
  grep -q '^VITE_ALLOWED_HOSTS=duelly.typewith.ai$' "$tmp_dir/frontend.env"
  grep -q '^VITE_QA_WALLET=false$' "$tmp_dir/frontend.env"
  if FRONTEND_ENV="$tmp_dir/qa.env" SKIP_DOTENV=1 VITE_QA_WALLET=true "$0" >/dev/null 2>&1; then
    echo "[frontend-env] self-test expected QA wallet refusal" >&2
    exit 1
  fi
  if FRONTEND_ENV="$tmp_dir/qa-key.env" SKIP_DOTENV=1 QA_MAKER_PRIVATE_KEY=0xabc "$0" >/dev/null 2>&1; then
    echo "[frontend-env] self-test expected QA key refusal" >&2
    exit 1
  fi
  echo "[frontend-env] production self-test ok"
  exit 0
fi

if [[ "${SKIP_DOTENV:-0}" != "1" && -f "$REPO_ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$REPO_ROOT/.env"
  set +a
fi

if [[ -f "$DEPLOYMENT_ENV" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$DEPLOYMENT_ENV"
  set +a
fi

frontend_api_base_url="${VITE_API_BASE_URL:-https://api-duelly.typewith.ai}"
case "$frontend_api_base_url" in
  http://*|https://*) ;;
  *) frontend_api_base_url="https://$frontend_api_base_url" ;;
esac
frontend_api_base_url="${frontend_api_base_url%/}"
frontend_allowed_hosts="${VITE_ALLOWED_HOSTS:-duelly.typewith.ai}"

if [[ "${VITE_QA_WALLET:-false}" == "true" ]]; then
  echo "[frontend-env] refusing production env with VITE_QA_WALLET=true" >&2
  exit 1
fi

if [[ -n "${VITE_QA_MAKER_PRIVATE_KEY:-}" || -n "${VITE_QA_TAKER_PRIVATE_KEY:-}" || -n "${QA_MAKER_PRIVATE_KEY:-}" || -n "${QA_TAKER_PRIVATE_KEY:-}" ]]; then
  echo "[frontend-env] refusing production env with QA private keys set" >&2
  exit 1
fi

mkdir -p "$(dirname "$FRONTEND_ENV")"
cat > "$FRONTEND_ENV" <<EOF
VITE_DUELLY_API_MODE=http
VITE_DUELLY_TEMPLATE_MODE=live
VITE_API_BASE_URL=$frontend_api_base_url
VITE_ALLOWED_HOSTS=$frontend_allowed_hosts
VITE_QA_WALLET=false
EOF
chmod 600 "$FRONTEND_ENV"

echo "[frontend-env] wrote production frontend env to $FRONTEND_ENV"
