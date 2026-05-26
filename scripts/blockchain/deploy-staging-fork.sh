#!/usr/bin/env bash
# Deploys Duelly's escrow to a production-like Anvil fork using real Polygon
# BRL1 and real Polymarket CTF contracts. All writes are fork-local.
set -euo pipefail
umask 077

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CACHE_DIR="${CACHE_DIR:-$REPO_ROOT/cache/staging-fork}"
ANVIL_DIR="${ANVIL_DIR:-/opt/duelly/anvil}"
LOCAL_FORK_RPC_URL="${LOCAL_FORK_RPC_URL:-http://127.0.0.1:8545}"
LOCAL_FORK_CHAIN_ID="${LOCAL_FORK_CHAIN_ID:-137}"
ANVIL_HOST="${ANVIL_HOST:-0.0.0.0}"
MIN_LOSER_FEE_WEI="${MIN_LOSER_FEE_WEI:-3000000000000000000}"
START_ANVIL="${START_ANVIL:-0}"
SEED_QA_BRL1="${SEED_QA_BRL1:-0}"
QA_BRL1_AMOUNT="${QA_BRL1_AMOUNT:-1000}"
QA_SEED_WALLETS="${QA_SEED_WALLETS:-}"
DEFAULT_STAGING_QA_SEED_WALLETS="${DEFAULT_STAGING_QA_SEED_WALLETS:-0x298Db0F3C07279b225CF8E2453879F16E5b9feEc,0x02Ee8283927d7e3Fd3f3f392a8E7e14E4E986785,0x5F4e2F90fE7B2ce2F0f04aAe2c2705892300F4AF,0x35F698299e3E4c11856156859D449307e8D4c218}"
STAGING_DEFAULT_SEED_WALLETS_ENABLED="${STAGING_DEFAULT_SEED_WALLETS_ENABLED:-1}"
ALLOW_NON_LOCAL_FORK_RPC="${ALLOW_NON_LOCAL_FORK_RPC:-0}"
STAGING_FORK_INSTALL_SYSTEMD="${STAGING_FORK_INSTALL_SYSTEMD:-1}"
STAGING_FORK_RECOVERY_MODE="${STAGING_FORK_RECOVERY_MODE:-0}"
STAGING_FORK_BACKUP_RETENTION_COUNT="${STAGING_FORK_BACKUP_RETENTION_COUNT:-288}"
ANVIL_STATE_DUMP_WAIT_SECONDS="${ANVIL_STATE_DUMP_WAIT_SECONDS:-20}"
NODE_VERSION="${NODE_VERSION:-22.21.0}"
NVM_DIR="${NVM_DIR:-/root/.nvm}"
RESOLUTION_WORKER_INTERVAL_MS="${RESOLUTION_WORKER_INTERVAL_MS:-60000}"
RESOLUTION_WORKER_BATCH_SIZE="${RESOLUTION_WORKER_BATCH_SIZE:-10}"
RESOLUTION_WORKER_PENDING_RETRY_SECONDS="${RESOLUTION_WORKER_PENDING_RETRY_SECONDS:-300}"
POLYMARKET_CTF_ORACLE_ADDRESS="${POLYMARKET_CTF_ORACLE_ADDRESS:-0x6A9D222616C90FcA5754cd1333cFD9b7fb6a4F74}"
POLYMARKET_CTF_ORACLE_ADDRESSES="${POLYMARKET_CTF_ORACLE_ADDRESSES:-0x65070BE91477460D8A7AeEb94ef92fe056C2f2A7,0x6A9D222616C90FcA5754cd1333cFD9b7fb6a4F74}"
POLYMARKET_NEG_RISK_CTF_ORACLE_ADDRESS="${POLYMARKET_NEG_RISK_CTF_ORACLE_ADDRESS:-0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296}"
POLYMARKET_RESOLUTION_MIRROR_ENABLED="${POLYMARKET_RESOLUTION_MIRROR_ENABLED:-true}"
POLYMARKET_RESOLUTION_MIRROR_OUTCOME_SLOT_COUNT="${POLYMARKET_RESOLUTION_MIRROR_OUTCOME_SLOT_COUNT:-2}"
POLYMARKET_RESOLUTION_MIRROR_ALLOW_NON_LOCAL_FORK_RPC="${POLYMARKET_RESOLUTION_MIRROR_ALLOW_NON_LOCAL_FORK_RPC:-$ALLOW_NON_LOCAL_FORK_RPC}"
POLYMARKET_TEMPLATE_CTF_SYNC_ENABLED="${POLYMARKET_TEMPLATE_CTF_SYNC_ENABLED:-$POLYMARKET_RESOLUTION_MIRROR_ENABLED}"
POLYMARKET_TEMPLATE_CTF_SYNC_BATCH_SIZE="${POLYMARKET_TEMPLATE_CTF_SYNC_BATCH_SIZE:-50}"
POLYMARKET_TEMPLATE_CTF_SYNC_CONCURRENCY="${POLYMARKET_TEMPLATE_CTF_SYNC_CONCURRENCY:-2}"
STAGING_MIN_BETTING_CLOSE_BUFFER_HOURS="${STAGING_MIN_BETTING_CLOSE_BUFFER_HOURS:-0}"

PATH="$HOME/.foundry/bin:$PATH"
if [[ -s "$NVM_DIR/nvm.sh" ]]; then
  # shellcheck disable=SC1090
  source "$NVM_DIR/nvm.sh"
  nvm use "$NODE_VERSION" >/dev/null 2>&1 || nvm install "$NODE_VERSION" >/dev/null
fi
if ! command -v node >/dev/null 2>&1; then
  echo "[staging-fork] node is required; install Node $NODE_VERSION or ensure node is on PATH" >&2
  exit 1
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

load_env_file "$REPO_ROOT/.env"

ANVIL_HOST="${ANVIL_HOST:-0.0.0.0}"

if [[ -z "${QA_SEED_WALLETS:-}" && "$STAGING_DEFAULT_SEED_WALLETS_ENABLED" == "1" ]]; then
  QA_SEED_WALLETS="$DEFAULT_STAGING_QA_SEED_WALLETS"
fi
POLYMARKET_CTF_ORACLE_ADDRESSES="${POLYMARKET_CTF_ORACLE_ADDRESSES:-0x65070BE91477460D8A7AeEb94ef92fe056C2f2A7,0x6A9D222616C90FcA5754cd1333cFD9b7fb6a4F74}"
POLYMARKET_TEMPLATE_CTF_SYNC_SOURCE_RPC_URL="${POLYMARKET_TEMPLATE_CTF_SYNC_SOURCE_RPC_URL:-${POLYMARKET_RESOLUTION_MIRROR_SOURCE_RPC_URL:-}}"

required_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "[staging-fork] missing required env: $name" >&2
    exit 1
  fi
}

normalize_key() {
  local key="$1"
  [[ "$key" == 0x* ]] && printf '%s' "$key" || printf '0x%s' "$key"
}

normalize_bool() {
  case "$1" in
    1|true|TRUE|yes|YES) printf 'true' ;;
    0|false|FALSE|no|NO) printf 'false' ;;
    *) printf '%s' "$1" ;;
  esac
}

validate_anvil_host() {
  if [[ ! "$ANVIL_HOST" =~ ^[A-Za-z0-9_.:-]+$ ]]; then
    echo "[staging-fork] invalid ANVIL_HOST: $ANVIL_HOST" >&2
    exit 1
  fi
}

append_seed_wallet() {
  local wallet="$1"
  [[ -z "$wallet" ]] && return
  for existing in "${SEED_WALLETS[@]:-}"; do
    [[ "${existing,,}" == "${wallet,,}" ]] && return
  done
  SEED_WALLETS+=("$wallet")
}

append_seed_wallets_csv() {
  local csv="$1"
  local entry wallet
  local -a entries
  IFS=',' read -r -a entries <<< "$csv"
  for entry in "${entries[@]}"; do
    wallet="$(printf '%s' "$entry" | tr -d '[:space:]')"
    append_seed_wallet "$wallet"
  done
}

is_local_rpc() {
  [[ "$LOCAL_FORK_RPC_URL" =~ ^https?://(127\.0\.0\.1|localhost|0\.0\.0\.0|\[::1\])(:|/) ]]
}

wait_for_chain() {
  for _ in $(seq 1 60); do
    local chain_id
    chain_id="$(curl -sS -m 2 -X POST "$LOCAL_FORK_RPC_URL" -H 'content-type: application/json' \
      -d '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' \
      | sed -n 's/.*"result":"\([^"]*\)".*/\1/p' || true)"
    if [[ "$chain_id" == "0x89" ]]; then
      return 0
    fi
    sleep 1
  done
  echo "[staging-fork] Anvil fork did not become ready at $LOCAL_FORK_RPC_URL" >&2
  exit 1
}

assert_anvil_rpc() {
  if [[ -n "${POLYGON_RPC_URL:-}" && "$LOCAL_FORK_RPC_URL" == "$POLYGON_RPC_URL" ]]; then
    echo "[staging-fork] refusing to use POLYGON_RPC_URL as LOCAL_FORK_RPC_URL" >&2
    exit 1
  fi
  if ! cast rpc anvil_nodeInfo --rpc-url "$LOCAL_FORK_RPC_URL" >/dev/null 2>&1; then
    echo "[staging-fork] RPC is not an Anvil fork or does not expose anvil_nodeInfo: $LOCAL_FORK_RPC_URL" >&2
    exit 1
  fi
}

systemd_can_manage_fork() {
  [[ "$STAGING_FORK_INSTALL_SYSTEMD" == "1" ]] \
    && [[ "$EUID" -eq 0 ]] \
    && command -v systemctl >/dev/null 2>&1 \
    && [[ "$REPO_ROOT" == "/opt/duelly/app" || "${STAGING_FORK_ALLOW_NONSTANDARD_APP_DIR:-0}" == "1" ]]
}

install_recovery_units() {
  if ! systemd_can_manage_fork; then
    echo "[staging-fork] systemd recovery job install skipped"
    return 0
  fi

  local unit_dir="$REPO_ROOT/scripts/blockchain/systemd"
  install -d -m 0700 "$ANVIL_DIR" "$ANVIL_DIR/backups" /var/log/duelly /opt/duelly/evidence/fork-recovery
  install -d -m 0755 /etc/systemd/system/duelly-anvil.service.d
  install -m 0644 "$unit_dir/duelly-anvil.service" /etc/systemd/system/duelly-anvil.service
  install -m 0644 "$unit_dir/duelly-anvil-backup.service" /etc/systemd/system/duelly-anvil-backup.service
  install -m 0644 "$unit_dir/duelly-anvil-backup.timer" /etc/systemd/system/duelly-anvil-backup.timer
  install -m 0644 "$unit_dir/duelly-staging-fork-recover.service" /etc/systemd/system/duelly-staging-fork-recover.service
  cat > /etc/systemd/system/duelly-anvil.service.d/10-host.conf <<EOF
[Service]
Environment=ANVIL_HOST=$ANVIL_HOST
EOF

  systemctl daemon-reload
  systemctl enable duelly-anvil.service >/dev/null
  systemctl enable --now duelly-anvil-backup.timer >/dev/null
  systemctl enable duelly-staging-fork-recover.service >/dev/null
  systemctl start duelly-anvil.service
  echo "[staging-fork] systemd recovery jobs installed"
}

expire_prefunding_invites_after_fresh_recovery() {
  if [[ "$STAGING_FORK_RECOVERY_MODE" != "1" && ! -f "$ANVIL_DIR/fresh-fork-required" ]]; then
    return 0
  fi
  if ! command -v psql >/dev/null 2>&1; then
    echo "[staging-fork] psql not found; skipping stale invite expiry"
    return 0
  fi
  if [[ -z "${DB_HOST:-}" || -z "${DB_PORT:-}" || -z "${DB_USERNAME:-}" || -z "${DB_PASSWORD:-}" || -z "${DB_DATABASE:-}" ]]; then
    echo "[staging-fork] database env missing; skipping stale invite expiry"
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
  echo "[staging-fork] expired prefunding invites after fresh recovery: ${expired:-unknown}"
}

latest_backup_label() {
  local latest="$ANVIL_DIR/backups/latest-valid.json"
  if [[ -L "$latest" ]]; then
    readlink "$latest"
  elif [[ -f "$latest" ]]; then
    basename "$latest"
  else
    printf '<none>'
  fi
}

DEPLOY_BACKUP_LOCK_FD=""
acquire_backup_lock_for_deployment_env_update() {
  local parent
  parent="$(dirname "$ANVIL_DIR")"
  if [[ ! -d "$ANVIL_DIR" && ! -w "$parent" ]]; then
    return 0
  fi

  mkdir -p "$ANVIL_DIR"
  exec {DEPLOY_BACKUP_LOCK_FD}>"$ANVIL_DIR/staging-fork-backup.lock"
  flock "$DEPLOY_BACKUP_LOCK_FD"
}

release_backup_lock_for_deployment_env_update() {
  if [[ -n "${DEPLOY_BACKUP_LOCK_FD:-}" ]]; then
    flock -u "$DEPLOY_BACKUP_LOCK_FD" || true
    eval "exec ${DEPLOY_BACKUP_LOCK_FD}>&-"
    DEPLOY_BACKUP_LOCK_FD=""
  fi
}

state_file_best_block() {
  local state_info
  if ! state_info="$(node "$REPO_ROOT/scripts/blockchain/lib/staging-fork-recovery.mjs" validate-deployment --state "$ANVIL_DIR/state.json" --deployment-env "$CACHE_DIR/deployment.env" 2>/dev/null)"; then
    return 1
  fi
  STATE_INFO="$state_info" node -e 'const info = JSON.parse(process.env.STATE_INFO); console.log(info.state.bestBlockNumber);'
}

wait_for_state_file_block() {
  local target_block="$1"
  if [[ ! "$target_block" =~ ^[0-9]+$ || ! -s "$ANVIL_DIR/state.json" ]]; then
    return 1
  fi

  local deadline=$((SECONDS + ANVIL_STATE_DUMP_WAIT_SECONDS))
  local best_block
  while (( SECONDS <= deadline )); do
    if best_block="$(state_file_best_block)" \
      && [[ "$best_block" =~ ^[0-9]+$ ]] \
      && (( best_block >= target_block )); then
      return 0
    fi
    sleep 1
  done

  echo "[staging-fork] Anvil state file did not catch up to block $target_block; skipping immediate backup"
  return 1
}

mkdir -p "$CACHE_DIR"
chmod 0700 "$CACHE_DIR" 2>/dev/null || true

required_env POLYGON_RPC_URL
required_env BRL1_ADDRESS_POLYGON
required_env POLYMARKET_CTF_ADDRESS
required_env RELAYER_PRIVATE_KEY
required_env TREASURY_ADDRESS
validate_anvil_host

if ! is_local_rpc && [[ "$ALLOW_NON_LOCAL_FORK_RPC" != "1" ]]; then
  echo "[staging-fork] refusing to deploy to non-local RPC: $LOCAL_FORK_RPC_URL" >&2
  echo "[staging-fork] set ALLOW_NON_LOCAL_FORK_RPC=1 only for an explicitly isolated staging fork RPC." >&2
  exit 1
fi

install_recovery_units

RELAYER_PRIVATE_KEY="$(normalize_key "$RELAYER_PRIVATE_KEY")"
RELAYER_ADDRESS="$(cast wallet address --private-key "$RELAYER_PRIVATE_KEY")"
QA_MAKER_ADDRESS="${QA_MAKER_ADDRESS:-}"
QA_TAKER_ADDRESS="${QA_TAKER_ADDRESS:-}"

if [[ -n "${QA_MAKER_PRIVATE_KEY:-}" ]]; then
  QA_MAKER_ADDRESS="$(cast wallet address --private-key "$(normalize_key "$QA_MAKER_PRIVATE_KEY")")"
fi
if [[ -n "${QA_TAKER_PRIVATE_KEY:-}" ]]; then
  QA_TAKER_ADDRESS="$(cast wallet address --private-key "$(normalize_key "$QA_TAKER_PRIVATE_KEY")")"
fi

SEED_WALLETS=()
append_seed_wallet "$QA_MAKER_ADDRESS"
append_seed_wallet "$QA_TAKER_ADDRESS"
append_seed_wallets_csv "$QA_SEED_WALLETS"

if [[ "$START_ANVIL" == "1" ]]; then
  if curl -sS -m 2 -X POST "$LOCAL_FORK_RPC_URL" -H 'content-type: application/json' \
    -d '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' >/dev/null 2>&1; then
    echo "[staging-fork] existing RPC detected at $LOCAL_FORK_RPC_URL"
  else
    echo "[staging-fork] starting Anvil fork at $LOCAL_FORK_RPC_URL"
    anvil \
      --fork-url "$POLYGON_RPC_URL" \
      --chain-id "$LOCAL_FORK_CHAIN_ID" \
      --host "$ANVIL_HOST" \
      --port "${LOCAL_FORK_RPC_URL##*:}" \
      --accounts 0 \
      > "$CACHE_DIR/anvil.log" 2>&1 &
    echo "$!" > "$CACHE_DIR/anvil.pid"
  fi
fi

wait_for_chain
assert_anvil_rpc

for address in "$RELAYER_ADDRESS" "$TREASURY_ADDRESS" "${SEED_WALLETS[@]}"; do
  if [[ -n "$address" ]]; then
    cast rpc anvil_setBalance "$address" 0x56BC75E2D63100000 --rpc-url "$LOCAL_FORK_RPC_URL" >/dev/null
  fi
done

echo "[staging-fork] deploying BetEscrowBRL1 against real BRL1 and Polymarket CTF"
DEPLOY_JSON="$(
  cd "$REPO_ROOT/smartcontract"
  forge create contracts/BetEscrowBRL1.sol:BetEscrowBRL1 \
    --rpc-url "$LOCAL_FORK_RPC_URL" \
    --private-key "$RELAYER_PRIVATE_KEY" \
    --broadcast \
    --json \
    --constructor-args "$BRL1_ADDRESS_POLYGON" "$POLYMARKET_CTF_ADDRESS" "$TREASURY_ADDRESS"
)"
DUELLY_ESCROW_ADDRESS="$(DEPLOY_JSON="$DEPLOY_JSON" node -e '
const output = JSON.parse(process.env.DEPLOY_JSON);
const address = output.deployedTo ?? output.contractAddress ?? output.receipt?.contractAddress;
if (!address) throw new Error("forge create output did not include deployed contract address");
console.log(address);
')"

echo "[staging-fork] configuring escrow roles and fee floor"
for role in TEMPLATE_PUBLISHER_ROLE FEE_OPERATOR_ROLE PAUSER_ROLE TREASURY_MANAGER_ROLE; do
  cast send "$DUELLY_ESCROW_ADDRESS" \
    'setRole(bytes32,address,bool)' \
    "$(cast keccak "$role")" \
    "$RELAYER_ADDRESS" \
    true \
    --rpc-url "$LOCAL_FORK_RPC_URL" \
    --private-key "$RELAYER_PRIVATE_KEY" >/dev/null
done

cast send "$DUELLY_ESCROW_ADDRESS" \
  'setMinLoserFee(uint256)' \
  "$MIN_LOSER_FEE_WEI" \
  --rpc-url "$LOCAL_FORK_RPC_URL" \
  --private-key "$RELAYER_PRIVATE_KEY" >/dev/null

DUELLY_DEPLOYMENT_BLOCK="$(cast block-number --rpc-url "$LOCAL_FORK_RPC_URL")"
POLYMARKET_RESOLUTION_MIRROR_ENABLED="$(normalize_bool "$POLYMARKET_RESOLUTION_MIRROR_ENABLED")"
POLYMARKET_RESOLUTION_MIRROR_ALLOW_NON_LOCAL_FORK_RPC="$(normalize_bool "$POLYMARKET_RESOLUTION_MIRROR_ALLOW_NON_LOCAL_FORK_RPC")"
POLYMARKET_TEMPLATE_CTF_SYNC_ENABLED="$(normalize_bool "$POLYMARKET_TEMPLATE_CTF_SYNC_ENABLED")"
if [[ "${#SEED_WALLETS[@]}" -gt 0 ]]; then
  SEED_WALLETS_CSV="$(IFS=,; printf '%s' "${SEED_WALLETS[*]}")"
else
  SEED_WALLETS_CSV=""
fi

acquire_backup_lock_for_deployment_env_update
umask 077
cat > "$CACHE_DIR/deployment.env" <<EOF
LOCAL_FORK_RPC_URL=$LOCAL_FORK_RPC_URL
LOCAL_FORK_CHAIN_ID=$LOCAL_FORK_CHAIN_ID
CHAIN_RPC_URL=$LOCAL_FORK_RPC_URL
CHAIN_ID=$LOCAL_FORK_CHAIN_ID
CHAIN_ENABLED=true
BRL1_TOKEN_ADDRESS=$BRL1_ADDRESS_POLYGON
BRL1_ADDRESS_POLYGON=$BRL1_ADDRESS_POLYGON
POLYMARKET_CTF_ADDRESS=$POLYMARKET_CTF_ADDRESS
DUELLY_ESCROW_ADDRESS=$DUELLY_ESCROW_ADDRESS
DUELLY_DEPLOYMENT_BLOCK=$DUELLY_DEPLOYMENT_BLOCK
RELAYER_ADDRESS=$RELAYER_ADDRESS
QA_MAKER_ADDRESS=$QA_MAKER_ADDRESS
QA_TAKER_ADDRESS=$QA_TAKER_ADDRESS
QA_SEED_WALLETS=$SEED_WALLETS_CSV
TREASURY_ADDRESS=$TREASURY_ADDRESS
RESOLUTION_WORKER_ENABLED=true
RESOLUTION_WORKER_INTERVAL_MS=$RESOLUTION_WORKER_INTERVAL_MS
RESOLUTION_WORKER_BATCH_SIZE=$RESOLUTION_WORKER_BATCH_SIZE
RESOLUTION_WORKER_PENDING_RETRY_SECONDS=$RESOLUTION_WORKER_PENDING_RETRY_SECONDS
POLYMARKET_RESOLUTION_MIRROR_ENABLED=$POLYMARKET_RESOLUTION_MIRROR_ENABLED
POLYMARKET_CTF_ORACLE_ADDRESS=$POLYMARKET_CTF_ORACLE_ADDRESS
POLYMARKET_CTF_ORACLE_ADDRESSES=$POLYMARKET_CTF_ORACLE_ADDRESSES
POLYMARKET_NEG_RISK_CTF_ORACLE_ADDRESS=$POLYMARKET_NEG_RISK_CTF_ORACLE_ADDRESS
POLYMARKET_RESOLUTION_MIRROR_OUTCOME_SLOT_COUNT=$POLYMARKET_RESOLUTION_MIRROR_OUTCOME_SLOT_COUNT
POLYMARKET_RESOLUTION_MIRROR_ALLOW_NON_LOCAL_FORK_RPC=$POLYMARKET_RESOLUTION_MIRROR_ALLOW_NON_LOCAL_FORK_RPC
POLYMARKET_TEMPLATE_CTF_SYNC_ENABLED=$POLYMARKET_TEMPLATE_CTF_SYNC_ENABLED
POLYMARKET_TEMPLATE_CTF_SYNC_SOURCE_RPC_URL=$POLYMARKET_TEMPLATE_CTF_SYNC_SOURCE_RPC_URL
POLYMARKET_TEMPLATE_CTF_SYNC_BATCH_SIZE=$POLYMARKET_TEMPLATE_CTF_SYNC_BATCH_SIZE
POLYMARKET_TEMPLATE_CTF_SYNC_CONCURRENCY=$POLYMARKET_TEMPLATE_CTF_SYNC_CONCURRENCY
POLYMARKET_DISCOVERY_MODE=live
POLYMARKET_LIVE_DISCOVERY_ENABLED=true
POLYMARKET_ALLOW_NEG_RISK=true
POLYMARKET_MIN_BETTING_CLOSE_BUFFER_HOURS=$STAGING_MIN_BETTING_CLOSE_BUFFER_HOURS
POLYMARKET_MIN_BETTING_CLOSE_BUFFER_SECONDS=
EOF
chmod 600 "$CACHE_DIR/deployment.env"

if [[ "$SEED_QA_BRL1" == "1" ]]; then
  if [[ "${#SEED_WALLETS[@]}" -eq 0 ]]; then
    echo "[staging-fork] QA keys, QA addresses, or QA_SEED_WALLETS are required when SEED_QA_BRL1=1" >&2
    exit 1
  fi

  SEED_ARGS=(
    --rpc-url "$LOCAL_FORK_RPC_URL" \
    --token "$BRL1_ADDRESS_POLYGON" \
    --amount-brl1 "$QA_BRL1_AMOUNT" \
  )
  for wallet in "${SEED_WALLETS[@]}"; do
    SEED_ARGS+=(--wallet "$wallet")
  done

  node "$REPO_ROOT/scripts/blockchain/seed-fork-brl1.mjs" "${SEED_ARGS[@]}" \
    > "$CACHE_DIR/seed-brl1.json"
fi

expire_prefunding_invites_after_fresh_recovery

if [[ -f "$ANVIL_DIR/fresh-fork-required" ]]; then
  mv "$ANVIL_DIR/fresh-fork-required" "$ANVIL_DIR/fresh-fork-required.handled.$(date -u +%Y%m%dT%H%M%SZ)"
fi

FORK_RECOVERY_TARGET_BLOCK="$(cast block-number --rpc-url "$LOCAL_FORK_RPC_URL" 2>/dev/null || printf '%s' "$DUELLY_DEPLOYMENT_BLOCK")"
IMMEDIATE_BACKUP_READY=0
if [[ -f "$REPO_ROOT/scripts/blockchain/staging-fork-backup.sh" ]] && wait_for_state_file_block "$FORK_RECOVERY_TARGET_BLOCK"; then
  IMMEDIATE_BACKUP_READY=1
fi
release_backup_lock_for_deployment_env_update
if [[ "$IMMEDIATE_BACKUP_READY" == "1" ]]; then
  APP_DIR="$REPO_ROOT" \
    ANVIL_DIR="$ANVIL_DIR" \
    STATE_FILE="$ANVIL_DIR/state.json" \
    BACKUP_DIR="$ANVIL_DIR/backups" \
    DEPLOYMENT_ENV="$CACHE_DIR/deployment.env" \
    STAGING_FORK_BACKUP_RETENTION_COUNT="$STAGING_FORK_BACKUP_RETENTION_COUNT" \
    "$REPO_ROOT/scripts/blockchain/staging-fork-backup.sh" >/dev/null || true
fi

if systemd_can_manage_fork; then
  systemctl start duelly-staging-fork-recover.service >/dev/null || true
fi

echo "[staging-fork] deployment written to $CACHE_DIR/deployment.env"
echo "[staging-fork] escrow: $DUELLY_ESCROW_ADDRESS"
echo "[staging-fork] deployment block: $DUELLY_DEPLOYMENT_BLOCK"
echo "[staging-fork] seeded wallet count: ${#SEED_WALLETS[@]}"
echo "[staging-fork] anvil state source: $(cat "$ANVIL_DIR/state-source" 2>/dev/null || printf 'unknown')"
echo "[staging-fork] latest valid backup: $(latest_backup_label)"
