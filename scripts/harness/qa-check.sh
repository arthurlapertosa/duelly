#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

echo "[qa] validate harness"
node scripts/harness/validate-harness.mjs

echo "[qa] blockchain erc20 self-test"
node scripts/blockchain/erc20-inspect.mjs --self-test

echo "[qa] polymarket condition self-test"
node scripts/blockchain/polymarket-condition-inspect.mjs --self-test

echo "[qa] render PR body self-test"
node scripts/harness/render-pr-body.mjs --self-test

if [[ -f package.json ]]; then
  echo "[qa] root tests"
  npm run test:root

  echo "[qa] workspace tests"
  npm run test:workspaces
fi

echo "[qa] ok"
