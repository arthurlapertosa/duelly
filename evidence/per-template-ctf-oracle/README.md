# Per-Template CTF Oracle QA Evidence

Worktree: `/home/arthur/lyth/worktrees/duelly-per-template-ctf-oracle`

## Automated QA

```text
npm --workspace backend run typecheck
PASS

npm --workspace backend test
PASS: 93 tests, 90 passed, 3 skipped optional PostgreSQL integration tests

npm run test
PASS: root 41/41, frontend 19/19, backend 93 tests with 3 optional skips, smartcontract Forge 50/50

npm run qa
PASS

node --check scripts/qa/explore-template-ctf-sync.mjs
bash -n scripts/blockchain/deploy-staging-fork.sh scripts/deploy/proxmox-staging-pm2.sh
PASS
```

## Exploratory Template CTF Sync

Command used a local Anvil Polygon fork on chain `137`, root `.env`, and the latest local `cache/staging-fork/deployment.env` found in the existing worktrees.

```json
{
  "ok": true,
  "templateId": "live-1830523",
  "conditionId": "0x1b42fe612e6be026a1da4f73027d03ab8f8c7b6b5e99af0019f2533b68cb5e34",
  "firstStatus": "prepared",
  "secondStatus": "prepared",
  "sourceDenominator": "0",
  "forkDenominator": "0",
  "forkOutcomeSlotCount": 2,
  "removedExistingCondition": true
}
```

Backend log evidence:

```text
resolution mirror selected CTF oracle: oracleAddress=0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296 oracleSource=template:configured-neg-risk
template CTF sync prepared: conditionId=0x1b42fe612e6be026a1da4f73027d03ab8f8c7b6b5e99af0019f2533b68cb5e34 sourceDenominator=0 forkDenominator=0
template CTF sync prepared: conditionId=0x1b42fe612e6be026a1da4f73027d03ab8f8c7b6b5e99af0019f2533b68cb5e34 sourceDenominator=0 forkDenominator=0
```

## Exploratory Funded-Bet Resolution

The run used an Anvil snapshot, injected a fork-local resolved payout for the funded bet condition, called `POST /internal/resolution/run`, then reverted the fork, reindexed, and removed the temporary QA resolution attempt.

```json
{
  "ok": true,
  "betId": "1",
  "conditionId": "0x1b42fe612e6be026a1da4f73027d03ab8f8c7b6b5e99af0019f2533b68cb5e34",
  "attemptStatus": "resolved",
  "transactionHash": "0x3febb442d8018bc7f8c119d3646ba5dee757eaf834275fa851cd5f68ffca5b63",
  "betStatusAfterReindex": "Resolved"
}
```

Cleanup verification:

```text
indexed_bets current deployment bet 1 status: Funded
temporary resolution_attempts rows for tx 0x3febb442d8018bc7f8c119d3646ba5dee757eaf834275fa851cd5f68ffca5b63: 0
```
