#!/usr/bin/env bash
# Deploys Duelly's escrow to a production-like Anvil fork using real Polygon
# BRL1 and real Polymarket CTF contracts. All writes are fork-local.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CACHE_DIR="${CACHE_DIR:-$REPO_ROOT/cache/staging-fork}"
LOCAL_FORK_RPC_URL="${LOCAL_FORK_RPC_URL:-http://127.0.0.1:8545}"
LOCAL_FORK_CHAIN_ID="${LOCAL_FORK_CHAIN_ID:-137}"
MIN_LOSER_FEE_WEI="${MIN_LOSER_FEE_WEI:-3000000000000000000}"
START_ANVIL="${START_ANVIL:-0}"
SEED_QA_BRL1="${SEED_QA_BRL1:-0}"
QA_BRL1_AMOUNT="${QA_BRL1_AMOUNT:-1000}"
QA_SEED_WALLETS="${QA_SEED_WALLETS:-}"
ALLOW_NON_LOCAL_FORK_RPC="${ALLOW_NON_LOCAL_FORK_RPC:-0}"
RESOLUTION_WORKER_INTERVAL_MS="${RESOLUTION_WORKER_INTERVAL_MS:-60000}"
RESOLUTION_WORKER_BATCH_SIZE="${RESOLUTION_WORKER_BATCH_SIZE:-10}"
RESOLUTION_WORKER_PENDING_RETRY_SECONDS="${RESOLUTION_WORKER_PENDING_RETRY_SECONDS:-300}"
POLYMARKET_CTF_ORACLE_ADDRESS="${POLYMARKET_CTF_ORACLE_ADDRESS:-0x6A9D222616C90FcA5754cd1333cFD9b7fb6a4F74}"
POLYMARKET_RESOLUTION_MIRROR_ENABLED="${POLYMARKET_RESOLUTION_MIRROR_ENABLED:-true}"
POLYMARKET_RESOLUTION_MIRROR_OUTCOME_SLOT_COUNT="${POLYMARKET_RESOLUTION_MIRROR_OUTCOME_SLOT_COUNT:-2}"
POLYMARKET_RESOLUTION_MIRROR_ALLOW_NON_LOCAL_FORK_RPC="${POLYMARKET_RESOLUTION_MIRROR_ALLOW_NON_LOCAL_FORK_RPC:-$ALLOW_NON_LOCAL_FORK_RPC}"
POLYMARKET_TEMPLATE_CTF_SYNC_ENABLED="${POLYMARKET_TEMPLATE_CTF_SYNC_ENABLED:-$POLYMARKET_RESOLUTION_MIRROR_ENABLED}"
POLYMARKET_TEMPLATE_CTF_SYNC_BATCH_SIZE="${POLYMARKET_TEMPLATE_CTF_SYNC_BATCH_SIZE:-50}"
POLYMARKET_TEMPLATE_CTF_SYNC_CONCURRENCY="${POLYMARKET_TEMPLATE_CTF_SYNC_CONCURRENCY:-2}"
STAGING_MIN_BETTING_CLOSE_BUFFER_HOURS="${STAGING_MIN_BETTING_CLOSE_BUFFER_HOURS:-0}"

PATH="$HOME/.foundry/bin:$PATH"

if [[ -f "$REPO_ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$REPO_ROOT/.env"
  set +a
fi

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

mkdir -p "$CACHE_DIR"

required_env POLYGON_RPC_URL
required_env BRL1_ADDRESS_POLYGON
required_env POLYMARKET_CTF_ADDRESS
required_env RELAYER_PRIVATE_KEY
required_env TREASURY_ADDRESS

if ! is_local_rpc && [[ "$ALLOW_NON_LOCAL_FORK_RPC" != "1" ]]; then
  echo "[staging-fork] refusing to deploy to non-local RPC: $LOCAL_FORK_RPC_URL" >&2
  echo "[staging-fork] set ALLOW_NON_LOCAL_FORK_RPC=1 only for an explicitly isolated staging fork RPC." >&2
  exit 1
fi

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
      --host 127.0.0.1 \
      --port "${LOCAL_FORK_RPC_URL##*:}" \
      --accounts 0 \
      > "$CACHE_DIR/anvil.log" 2>&1 &
    echo "$!" > "$CACHE_DIR/anvil.pid"
  fi
fi

wait_for_chain

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
POLYMARKET_RESOLUTION_MIRROR_OUTCOME_SLOT_COUNT=$POLYMARKET_RESOLUTION_MIRROR_OUTCOME_SLOT_COUNT
POLYMARKET_RESOLUTION_MIRROR_ALLOW_NON_LOCAL_FORK_RPC=$POLYMARKET_RESOLUTION_MIRROR_ALLOW_NON_LOCAL_FORK_RPC
POLYMARKET_TEMPLATE_CTF_SYNC_ENABLED=$POLYMARKET_TEMPLATE_CTF_SYNC_ENABLED
POLYMARKET_TEMPLATE_CTF_SYNC_BATCH_SIZE=$POLYMARKET_TEMPLATE_CTF_SYNC_BATCH_SIZE
POLYMARKET_TEMPLATE_CTF_SYNC_CONCURRENCY=$POLYMARKET_TEMPLATE_CTF_SYNC_CONCURRENCY
POLYMARKET_DISCOVERY_MODE=live
POLYMARKET_LIVE_DISCOVERY_ENABLED=true
POLYMARKET_ALLOW_NEG_RISK=true
POLYMARKET_MIN_BETTING_CLOSE_BUFFER_HOURS=$STAGING_MIN_BETTING_CLOSE_BUFFER_HOURS
POLYMARKET_MIN_BETTING_CLOSE_BUFFER_SECONDS=
EOF

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

echo "[staging-fork] deployment written to $CACHE_DIR/deployment.env"
echo "[staging-fork] escrow: $DUELLY_ESCROW_ADDRESS"
