#!/usr/bin/env bash
# Repairs or safely resets staging Anvil state before the Anvil service starts.
set -euo pipefail
umask 077

APP_DIR="${APP_DIR:-/opt/duelly/app}"
ANVIL_DIR="${ANVIL_DIR:-/opt/duelly/anvil}"
STATE_FILE="${STATE_FILE:-$ANVIL_DIR/state.json}"
BACKUP_DIR="${BACKUP_DIR:-$ANVIL_DIR/backups}"
DEPLOYMENT_ENV="${DEPLOYMENT_ENV:-$APP_DIR/cache/staging-fork/deployment.env}"
RECOVERY_MARKER="${RECOVERY_MARKER:-$ANVIL_DIR/fresh-fork-required}"
STATE_SOURCE_FILE="${STATE_SOURCE_FILE:-$ANVIL_DIR/state-source}"
HELPER="$APP_DIR/scripts/blockchain/lib/staging-fork-recovery.mjs"
REQUIRE_DB_RESTORE_GUARD="${REQUIRE_DB_RESTORE_GUARD:-1}"

export PATH="${NODE_BIN_DIR:-/root/.nvm/versions/node/v22.21.0/bin}:/root/.foundry/bin:$PATH"

log() {
  printf '[staging-fork-prestart] %s\n' "$*"
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

backup_unusable_state() {
  [[ -e "$STATE_FILE" ]] || return 0
  local timestamp backup_path
  timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
  backup_path="$ANVIL_DIR/state.unusable.$timestamp.json.bak"
  mv "$STATE_FILE" "$backup_path"
  log "moved unusable state to $backup_path"
}

current_indexed_max_block() {
  if [[ ! -f "$DEPLOYMENT_ENV" ]]; then
    return 0
  fi
  if ! command -v psql >/dev/null 2>&1; then
    [[ "$REQUIRE_DB_RESTORE_GUARD" == "1" ]] && return 2
    return 0
  fi
  local deployment_key
  if ! deployment_key="$(node "$HELPER" deployment-key --deployment-env "$DEPLOYMENT_ENV" 2>/dev/null)"; then
    [[ "$REQUIRE_DB_RESTORE_GUARD" == "1" ]] && return 2
    return 0
  fi
  if [[ -z "${DB_HOST:-}" || -z "${DB_PORT:-}" || -z "${DB_USERNAME:-}" || -z "${DB_PASSWORD:-}" || -z "${DB_DATABASE:-}" ]]; then
    [[ "$REQUIRE_DB_RESTORE_GUARD" == "1" ]] && return 2
    return 0
  fi
  local result
  if ! result="$(PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USERNAME" \
    -d "$DB_DATABASE" \
    -XAt \
    -v deployment_key="$deployment_key" \
    -c "select greatest(
          coalesce((select max(block_number::numeric) from indexed_chain_events where deployment_key = :'deployment_key'), 0),
          coalesce((select max(source_block_number::numeric) from indexed_bets where deployment_key = :'deployment_key'), 0),
          coalesce((select max(last_block_number::numeric) from indexer_cursors where deployment_key = :'deployment_key'), 0)
        )::text;" \
    2>/dev/null)"; then
    [[ "$REQUIRE_DB_RESTORE_GUARD" == "1" ]] && return 2
    return 0
  fi
  printf '%s\n' "$result"
}

select_restore_path() {
  local indexed_max selection
  if ! indexed_max="$(current_indexed_max_block | tail -n 1 | tr -d '[:space:]')"; then
    log "DB index guard unavailable; refusing backup restore"
    return 0
  fi
  if [[ -n "$indexed_max" ]]; then
    selection="$(node "$HELPER" select-backup --backup-dir "$BACKUP_DIR" --deployment-env "$DEPLOYMENT_ENV" --indexed-max-block "$indexed_max")"
  else
    selection="$(node "$HELPER" select-backup --backup-dir "$BACKUP_DIR" --deployment-env "$DEPLOYMENT_ENV")"
  fi
  SELECTION_JSON="$selection" node -e '
const selection = JSON.parse(process.env.SELECTION_JSON);
if (selection.restorePath) console.log(selection.restorePath);
' || true
}

mkdir -p "$ANVIL_DIR" "$BACKUP_DIR"
chmod 0700 "$ANVIL_DIR" "$BACKUP_DIR" 2>/dev/null || true
load_env_file "$APP_DIR/.env"
load_env_file "$DEPLOYMENT_ENV"

if [[ ! -f "$HELPER" ]]; then
  log "helper missing: $HELPER"
  exit 1
fi

if [[ -s "$STATE_FILE" ]]; then
  indexed_max=""
  if [[ -f "$DEPLOYMENT_ENV" ]] && ! indexed_max="$(current_indexed_max_block | tail -n 1 | tr -d '[:space:]')"; then
    log "DB index guard unavailable; current state cannot be accepted"
  elif [[ -f "$DEPLOYMENT_ENV" ]] && node "$HELPER" validate-deployment --state "$STATE_FILE" --deployment-env "$DEPLOYMENT_ENV" >/dev/null 2>&1; then
    state_block="$(node "$HELPER" validate-state --state "$STATE_FILE" 2>/dev/null | node -e 'const fs = require("fs"); const info = JSON.parse(fs.readFileSync(0, "utf8")); console.log(info.bestBlockNumber);' 2>/dev/null || true)"
    if [[ -z "$indexed_max" || ( "$state_block" =~ ^[0-9]+$ && "$indexed_max" =~ ^[0-9]+$ && "$state_block" -ge "$indexed_max" ) ]]; then
      rm -f "$RECOVERY_MARKER"
      printf 'existing-state\n' > "$STATE_SOURCE_FILE"
      log "state is valid for current deployment"
      exit 0
    fi
    log "current state block ${state_block:-unknown} is behind indexed block $indexed_max"
  elif [[ ! -f "$DEPLOYMENT_ENV" ]] && node "$HELPER" validate-state --state "$STATE_FILE" >/dev/null 2>&1; then
    rm -f "$RECOVERY_MARKER"
    printf 'existing-state-no-deployment-env\n' > "$STATE_SOURCE_FILE"
    log "state is valid; deployment env is not present yet"
    exit 0
  else
    log "current state is invalid for current deployment"
  fi
fi

restore_path="$(select_restore_path)"
if [[ -n "$restore_path" ]]; then
  tmp_restore="$ANVIL_DIR/.state.restore.tmp"
  cp "$restore_path" "$tmp_restore"
  node "$HELPER" validate-deployment --state "$tmp_restore" --deployment-env "$DEPLOYMENT_ENV" >/dev/null
  backup_unusable_state
  mv "$tmp_restore" "$STATE_FILE"
  rm -f "$RECOVERY_MARKER"
  printf 'restored:%s\n' "$restore_path" > "$STATE_SOURCE_FILE"
  log "restored state from $restore_path"
  exit 0
fi

backup_unusable_state
rm -f "$STATE_FILE"
printf 'fresh-fork-required:%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$RECOVERY_MARKER"
printf 'fresh-fork-required\n' > "$STATE_SOURCE_FILE"
log "no compatible backup found; Anvil will start from a fresh fork"
