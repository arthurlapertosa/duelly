#!/usr/bin/env bash
# Writes frontend/.env for staging fork runs from root .env.
# QA wallet injection is opt-in. When enabled, this writes QA private keys to a
# gitignored file and never prints them.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEPLOYMENT_ENV="${DEPLOYMENT_ENV:-$REPO_ROOT/cache/staging-fork/deployment.env}"
FRONTEND_ENV="$REPO_ROOT/frontend/.env"

if [[ -f "$REPO_ROOT/.env" ]]; then
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

required_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "[frontend-env] missing required env: $name" >&2
    exit 1
  fi
}

QA_WALLET="${VITE_QA_WALLET:-false}"
if [[ "$QA_WALLET" != "true" && "$QA_WALLET" != "false" ]]; then
  echo "[frontend-env] VITE_QA_WALLET must be true or false" >&2
  exit 1
fi

cat > "$FRONTEND_ENV" <<EOF
VITE_DUELLY_API_MODE=http
VITE_DUELLY_TEMPLATE_MODE=live
VITE_API_BASE_URL=${VITE_API_BASE_URL:-http://127.0.0.1:3000}
VITE_QA_WALLET=$QA_WALLET
EOF

if [[ "$QA_WALLET" == "true" ]]; then
  required_env QA_MAKER_PRIVATE_KEY
  required_env QA_TAKER_PRIVATE_KEY
  cat >> "$FRONTEND_ENV" <<EOF
VITE_QA_MAKER_PRIVATE_KEY=$QA_MAKER_PRIVATE_KEY
VITE_QA_TAKER_PRIVATE_KEY=$QA_TAKER_PRIVATE_KEY
EOF
fi

echo "[frontend-env] wrote staging fork frontend env to frontend/.env (VITE_QA_WALLET=$QA_WALLET)"
