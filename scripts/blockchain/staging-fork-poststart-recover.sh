#!/usr/bin/env bash
# Completes fresh-fork recovery after Anvil starts without a restorable state.
set -euo pipefail
umask 077

APP_DIR="${APP_DIR:-/opt/duelly/app}"
ANVIL_DIR="${ANVIL_DIR:-/opt/duelly/anvil}"
RECOVERY_MARKER="${RECOVERY_MARKER:-$ANVIL_DIR/fresh-fork-required}"
DEPLOYMENT_ENV="${DEPLOYMENT_ENV:-$APP_DIR/cache/staging-fork/deployment.env}"
LOCAL_FORK_RPC_URL="${LOCAL_FORK_RPC_URL:-http://127.0.0.1:8545}"
RECOVERY_LOG_DIR="${RECOVERY_LOG_DIR:-/opt/duelly/evidence/fork-recovery}"
RECOVERY_LOCK_FILE="${RECOVERY_LOCK_FILE:-$ANVIL_DIR/staging-fork-recover.lock}"

export PATH="${NODE_BIN_DIR:-/root/.nvm/versions/node/v22.21.0/bin}:/root/.foundry/bin:$PATH"

log() {
  printf '[staging-fork-recover] %s\n' "$*"
}

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

wait_for_chain() {
  local chain_id
  for _ in $(seq 1 60); do
    chain_id="$(curl -sS -m 2 -X POST "$LOCAL_FORK_RPC_URL" -H 'content-type: application/json' \
      -d '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' \
      | sed -n 's/.*"result":"\([^"]*\)".*/\1/p' || true)"
    if [[ "$chain_id" == "0x89" ]]; then
      return 0
    fi
    sleep 1
  done
  log "Anvil did not become ready at $LOCAL_FORK_RPC_URL"
  return 1
}

expire_prefunding_invites() {
  if ! command -v psql >/dev/null 2>&1; then
    log "psql not found; skipping stale invite expiry"
    return 0
  fi
  if [[ -z "${DB_HOST:-}" || -z "${DB_PORT:-}" || -z "${DB_USERNAME:-}" || -z "${DB_PASSWORD:-}" || -z "${DB_DATABASE:-}" ]]; then
    log "database env missing; skipping stale invite expiry"
    return 0
  fi
  local expired
  expired="$(PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USERNAME" \
    -d "$DB_DATABASE" \
    -XAt \
    -c "with updated as (
          update bet_invites
             set status = 'expired', updated_at = now()
           where deployment_key is null
             and status in ('created', 'accepted')
         returning 1
        )
        select count(*) from updated;" \
    2>/dev/null || true)"
  log "expired prefunding invites: ${expired:-unknown}"
}

if [[ ! -f "$RECOVERY_MARKER" ]]; then
  log "no fresh-fork marker; nothing to do"
  exit 0
fi

mkdir -p "$ANVIL_DIR" "$RECOVERY_LOG_DIR"
chmod 0700 "$ANVIL_DIR" "$RECOVERY_LOG_DIR" 2>/dev/null || true
exec 9>"$RECOVERY_LOCK_FILE"
if ! flock -n 9; then
  log "another recovery is already running; skipping"
  exit 0
fi

load_env_file "$APP_DIR/.env"
load_env_file "$DEPLOYMENT_ENV"

wait_for_chain

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
recovery_log="$RECOVERY_LOG_DIR/recovery-$timestamp.log"
log "fresh-fork marker found; redeploying fork contracts"

(
  cd "$APP_DIR"
  STAGING_FORK_INSTALL_SYSTEMD=0 \
    STAGING_FORK_RECOVERY_MODE=1 \
    START_ANVIL=0 \
    SEED_QA_BRL1="${SEED_QA_BRL1:-1}" \
    scripts/blockchain/deploy-staging-fork.sh
) > "$recovery_log" 2>&1

load_env_file "$DEPLOYMENT_ENV"
expire_prefunding_invites

if [[ -f "$RECOVERY_MARKER" ]]; then
  mv "$RECOVERY_MARKER" "$ANVIL_DIR/fresh-fork-required.handled.$timestamp"
fi
log "recovery completed; log: $recovery_log"
