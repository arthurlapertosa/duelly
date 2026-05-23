# Proactive Template CTF Sync Evidence

## Scope

- Worktree: `/home/arthur/lyth/worktrees/duelly-proactive-template-ctf-sync`
- Branch: `task/proactive-template-ctf-sync`
- Base: `origin/main` at `267d4c1`
- Frontend parity: not applicable; no frontend files changed.

## Commands

```bash
npm ci
npm --workspace backend run typecheck
npm --workspace backend run test:unit
npm --workspace backend test
npm run test
npm run qa
node --check scripts/qa/explore-template-ctf-sync.mjs
node scripts/qa/explore-template-ctf-sync.mjs --help
LOCAL_FORK_RPC_URL=http://10.0.1.220:8545 \
  CHAIN_RPC_URL=http://10.0.1.220:8545 \
  POLYMARKET_RESOLUTION_MIRROR_ALLOW_NON_LOCAL_FORK_RPC=true \
  POLYMARKET_NEG_RISK_CTF_ORACLE_ADDRESS=0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296 \
  node scripts/qa/explore-template-ctf-sync.mjs \
    --deployment-env /tmp/duelly-staging-deployment.u6mYa0.env \
    --port 3091
git diff --check
```

## Results

- `npm --workspace backend run typecheck`: passed after syncing with current `main`.
- `npm --workspace backend run test:unit`: 81 passed, 0 failed after syncing with current `main`.
- `npm --workspace backend test`: 79 passed, 3 skipped PostgreSQL integration cases, 0 failed.
- `npm run test`: root, frontend, backend, smartcontract Node tests, and Forge tests passed.
- `npm run qa`: passed; harness, blockchain self-tests, root/workspace tests, and Forge tests passed.
- `node --check scripts/qa/explore-template-ctf-sync.mjs`: passed.
- `scripts/qa/explore-template-ctf-sync.mjs` against staging Anvil fork: passed.
- `git diff --check`: passed.

## Exploratory QA

Added `scripts/qa/explore-template-ctf-sync.mjs` and documented it in `docs/STAGING_FORK_QA.md`.

The full exploratory run was executed from this worktree against the staging Anvil fork at `10.0.1.220:8545`. The script started a temporary backend on port `3091`, removed the selected already-prepared fork CTF condition under an Anvil snapshot, called `POST /internal/templates/ctf-sync/run`, verified the condition was prepared and logged, reverted to the removed-condition snapshot, and repeated the sync.

Result:

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
  "removedExistingCondition": true,
  "backendLogPath": "/tmp/duelly-template-ctf-sync-a5Sum2/backend.log"
}
```

The backend log contains `template CTF condition prepared` and `template CTF sync prepared` entries for the target `conditionId` on both sync runs.

## Staging Health Snapshot

Checked `root@10.0.1.220` on 2026-05-23 UTC without copying secrets.

- Host: `duelly-hml`
- Services: `duelly-anvil.service`, `pm2-root.service`, `postgresql@16-main.service`, `postgresql.service`, and `cron.service` active.
- Anvil chain id: `0x89` (Polygon 137 fork).
- PM2: `duelly-backend` and `duelly-frontend` online with 0 restarts for current processes.
- Backend readiness: `http://127.0.0.1:3000/health` and `/ready` returned OK.
- Discovery worker: started with `intervalMs=900000`; latest discovery runs at `09:20`, `09:35`, and `09:50` UTC all succeeded in about 7 seconds.
- Condition resolution cache: latest checks at `09:51:07` UTC; 561 unresolved and 8 resolved statuses persisted.
- Resolution worker: current backend PID has 0 `resolution worker tick failed` log entries; recent attempts are pending with `ConditionUnresolved`, which is expected while Polymarket source conditions are unresolved.
- Note: previous backend PID logged repeated `resolution worker tick failed` errors between about `05:51` and `06:20` UTC due an `indexed_chain_events` conflict-index mismatch. That pattern is not present for the current backend PID.

## Risks / Follow-ups

- The new proactive sync remains gated behind local-fork safety checks and should stay staging/fork-only.
- Staging still has two historical `registerTemplate` relayer attempts marked `submitted`, but the related funding path has succeeded and current operation is not blocked.
