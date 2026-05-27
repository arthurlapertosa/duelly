#!/usr/bin/env bash
# Updates the Proxmox production checkout and runs backend/frontend with PM2.
# PostgreSQL and reverse proxy/TLS are managed outside this script.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/duelly/prod}"
REPO_URL="${REPO_URL:-https://github.com/arthurlapertosa/duelly.git}"
BRANCH="${BRANCH:-main}"
NODE_VERSION="${NODE_VERSION:-22.21.0}"
NVM_DIR="${NVM_DIR:-/root/.nvm}"
DEPLOYMENT_ENV="${DEPLOYMENT_ENV:-$APP_DIR/cache/production/deployment.env}"
RELAYER_ENV="${RELAYER_ENV:-/etc/duelly/production/relayer.env}"
PM2_HOME="${PM2_HOME:-/root/.pm2}"
BACKEND_PM2_NAME="${BACKEND_PM2_NAME:-duelly-prod-backend}"
FRONTEND_PM2_NAME="${FRONTEND_PM2_NAME:-duelly-prod-frontend}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
LOG_DIR="${LOG_DIR:-/var/log/duelly/production}"

export NVM_DIR PM2_HOME

assert_relayers_key_not_in_env_file() {
  local path="$1"
  if [[ -f "$path" ]] && grep -Eq '^[[:space:]]*(export[[:space:]]+)?RELAYER_PRIVATE_KEY=' "$path"; then
    echo "[prod-deploy] RELAYER_PRIVATE_KEY must live in $RELAYER_ENV, not $path" >&2
    exit 1
  fi
}

assert_secret_file_permissions() {
  local path="$1"
  local mode
  mode="$(stat -c '%a' "$path" 2>/dev/null || true)"
  if [[ -n "$mode" ]] && (( (8#$mode & 077) != 0 )); then
    echo "[prod-deploy] $path must not be group/world-readable; run chmod 600 $path" >&2
    exit 1
  fi
}

if [[ ! -s "$NVM_DIR/nvm.sh" ]]; then
  echo "[prod-deploy] nvm not found at $NVM_DIR/nvm.sh" >&2
  exit 1
fi

# shellcheck disable=SC1091
source "$NVM_DIR/nvm.sh"
nvm install "$NODE_VERSION" >/dev/null
nvm use "$NODE_VERSION" >/dev/null

NODE_BIN="$(command -v node)"
NPM_BIN="$(command -v npm)"

if ! command -v pm2 >/dev/null 2>&1; then
  echo "[prod-deploy] installing pm2"
  npm install -g pm2
fi

if [[ ! -d "$APP_DIR/.git" ]]; then
  echo "[prod-deploy] cloning $REPO_URL into $APP_DIR"
  rm -rf "$APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"
echo "[prod-deploy] checking out $BRANCH"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"

echo "[prod-deploy] installing dependencies"
npm ci

if [[ ! -f "$APP_DIR/.env" ]]; then
  echo "[prod-deploy] missing $APP_DIR/.env" >&2
  exit 1
fi
if [[ ! -f "$DEPLOYMENT_ENV" ]]; then
  echo "[prod-deploy] missing deployment env: $DEPLOYMENT_ENV" >&2
  exit 1
fi
if [[ ! -f "$RELAYER_ENV" ]]; then
  echo "[prod-deploy] missing relayer secret env: $RELAYER_ENV" >&2
  exit 1
fi
assert_relayers_key_not_in_env_file "$APP_DIR/.env"
assert_secret_file_permissions "$RELAYER_ENV"

set -a
# shellcheck disable=SC1091
source "$APP_DIR/.env"
APP_POLYMARKET_ALLOW_NEG_RISK="${POLYMARKET_ALLOW_NEG_RISK:-}"
# shellcheck disable=SC1090
source "$DEPLOYMENT_ENV"
# shellcheck disable=SC1090
source "$RELAYER_ENV"
set +a

if [[ -n "$APP_POLYMARKET_ALLOW_NEG_RISK" ]]; then
  if [[ "$APP_POLYMARKET_ALLOW_NEG_RISK" != "true" && "$APP_POLYMARKET_ALLOW_NEG_RISK" != "false" ]]; then
    echo "[prod-deploy] POLYMARKET_ALLOW_NEG_RISK must be true or false" >&2
    exit 1
  fi
  export POLYMARKET_ALLOW_NEG_RISK="$APP_POLYMARKET_ALLOW_NEG_RISK"
fi

if [[ "${NODE_ENV:-}" != "production" ]]; then
  echo "[prod-deploy] NODE_ENV must be production" >&2
  exit 1
fi
if [[ -z "${INTERNAL_API_TOKEN:-}" ]]; then
  echo "[prod-deploy] INTERNAL_API_TOKEN must be configured" >&2
  exit 1
fi
if [[ -z "${RELAYER_PRIVATE_KEY:-}" ]]; then
  echo "[prod-deploy] RELAYER_PRIVATE_KEY must be configured in $RELAYER_ENV" >&2
  exit 1
fi

export PATH="$(dirname "$NODE_BIN"):/root/.foundry/bin:$PATH"
export DEPLOYMENT_ENV

redacted_url_host() {
  local value="${1:-}"
  if [[ -z "$value" ]]; then
    printf '<missing>'
    return
  fi
  node -e '
try {
  const url = new URL(process.argv[1]);
  console.log(`${url.protocol}//${url.host}/<redacted>`);
} catch {
  console.log("<invalid>");
}
' "$value"
}

echo "[prod-deploy] writing production frontend env"
"$APP_DIR/scripts/dev/write-production-frontend-env.sh"

echo "[prod-deploy] building backend"
npm --workspace backend run build

echo "[prod-deploy] building frontend"
npm --workspace frontend run build

echo "[prod-deploy] showing pending backend migrations"
npm --workspace backend run db:migration:show || true

echo "[prod-deploy] running backend migrations"
npm --workspace backend run db:migration:run:prod

mkdir -p "$LOG_DIR" "$PM2_HOME"

echo "[prod-deploy] starting backend with pm2"
pm2 delete "$BACKEND_PM2_NAME" >/dev/null 2>&1 || true
pm2 start "$NODE_BIN" \
  --name "$BACKEND_PM2_NAME" \
  --cwd "$APP_DIR/backend" \
  --time \
  --output "$LOG_DIR/backend-pm2.log" \
  --error "$LOG_DIR/backend-pm2-error.log" \
  --update-env \
  -- dist/src/server.js

echo "[prod-deploy] starting frontend with pm2"
pm2 delete "$FRONTEND_PM2_NAME" >/dev/null 2>&1 || true
pm2 start "$NPM_BIN" \
  --name "$FRONTEND_PM2_NAME" \
  --cwd "$APP_DIR/frontend" \
  --time \
  --output "$LOG_DIR/frontend-pm2.log" \
  --error "$LOG_DIR/frontend-pm2-error.log" \
  --update-env \
  -- run start -- --host 0.0.0.0 --port "$FRONTEND_PORT"

echo "[prod-deploy] configuring pm2 startup"
pm2 startup systemd -u root --hp /root >/tmp/duelly-prod-pm2-startup.log 2>&1 || true
systemctl enable pm2-root >/dev/null 2>&1 || true
pm2 save --force

echo "[prod-deploy] waiting for backend/frontend"
for _ in $(seq 1 90); do
  if curl -fsS "http://127.0.0.1:${PORT:-3000}/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
curl -fsS "http://127.0.0.1:${PORT:-3000}/ready" >/dev/null

for _ in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:$FRONTEND_PORT" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
curl -fsS "http://127.0.0.1:$FRONTEND_PORT" >/dev/null

echo "[prod-deploy] pm2 status"
pm2 status
echo "[prod-deploy] effective backend config"
echo "[prod-deploy] chain rpc: $(redacted_url_host "${CHAIN_RPC_URL:-${POLYGON_RPC_URL:-}}")"
echo "[prod-deploy] escrow: ${DUELLY_ESCROW_ADDRESS:-<missing>}"
echo "[prod-deploy] deployment block: ${DUELLY_DEPLOYMENT_BLOCK:-<missing>}"
echo "[prod-deploy] live discovery: ${POLYMARKET_LIVE_DISCOVERY_ENABLED:-false}"
echo "[prod-deploy] negative risk: ${POLYMARKET_ALLOW_NEG_RISK:-false}"
echo "[prod-deploy] template sync enabled: ${POLYMARKET_TEMPLATE_CTF_SYNC_ENABLED:-false}"
echo "[prod-deploy] complete"
