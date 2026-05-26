#!/usr/bin/env bash
# Saves validated recovery points for the persistent staging Anvil fork.
set -euo pipefail
umask 077

APP_DIR="${APP_DIR:-/opt/duelly/app}"
ANVIL_DIR="${ANVIL_DIR:-/opt/duelly/anvil}"
STATE_FILE="${STATE_FILE:-$ANVIL_DIR/state.json}"
BACKUP_DIR="${BACKUP_DIR:-$ANVIL_DIR/backups}"
DEPLOYMENT_ENV="${DEPLOYMENT_ENV:-$APP_DIR/cache/staging-fork/deployment.env}"
RETENTION_COUNT="${STAGING_FORK_BACKUP_RETENTION_COUNT:-288}"
LOCK_FILE="${LOCK_FILE:-$ANVIL_DIR/staging-fork-backup.lock}"
HELPER="$APP_DIR/scripts/blockchain/lib/staging-fork-recovery.mjs"

export PATH="${NODE_BIN_DIR:-/root/.nvm/versions/node/v22.21.0/bin}:/root/.foundry/bin:$PATH"

log() {
  printf '[staging-fork-backup] %s\n' "$*"
}

mkdir -p "$BACKUP_DIR"
chmod 0700 "$BACKUP_DIR" 2>/dev/null || true
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  log "another backup is already running; skipping"
  exit 0
fi

if [[ ! -s "$STATE_FILE" ]]; then
  log "state file missing or empty: $STATE_FILE"
  exit 0
fi

if [[ ! -f "$HELPER" ]]; then
  log "helper missing: $HELPER"
  exit 1
fi

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
tmp_state="$BACKUP_DIR/.state.$timestamp.json.tmp"
backup_state="$BACKUP_DIR/state.$timestamp.json"
backup_metadata="$backup_state.meta.json"

cp "$STATE_FILE" "$tmp_state"
if ! node "$HELPER" validate-state --state "$tmp_state" >/dev/null; then
  rm -f "$tmp_state"
  log "copied state was invalid; skipping backup"
  exit 0
fi

mv "$tmp_state" "$backup_state"
chmod 0600 "$backup_state" 2>/dev/null || true
if ! node "$HELPER" write-metadata \
  --state "$backup_state" \
  --deployment-env "$DEPLOYMENT_ENV" \
  --output "$backup_metadata" >/dev/null; then
  rm -f "$backup_state" "$backup_metadata"
  log "state does not match current deployment metadata; skipping backup"
  exit 0
fi
chmod 0600 "$backup_metadata" 2>/dev/null || true

ln -sfn "$(basename "$backup_state")" "$BACKUP_DIR/latest-valid.json"
ln -sfn "$(basename "$backup_metadata")" "$BACKUP_DIR/latest-valid.meta.json"

if [[ "$RETENTION_COUNT" =~ ^[0-9]+$ ]] && (( RETENTION_COUNT > 0 )); then
  mapfile -t old_backups < <(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'state.*T*.json' | sort -r | tail -n +"$((RETENTION_COUNT + 1))")
  for old_backup in "${old_backups[@]}"; do
    rm -f "$old_backup" "$old_backup.meta.json"
  done
fi

log "saved $(basename "$backup_state")"
