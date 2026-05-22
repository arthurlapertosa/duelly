#!/usr/bin/env bash
# Starts the Duelly local stack (backend + frontend) against the anvil fork.
#
# Prerequisites (started separately, see docs/LOCAL_FORK_QA.md):
#   - anvil fork on http://127.0.0.1:8545 (chain 137)
#   - postgres reachable with the credentials in backend/.env
#   - contracts deployed; cache/staging-fork/deployment.env or cache/m3-local-fork/deployment.env present
#
# Usage:
#   scripts/dev/start-stack.sh
#
# Ctrl-C stops both services.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOG_DIR="${LOG_DIR:-/tmp/duelly-stack}"
mkdir -p "$LOG_DIR"

if [[ -f "$REPO_ROOT/.env" ]]; then
  echo "[stack] sourcing root .env"
  set -a; source "$REPO_ROOT/.env"; set +a
fi

# Make the local deployment block available to the backend indexer.
DEPLOYMENT_ENV="${DEPLOYMENT_ENV:-}"
if [[ -z "$DEPLOYMENT_ENV" && -f "$REPO_ROOT/cache/staging-fork/deployment.env" ]]; then
  DEPLOYMENT_ENV="$REPO_ROOT/cache/staging-fork/deployment.env"
elif [[ -z "$DEPLOYMENT_ENV" ]]; then
  DEPLOYMENT_ENV="$REPO_ROOT/cache/m3-local-fork/deployment.env"
fi
if [[ -f "$DEPLOYMENT_ENV" ]]; then
  echo "[stack] sourcing $DEPLOYMENT_ENV"
  set -a; source "$DEPLOYMENT_ENV"; set +a
  export DUELLY_DEPLOYMENT_BLOCK="${DUELLY_DEPLOYMENT_BLOCK:-0}"
fi

RPC_URL="${CHAIN_RPC_URL:-${LOCAL_FORK_RPC_URL:-http://127.0.0.1:8545}}"
BACKEND_PORT="${PORT:-3000}"
BACKEND_HEALTH_URL="http://127.0.0.1:$BACKEND_PORT/health"

echo "[stack] verifying anvil fork at $RPC_URL"
chain_id="$(curl -sS -m 5 -X POST "$RPC_URL" -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' \
  | sed -n 's/.*"result":"\([^"]*\)".*/\1/p')"
if [[ "$chain_id" != "0x89" ]]; then
  echo "[stack] anvil fork not reachable (expected chainId 0x89, got '${chain_id:-none}')." >&2
  echo "[stack] start it first — see docs/LOCAL_FORK_QA.md." >&2
  exit 1
fi

cleanup() {
  echo
  echo "[stack] stopping..."
  [[ -n "${BACKEND_PID:-}" ]] && kill "$BACKEND_PID" 2>/dev/null || true
  [[ -n "${FRONTEND_PID:-}" ]] && kill "$FRONTEND_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "[stack] starting backend (logs: $LOG_DIR/backend.log)"
(cd "$REPO_ROOT/backend" && npm run dev) > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!

for _ in $(seq 1 60); do
  if curl -fsS -m 2 "$BACKEND_HEALTH_URL" >/dev/null 2>&1; then break; fi
  sleep 1
done
if ! curl -fsS -m 2 "$BACKEND_HEALTH_URL" >/dev/null 2>&1; then
  echo "[stack] backend failed to come up — see $LOG_DIR/backend.log" >&2
  exit 1
fi
echo "[stack] backend ready on http://127.0.0.1:$BACKEND_PORT"

echo "[stack] starting frontend (logs: $LOG_DIR/frontend.log)"
(cd "$REPO_ROOT/frontend" && npm run dev) > "$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!

echo "[stack] frontend starting on http://127.0.0.1:5173"
echo "[stack] stack is up — press Ctrl-C to stop."
wait
