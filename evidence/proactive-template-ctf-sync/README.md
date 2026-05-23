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
git diff --check
```

## Results

- `npm --workspace backend run typecheck`: passed.
- `npm --workspace backend run test:unit`: 79 passed, 0 failed.
- `npm --workspace backend test`: 79 passed, 3 skipped PostgreSQL integration cases, 0 failed.
- `npm run test`: root, frontend, backend, smartcontract Node tests, and Forge tests passed.
- `npm run qa`: passed; harness, blockchain self-tests, root/workspace tests, and Forge tests passed.
- `node --check scripts/qa/explore-template-ctf-sync.mjs`: passed.
- `git diff --check`: passed.

## Exploratory QA

Added `scripts/qa/explore-template-ctf-sync.mjs` and documented it in `docs/STAGING_FORK_QA.md`.

The full exploratory run was not executed from this worktree because it requires a local or staging Anvil Polygon fork plus a backend process running this branch against the fork database. The committed script performs the requested flow: start backend, select a live template whose fork CTF condition is missing, sync, verify logs and CTF state, revert fork snapshot, and re-sync to prove recreation.

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
