#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

NODE_BIN="${NODE_BIN:-}"
if [[ -z "$NODE_BIN" ]]; then
  if command -v node >/dev/null 2>&1; then
    NODE_BIN="$(command -v node)"
  elif [[ -x "/mnt/c/Program Files/nodejs/node.exe" ]]; then
    NODE_BIN="/mnt/c/Program Files/nodejs/node.exe"
  else
    echo "[qa] node is required. Set NODE_BIN or add node to PATH." >&2
    exit 1
  fi
fi

echo "[qa] validate harness"
"$NODE_BIN" scripts/harness/validate-harness.mjs

echo "[qa] blockchain erc20 self-test"
"$NODE_BIN" scripts/blockchain/erc20-inspect.mjs --self-test

echo "[qa] polymarket condition self-test"
"$NODE_BIN" scripts/blockchain/polymarket-condition-inspect.mjs --self-test

echo "[qa] render PR body self-test"
"$NODE_BIN" scripts/harness/render-pr-body.mjs --self-test

if [[ -f package.json ]]; then
  echo "[qa] root tests"
  npm run test:root

  echo "[qa] workspace tests"
  npm run test:workspaces
fi

echo "[qa] ok"
