#!/usr/bin/env bash
# Optional operator helper: refresh PM2 apps with the current staging fork env.
set -euo pipefail
umask 077

APP_DIR="${APP_DIR:-/opt/duelly/app}"
DEPLOYMENT_ENV="${DEPLOYMENT_ENV:-$APP_DIR/cache/staging-fork/deployment.env}"
NVM_DIR="${NVM_DIR:-/root/.nvm}"
NODE_VERSION="${NODE_VERSION:-22.21.0}"
PM2_HOME="${PM2_HOME:-/root/.pm2}"

export NVM_DIR PM2_HOME

if [[ -s "$NVM_DIR/nvm.sh" ]]; then
  # shellcheck disable=SC1091
  source "$NVM_DIR/nvm.sh"
  nvm use "$NODE_VERSION" >/dev/null
fi

load_env_file() {
  local file="$1"
  local line key value
  [[ -f "$file" ]] || return 0
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line#"${line%%[![:space:]]*}"}"
    [[ -z "$line" || "$line" == \#* || "$line" != *=* ]] && continue
    key="${line%%=*}"
    value="${line#*=}"
    key="${key%"${key##*[![:space:]]}"}"
    value="${value#"${value%%[![:space:]]*}"}"
    value="${value%"${value##*[![:space:]]}"}"
    if [[ "$value" == \"*\" && "$value" == *\" ]]; then
      value="${value:1:${#value}-2}"
    elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
      value="${value:1:${#value}-2}"
    fi
    [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
    export "$key=$value"
  done < "$file"
}

if ! command -v pm2 >/dev/null 2>&1; then
  echo "[staging-pm2-restart] pm2 is not installed" >&2
  exit 1
fi

if [[ ! -f "$APP_DIR/.env" ]]; then
  echo "[staging-pm2-restart] missing $APP_DIR/.env" >&2
  exit 1
fi
if [[ ! -f "$DEPLOYMENT_ENV" ]]; then
  echo "[staging-pm2-restart] missing $DEPLOYMENT_ENV" >&2
  exit 1
fi

load_env_file "$APP_DIR/.env"
load_env_file "$DEPLOYMENT_ENV"

pm2 restart duelly-backend --update-env
pm2 restart duelly-frontend --update-env
pm2 save --force
pm2 status
