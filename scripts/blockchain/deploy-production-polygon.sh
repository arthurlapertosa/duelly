#!/usr/bin/env bash
# Deploys Duelly's escrow to Polygon mainnet and writes production deployment
# state for the backend/frontend stack. This script broadcasts real transactions.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CACHE_DIR="${CACHE_DIR:-$REPO_ROOT/cache/production}"
RELAYER_ENV="${RELAYER_ENV:-/etc/duelly/production/relayer.env}"
EXPECTED_RELAYER_ADDRESS="${EXPECTED_RELAYER_ADDRESS:-0x02Ee8283927d7e3Fd3f3f392a8E7e14E4E986785}"
DEFAULT_PRODUCTION_POLYGON_RPC_URL="https://polygon-rpc.com"
PRODUCTION_BRL1_TOKEN_ADDRESS="0x5C067C80C00eCd2345b05E83A3e758eF799C40B5"
PRODUCTION_POLYMARKET_CTF_ADDRESS="0x4D97DCd97eC945f40cF65F87097ACe5EA0476045"
CHAIN_ID="${CHAIN_ID:-137}"
MIN_RELAYER_BALANCE_WEI="${MIN_RELAYER_BALANCE_WEI:-10000000000000000000}"
MIN_LOSER_FEE_WEI="${MIN_LOSER_FEE_WEI:-3000000000000000000}"
RESOLUTION_WORKER_INTERVAL_MS="${RESOLUTION_WORKER_INTERVAL_MS:-60000}"
RESOLUTION_WORKER_BATCH_SIZE="${RESOLUTION_WORKER_BATCH_SIZE:-10}"
RESOLUTION_WORKER_PENDING_RETRY_SECONDS="${RESOLUTION_WORKER_PENDING_RETRY_SECONDS:-900}"
RELAYER_WORKER_ENABLED="${RELAYER_WORKER_ENABLED:-true}"
RELAYER_WORKER_INTERVAL_MS="${RELAYER_WORKER_INTERVAL_MS:-3000}"
RELAYER_WORKER_BATCH_SIZE="${RELAYER_WORKER_BATCH_SIZE:-5}"
RELAYER_WORKER_PROCESSING_TIMEOUT_MS="${RELAYER_WORKER_PROCESSING_TIMEOUT_MS:-120000}"
POLYMARKET_CTF_ORACLE_ADDRESS="${POLYMARKET_CTF_ORACLE_ADDRESS:-0x6A9D222616C90FcA5754cd1333cFD9b7fb6a4F74}"
POLYMARKET_CTF_ORACLE_ADDRESSES="${POLYMARKET_CTF_ORACLE_ADDRESSES:-0x65070BE91477460D8A7AeEb94ef92fe056C2f2A7,0x6A9D222616C90FcA5754cd1333cFD9b7fb6a4F74}"
POLYMARKET_NEG_RISK_CTF_ORACLE_ADDRESS="${POLYMARKET_NEG_RISK_CTF_ORACLE_ADDRESS:-0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296}"
POLYMARKET_TEMPLATE_CTF_SYNC_BATCH_SIZE="${POLYMARKET_TEMPLATE_CTF_SYNC_BATCH_SIZE:-50}"
POLYMARKET_TEMPLATE_CTF_SYNC_CONCURRENCY="${POLYMARKET_TEMPLATE_CTF_SYNC_CONCURRENCY:-2}"
POLYMARKET_MIN_BETTING_CLOSE_BUFFER_HOURS="${POLYMARKET_MIN_BETTING_CLOSE_BUFFER_HOURS:-2}"
DRY_RUN=0

PATH="$HOME/.foundry/bin:$PATH"

usage() {
  cat <<'EOF'
Usage:
  scripts/blockchain/deploy-production-polygon.sh [--dry-run]
  scripts/blockchain/deploy-production-polygon.sh --self-test

Broadcasts a real Polygon mainnet deployment unless --dry-run is passed.
EOF
}

required_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "[prod-deploy] missing required env: $name" >&2
    exit 1
  fi
}

required_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "[prod-deploy] missing required command: $1" >&2
    exit 1
  fi
}

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

source_env_file() {
  local path="$1"
  set -a
  # shellcheck disable=SC1090
  source "$path"
  set +a
}

apply_production_constants() {
  POLYGON_RPC_URL="${POLYGON_RPC_URL:-$DEFAULT_PRODUCTION_POLYGON_RPC_URL}"
  CHAIN_RPC_URL="$POLYGON_RPC_URL"
  BRL1_ADDRESS_POLYGON="$PRODUCTION_BRL1_TOKEN_ADDRESS"
  BRL1_TOKEN_ADDRESS="$PRODUCTION_BRL1_TOKEN_ADDRESS"
  POLYMARKET_CTF_ADDRESS="$PRODUCTION_POLYMARKET_CTF_ADDRESS"
}

normalize_key() {
  local key="$1"
  [[ "$key" == 0x* ]] && printf '%s' "$key" || printf '0x%s' "$key"
}

lower() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]'
}

wei_gte() {
  node --input-type=module - "$1" "$2" <<'NODE'
const [actual, minimum] = process.argv.slice(2).map(BigInt);
process.exit(actual >= minimum ? 0 : 1);
NODE
}

json_field() {
  local field="$1"
  node -e '
let input = "";
process.stdin.on("data", (chunk) => input += chunk);
process.stdin.on("end", () => {
  const body = JSON.parse(input);
  const field = process.argv[1];
  const value = body[field] ?? body.receipt?.[field];
  if (value === undefined || value === null || value === "") process.exit(1);
  console.log(value);
});
' "$field"
}

json_block_number() {
  node -e '
let input = "";
process.stdin.on("data", (chunk) => input += chunk);
process.stdin.on("end", () => {
  const body = JSON.parse(input);
  const value = body.blockNumber ?? body.receipt?.blockNumber;
  if (value === undefined || value === null || value === "") process.exit(1);
  console.log(BigInt(value).toString());
});
'
}

verify_contract() {
  local constructor_args
  constructor_args="$(cast abi-encode 'constructor(address,address,address)' "$BRL1_ADDRESS_POLYGON" "$POLYMARKET_CTF_ADDRESS" "$TREASURY_ADDRESS")"
  echo "[prod-deploy] verifying contract on Polygonscan"
  (
    cd "$REPO_ROOT/smartcontract"
    forge verify-contract "$DUELLY_ESCROW_ADDRESS" contracts/BetEscrowBRL1.sol:BetEscrowBRL1 \
      --chain 137 \
      --etherscan-api-key "$POLYGONSCAN_API_KEY" \
      --constructor-args "$constructor_args" \
      --watch
  )
}

write_deployment_env() {
  local path="$1"
  mkdir -p "$(dirname "$path")"
  umask 077
  cat > "$path" <<EOF
CHAIN_RPC_URL=$POLYGON_RPC_URL
CHAIN_ID=137
CHAIN_ENABLED=true
BRL1_TOKEN_ADDRESS=$BRL1_ADDRESS_POLYGON
BRL1_ADDRESS_POLYGON=$BRL1_ADDRESS_POLYGON
POLYMARKET_CTF_ADDRESS=$POLYMARKET_CTF_ADDRESS
DUELLY_ESCROW_ADDRESS=$DUELLY_ESCROW_ADDRESS
DUELLY_DEPLOYMENT_BLOCK=$DUELLY_DEPLOYMENT_BLOCK
RELAYER_ADDRESS=$RELAYER_ADDRESS
TREASURY_ADDRESS=$TREASURY_ADDRESS
RESOLUTION_WORKER_ENABLED=true
RESOLUTION_WORKER_INTERVAL_MS=$RESOLUTION_WORKER_INTERVAL_MS
RESOLUTION_WORKER_BATCH_SIZE=$RESOLUTION_WORKER_BATCH_SIZE
RESOLUTION_WORKER_PENDING_RETRY_SECONDS=$RESOLUTION_WORKER_PENDING_RETRY_SECONDS
RELAYER_WORKER_ENABLED=$RELAYER_WORKER_ENABLED
RELAYER_WORKER_INTERVAL_MS=$RELAYER_WORKER_INTERVAL_MS
RELAYER_WORKER_BATCH_SIZE=$RELAYER_WORKER_BATCH_SIZE
RELAYER_WORKER_PROCESSING_TIMEOUT_MS=$RELAYER_WORKER_PROCESSING_TIMEOUT_MS
POLYMARKET_RESOLUTION_MIRROR_ENABLED=false
POLYMARKET_CTF_ORACLE_ADDRESS=$POLYMARKET_CTF_ORACLE_ADDRESS
POLYMARKET_CTF_ORACLE_ADDRESSES=$POLYMARKET_CTF_ORACLE_ADDRESSES
POLYMARKET_NEG_RISK_CTF_ORACLE_ADDRESS=$POLYMARKET_NEG_RISK_CTF_ORACLE_ADDRESS
POLYMARKET_RESOLUTION_MIRROR_OUTCOME_SLOT_COUNT=2
POLYMARKET_RESOLUTION_MIRROR_ALLOW_NON_LOCAL_FORK_RPC=false
POLYMARKET_TEMPLATE_CTF_SYNC_ENABLED=false
POLYMARKET_TEMPLATE_CTF_SYNC_SOURCE_RPC_URL=
POLYMARKET_TEMPLATE_CTF_SYNC_BATCH_SIZE=$POLYMARKET_TEMPLATE_CTF_SYNC_BATCH_SIZE
POLYMARKET_TEMPLATE_CTF_SYNC_CONCURRENCY=$POLYMARKET_TEMPLATE_CTF_SYNC_CONCURRENCY
POLYMARKET_DISCOVERY_MODE=live
POLYMARKET_LIVE_DISCOVERY_ENABLED=true
POLYMARKET_ALLOW_NEG_RISK=false
POLYMARKET_MIN_BETTING_CLOSE_BUFFER_HOURS=$POLYMARKET_MIN_BETTING_CLOSE_BUFFER_HOURS
POLYMARKET_MIN_BETTING_CLOSE_BUFFER_SECONDS=
EOF
  chmod 600 "$path"
}

self_test() {
  local tmp_dir
  tmp_dir="$(mktemp -d)"
  trap "rm -rf '$tmp_dir'" EXIT

  apply_production_constants
  DUELLY_ESCROW_ADDRESS=0x1111111111111111111111111111111111111111
  DUELLY_DEPLOYMENT_BLOCK=123
  RELAYER_ADDRESS="$EXPECTED_RELAYER_ADDRESS"
  TREASURY_ADDRESS=0x2222222222222222222222222222222222222222
  write_deployment_env "$tmp_dir/deployment.env"

  grep -q '^CHAIN_ID=137$' "$tmp_dir/deployment.env"
  grep -q '^CHAIN_ENABLED=true$' "$tmp_dir/deployment.env"
  grep -q '^POLYMARKET_DISCOVERY_MODE=live$' "$tmp_dir/deployment.env"
  grep -q '^POLYMARKET_ALLOW_NEG_RISK=false$' "$tmp_dir/deployment.env"
  grep -q '^POLYMARKET_RESOLUTION_MIRROR_ENABLED=false$' "$tmp_dir/deployment.env"
  grep -q '^POLYMARKET_TEMPLATE_CTF_SYNC_ENABLED=false$' "$tmp_dir/deployment.env"
  if grep -Eq 'LOCAL_FORK_RPC_URL|QA_MAKER|QA_TAKER|QA_SEED' "$tmp_dir/deployment.env"; then
    echo "[prod-deploy] self-test found staging/fork fields" >&2
    exit 1
  fi
  echo "[prod-deploy] self-test ok"
}

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --self-test) self_test; exit 0 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "[prod-deploy] unknown argument: $arg" >&2; usage >&2; exit 1 ;;
  esac
done

assert_relayers_key_not_in_env_file "$REPO_ROOT/.env"
if [[ -f "$REPO_ROOT/.env" ]]; then
  source_env_file "$REPO_ROOT/.env"
fi

if [[ ! -f "$RELAYER_ENV" ]]; then
  echo "[prod-deploy] missing relayer secret env: $RELAYER_ENV" >&2
  exit 1
fi
assert_secret_file_permissions "$RELAYER_ENV"
source_env_file "$RELAYER_ENV"
apply_production_constants

required_cmd cast
required_cmd forge
required_cmd node

required_env RELAYER_PRIVATE_KEY
required_env TREASURY_ADDRESS
required_env POLYGONSCAN_API_KEY

if [[ "$CHAIN_ID" != "137" ]]; then
  echo "[prod-deploy] CHAIN_ID must be 137 for Polygon production" >&2
  exit 1
fi

RELAYER_PRIVATE_KEY="$(normalize_key "$RELAYER_PRIVATE_KEY")"
RELAYER_ADDRESS="$(cast wallet address --private-key "$RELAYER_PRIVATE_KEY")"
if [[ "$(lower "$RELAYER_ADDRESS")" != "$(lower "$EXPECTED_RELAYER_ADDRESS")" ]]; then
  echo "[prod-deploy] RELAYER_PRIVATE_KEY resolves to $RELAYER_ADDRESS, expected $EXPECTED_RELAYER_ADDRESS" >&2
  exit 1
fi

RPC_CHAIN_ID="$(cast chain-id --rpc-url "$POLYGON_RPC_URL")"
if [[ "$RPC_CHAIN_ID" != "137" ]]; then
  echo "[prod-deploy] RPC chain id must be 137, got $RPC_CHAIN_ID" >&2
  exit 1
fi

RELAYER_BALANCE_WEI="$(cast balance "$RELAYER_ADDRESS" --rpc-url "$POLYGON_RPC_URL")"
if ! wei_gte "$RELAYER_BALANCE_WEI" "$MIN_RELAYER_BALANCE_WEI"; then
  echo "[prod-deploy] relayer balance is below required minimum 10 POL" >&2
  exit 1
fi

echo "[prod-deploy] relayer: $RELAYER_ADDRESS"
echo "[prod-deploy] balance wei: $RELAYER_BALANCE_WEI"
echo "[prod-deploy] chain id: $RPC_CHAIN_ID"

if [[ "$DRY_RUN" == "1" ]]; then
  echo "[prod-deploy] dry run passed; no transactions broadcast"
  exit 0
fi

mkdir -p "$CACHE_DIR"
chmod 0700 "$CACHE_DIR" 2>/dev/null || true

echo "[prod-deploy] deploying BetEscrowBRL1 to Polygon"
DEPLOY_JSON="$(
  cd "$REPO_ROOT/smartcontract"
  forge create contracts/BetEscrowBRL1.sol:BetEscrowBRL1 \
    --rpc-url "$POLYGON_RPC_URL" \
    --chain 137 \
    --private-key "$RELAYER_PRIVATE_KEY" \
    --broadcast \
    --json \
    --constructor-args "$BRL1_ADDRESS_POLYGON" "$POLYMARKET_CTF_ADDRESS" "$TREASURY_ADDRESS"
)"
DUELLY_ESCROW_ADDRESS="$(printf '%s' "$DEPLOY_JSON" | json_field deployedTo)"
DEPLOY_TX="$(printf '%s' "$DEPLOY_JSON" | json_field transactionHash)"
DUELLY_DEPLOYMENT_BLOCK="$(cast receipt "$DEPLOY_TX" --rpc-url "$POLYGON_RPC_URL" --json | json_block_number)"

echo "[prod-deploy] escrow: $DUELLY_ESCROW_ADDRESS"
echo "[prod-deploy] deployment block: $DUELLY_DEPLOYMENT_BLOCK"
echo "[prod-deploy] configuring min loser fee"
MIN_FEE_TX="$(
  cast send "$DUELLY_ESCROW_ADDRESS" \
    'setMinLoserFee(uint256)' \
    "$MIN_LOSER_FEE_WEI" \
    --rpc-url "$POLYGON_RPC_URL" \
    --private-key "$RELAYER_PRIVATE_KEY" \
    --json | json_field transactionHash
)"
cast receipt "$MIN_FEE_TX" --rpc-url "$POLYGON_RPC_URL" >/dev/null

OWNER="$(cast call "$DUELLY_ESCROW_ADDRESS" 'owner()(address)' --rpc-url "$POLYGON_RPC_URL")"
if [[ "$(lower "$OWNER")" != "$(lower "$RELAYER_ADDRESS")" ]]; then
  echo "[prod-deploy] unexpected owner $OWNER" >&2
  exit 1
fi

MIN_FEE="$(cast call "$DUELLY_ESCROW_ADDRESS" 'minLoserFee()(uint256)' --rpc-url "$POLYGON_RPC_URL" | awk '{print $1}')"
if [[ "$MIN_FEE" != "$MIN_LOSER_FEE_WEI" ]]; then
  echo "[prod-deploy] unexpected minLoserFee $MIN_FEE" >&2
  exit 1
fi

ROLE_HASH="$(cast keccak TEMPLATE_PUBLISHER_ROLE)"
HAS_ROLE="$(cast call "$DUELLY_ESCROW_ADDRESS" 'hasRole(bytes32,address)(bool)' "$ROLE_HASH" "$RELAYER_ADDRESS" --rpc-url "$POLYGON_RPC_URL")"
if [[ "$HAS_ROLE" != "true" ]]; then
  echo "[prod-deploy] relayer did not pass TEMPLATE_PUBLISHER_ROLE owner fallback" >&2
  exit 1
fi

write_deployment_env "$CACHE_DIR/deployment.env"
verify_contract

echo "[prod-deploy] deployment written to $CACHE_DIR/deployment.env"
echo "[prod-deploy] complete"
