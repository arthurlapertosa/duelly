#!/usr/bin/env bash
# Updates the Proxmox staging checkout and runs backend/frontend with PM2.
#
# This intentionally manages only app processes. Postgres and the persistent
# Anvil fork stay under systemd.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/duelly/app}"
REPO_URL="${REPO_URL:-https://github.com/arthurlapertosa/duelly.git}"
BRANCH="${BRANCH:-codex/staging-fork-web3-e2e}"
NODE_VERSION="${NODE_VERSION:-22.21.0}"
NVM_DIR="${NVM_DIR:-/root/.nvm}"
DEPLOYMENT_ENV="${DEPLOYMENT_ENV:-$APP_DIR/cache/staging-fork/deployment.env}"
PM2_HOME="${PM2_HOME:-/root/.pm2}"

export NVM_DIR PM2_HOME

if [[ ! -s "$NVM_DIR/nvm.sh" ]]; then
  echo "[deploy] nvm not found at $NVM_DIR/nvm.sh" >&2
  exit 1
fi

# shellcheck disable=SC1091
source "$NVM_DIR/nvm.sh"
nvm install "$NODE_VERSION" >/dev/null
nvm use "$NODE_VERSION" >/dev/null

NODE_BIN="$(command -v node)"
NPM_BIN="$(command -v npm)"

if ! command -v pm2 >/dev/null 2>&1; then
  echo "[deploy] installing pm2"
  npm install -g pm2
fi

if [[ ! -d "$APP_DIR/.git" ]]; then
  echo "[deploy] cloning $REPO_URL into $APP_DIR"
  rm -rf "$APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"
echo "[deploy] checking out $BRANCH"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"

echo "[deploy] installing dependencies"
npm ci

if [[ ! -f "$APP_DIR/.env" ]]; then
  echo "[deploy] missing $APP_DIR/.env" >&2
  exit 1
fi
if [[ ! -f "$DEPLOYMENT_ENV" ]]; then
  echo "[deploy] missing deployment env: $DEPLOYMENT_ENV" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source "$APP_DIR/.env"
# shellcheck disable=SC1090
source "$DEPLOYMENT_ENV"
set +a

export PATH="$(dirname "$NODE_BIN"):/root/.foundry/bin:$PATH"
export DEPLOYMENT_ENV

echo "[deploy] writing frontend staging env"
"$APP_DIR/scripts/dev/write-staging-frontend-env.sh"
chmod 600 "$APP_DIR/frontend/.env"

echo "[deploy] building backend"
npm --workspace backend run build

echo "[deploy] running backend migrations"
npm --workspace backend run db:migration:run:prod

echo "[deploy] stopping legacy backend/frontend systemd units if present"
for service in duelly-backend.service duelly-frontend.service; do
  if systemctl list-unit-files "$service" >/dev/null 2>&1; then
    systemctl disable --now "$service" >/dev/null 2>&1 || true
  fi
done

mkdir -p /var/log/duelly "$PM2_HOME"

echo "[deploy] starting backend with pm2"
pm2 delete duelly-backend >/dev/null 2>&1 || true
pm2 start "$NODE_BIN" \
  --name duelly-backend \
  --cwd "$APP_DIR/backend" \
  --time \
  --output /var/log/duelly/backend-pm2.log \
  --error /var/log/duelly/backend-pm2-error.log \
  --update-env \
  -- dist/src/server.js

echo "[deploy] starting frontend with pm2"
pm2 delete duelly-frontend >/dev/null 2>&1 || true
pm2 start "$NPM_BIN" \
  --name duelly-frontend \
  --cwd "$APP_DIR/frontend" \
  --time \
  --output /var/log/duelly/frontend-pm2.log \
  --error /var/log/duelly/frontend-pm2-error.log \
  --update-env \
  -- run dev -- --host 0.0.0.0

echo "[deploy] configuring pm2 startup"
pm2 startup systemd -u root --hp /root >/tmp/duelly-pm2-startup.log 2>&1 || true
systemctl enable pm2-root >/dev/null 2>&1 || true
pm2 save --force

echo "[deploy] waiting for backend/frontend"
for _ in $(seq 1 90); do
  if curl -fsS "http://127.0.0.1:${PORT:-3000}/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
curl -fsS "http://127.0.0.1:${PORT:-3000}/ready" >/dev/null

for _ in $(seq 1 60); do
  if curl -fsS http://127.0.0.1:5173 >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
curl -fsS http://127.0.0.1:5173 >/dev/null

echo "[deploy] pm2 status"
pm2 status
echo "[deploy] complete"
