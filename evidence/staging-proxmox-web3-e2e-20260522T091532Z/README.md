# Proxmox Staging Web3 E2E Evidence

Generated on 2026-05-22 against staging host `10.0.1.220`.

## Deployment

- Repository path on host: `/opt/duelly/app`
- Branch: `codex/staging-fork-web3-e2e`
- Commit: `11bdd3f3670a83d64c055c66ed5c220b119ae6d0`
- Services: `postgresql`, `duelly-anvil`, `duelly-backend`, `duelly-frontend`
- Public staging URLs:
  - Frontend: `http://10.0.1.220:5173`
  - Backend: `http://10.0.1.220:3000`
  - Anvil fork RPC: `http://10.0.1.220:8545`

## Results

- Backend `/ready`: `database=connected`
- Fork RPC chain id: `0x89`
- Real BRL1, real Polymarket CTF, and fork-local escrow all had deployed bytecode.
- QA maker and taker had `1000` fork-local BRL1 each from the real BRL1 token contract.
- Playwright staging-fork E2E passed 1/1 and funded bet `1`.
- Manual `resolveFromPolymarket` trigger recorded pending with `ConditionUnresolved`, which is expected while the live CTF condition is unresolved.
- `npm test`, `npm run qa`, `npm run validate`, mirror self-test, and `git diff --check` passed on the staging host.

## Key Artifacts

- `playwright-staging-fork.log`
- `playwright-output/staging-fork-staging-fork--c70d7-s-unresolved-market-pending-chromium-mobile/staging-fork-funded-pending.png`
- `e2e-bets-sanitized.json`
- `resolution-run-pending.json`
- `brl1-maker.json`
- `brl1-taker.json`
- `ops-status.txt`
- `npm-test.log`
- `npm-qa.log`

## Redaction

This folder was scanned locally against the root `.env` secret values for staging SSH, QA wallets, the relayer wallet, the Polygon provider URL, and the database. No matching secret values were found.
