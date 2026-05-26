# Staging Operations

Use this for the current staging VM at `root@10.0.1.220`.

Public HML routes:

```text
frontend: https://duelly-hml.typewith.ai/
backend:  https://api-duelly-hml.typewith.ai/
```

The machine is an isolated fork-staging host. It runs live Duelly code and real Polygon contract addresses against an Anvil Polygon fork, not live Polygon state for Duelly escrow writes.

## Host Layout

```text
/opt/duelly/
  app/                 Git checkout for the Duelly monorepo.
  app/.env             Host-local secrets and deploy/runtime configuration. Do not copy to evidence.
  app/cache/staging-fork/deployment.env
                       Public fork deployment cache used by backend/frontend.
  anvil/state.json     Persistent Anvil state file.
  evidence/            Operator deployment and QA logs.
/var/log/duelly/       PM2 and Anvil logs.
```

Observed service model:

```text
duelly-anvil.service   systemd service for the persistent Anvil fork.
pm2-root.service       systemd startup wrapper for PM2.
postgresql@16-main     systemd PostgreSQL cluster.
duelly-backend         PM2 app, cwd /opt/duelly/app/backend.
duelly-frontend        PM2 app, cwd /opt/duelly/app/frontend.
```

The Anvil unit reads `/opt/duelly/app/.env`, starts from `/opt/duelly/app`, listens on port `8545`, uses chain ID `137`, and persists fork state to `/opt/duelly/anvil/state.json`. It binds to `0.0.0.0` by default so QA wallets on the private LAN can inspect balances through MetaMask. Keep port `8545` private to the staging LAN/VPN.

The fork deploy script owns Anvil service bootstrap. `scripts/blockchain/deploy-staging-fork.sh` installs or refreshes the Anvil service, recovery service, and backup timer. `scripts/deploy/proxmox-staging-pm2.sh` intentionally remains backend/frontend-only and expects `cache/staging-fork/deployment.env` to already exist.

The host-local `/opt/duelly/app/.env` must include these public staging values:

```bash
CORS_ORIGINS=https://duelly-hml.typewith.ai
VITE_API_BASE_URL=https://api-duelly-hml.typewith.ai
VITE_ALLOWED_HOSTS=duelly-hml.typewith.ai
POLYMARKET_CTF_ORACLE_ADDRESSES=0x65070BE91477460D8A7AeEb94ef92fe056C2f2A7,0x6A9D222616C90FcA5754cd1333cFD9b7fb6a4F74
POLYMARKET_NEG_RISK_CTF_ORACLE_ADDRESS=0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296
POLYMARKET_RESOLUTION_MIRROR_SOURCE_RPC_URL=
```

`POLYMARKET_TEMPLATE_CTF_SYNC_SOURCE_RPC_URL` is optional. When it is not set, proactive template CTF sync uses `POLYMARKET_RESOLUTION_MIRROR_SOURCE_RPC_URL`.
Gamma `resolvedBy` is treated as fork-write oracle metadata only when it matches one of the configured CTF oracle candidates above.

## Inspect Staging

```bash
ssh root@10.0.1.220

cd /opt/duelly/app
git status --short --branch
git log -1 --oneline

systemctl status duelly-anvil.service --no-pager
systemctl status pm2-root.service --no-pager
pm2 status

curl -fsS http://127.0.0.1:3000/health
curl -fsS http://127.0.0.1:3000/ready
curl -fsS -I http://127.0.0.1:5173 | head
```

To inspect public fork deployment state:

```bash
cd /opt/duelly/app
source cache/staging-fork/deployment.env

printf 'DUELLY_ESCROW_ADDRESS=%s\n' "$DUELLY_ESCROW_ADDRESS"
printf 'DUELLY_DEPLOYMENT_BLOCK=%s\n' "$DUELLY_DEPLOYMENT_BLOCK"
cast code "$DUELLY_ESCROW_ADDRESS" --rpc-url "$LOCAL_FORK_RPC_URL"
```

## Redeploy Backend And Frontend Only

Use this when contracts and fork state do not need to change.

```bash
ssh root@10.0.1.220

cd /opt/duelly/app
APP_DIR=/opt/duelly/app BRANCH=main scripts/deploy/proxmox-staging-pm2.sh
```

The script:

- Fetches and resets `/opt/duelly/app` to `origin/$BRANCH`.
- Runs `npm ci`.
- Sources `/opt/duelly/app/.env` and `cache/staging-fork/deployment.env`.
- Regenerates `frontend/.env` with `VITE_QA_WALLET=false` unless explicitly overridden for agent QA.
- Builds the backend.
- Builds the frontend and serves the built output through the frontend `npm run start` script on port `5173`.
- Runs backend migrations.
- Restarts `duelly-backend` and `duelly-frontend` in PM2.
- Saves the PM2 process list for `pm2-root.service`.

Verify after the deploy:

```bash
pm2 status
curl -fsS http://127.0.0.1:3000/ready
curl -fsS -I http://127.0.0.1:5173 | head
```

The deploy script also prints non-secret effective backend config after restart: CTF oracle candidate count, source RPC hostnames for funded-bet mirror and template CTF sync, and template sync enabled/batch/concurrency values.

## Redeploy Contract On Existing Fork

Use this when `BetEscrowBRL1` changed but the persistent fork can be kept. This preserves existing Anvil state and deploys a new escrow address, then updates backend/frontend to use it.

```bash
ssh root@10.0.1.220

cd /opt/duelly/app
git fetch origin main
git checkout main
git reset --hard origin/main

SEED_QA_BRL1=1 scripts/blockchain/deploy-staging-fork.sh

source cache/staging-fork/deployment.env
printf 'DUELLY_ESCROW_ADDRESS=%s\n' "$DUELLY_ESCROW_ADDRESS"
printf 'DUELLY_DEPLOYMENT_BLOCK=%s\n' "$DUELLY_DEPLOYMENT_BLOCK"

APP_DIR=/opt/duelly/app BRANCH=main scripts/deploy/proxmox-staging-pm2.sh
```

`deploy-staging-fork.sh` detects the existing local RPC at `http://127.0.0.1:8545`, deploys `BetEscrowBRL1`, configures roles and fee floor, writes `cache/staging-fork/deployment.env`, and optionally seeds QA wallets with fork-local BRL1.

The fork deploy script also idempotently installs these systemd jobs when it runs from `/opt/duelly/app` as root:

```text
duelly-anvil.service
duelly-anvil-backup.service
duelly-anvil-backup.timer
duelly-staging-fork-recover.service
```

`duelly-anvil-backup.timer` saves a validated Anvil state backup every five minutes under `/opt/duelly/anvil/backups/`. The default retention is 24 hours. Backups are written only when the persisted state matches the active deployment block and contains the deployed escrow bytecode.

Verify:

```bash
source /opt/duelly/app/cache/staging-fork/deployment.env
cast code "$DUELLY_ESCROW_ADDRESS" --rpc-url "$LOCAL_FORK_RPC_URL"
curl -fsS 'http://127.0.0.1:3000/templates?mode=live&sport=tennis'
curl -fsS 'http://127.0.0.1:3000/templates?mode=live&sport=ufc'
```

## Restart The Existing Fork

Use this when Anvil needs a process restart but the current fork-local state should remain.

```bash
ssh root@10.0.1.220

systemctl restart duelly-anvil.service
systemctl status duelly-anvil.service --no-pager

curl -fsS -X POST http://127.0.0.1:8545 \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}'
```

The service reloads `/opt/duelly/anvil/state.json`. Existing fork-local contracts, balances, and funded bets should remain if the state file is valid.

If `state.json` is corrupt or behind DB state, the prestart hook restores the newest compatible valid backup. A backup is compatible only when it matches the current fork deployment metadata, contains the deployed escrow bytecode, is at or after the deployment block, and is not behind indexed DB events, indexed bets, or the indexer cursor for that deployment. If the DB guard is unavailable or no safe backup exists, the hook starts Anvil from a fresh Polygon fork and marks `/opt/duelly/anvil/fresh-fork-required`.

When `duelly-staging-fork-recover.service` sees that marker after Anvil is reachable, it redeploys the fork escrow, seeds the configured wallets, expires stale pre-funding invites, and writes a new `cache/staging-fork/deployment.env`. Backend/frontend must still be restarted separately with the PM2 deploy script or the optional helper:

```bash
scripts/blockchain/staging-pm2-restart-current-env.sh
```

## Recreate The Fork From Scratch

Use this only for a fresh QA environment. It discards fork-local contracts, fake BRL1 balances, and any local escrow bets.

```bash
ssh root@10.0.1.220

systemctl stop duelly-anvil.service
cp /opt/duelly/anvil/state.json "/opt/duelly/anvil/state.$(date -u +%Y%m%dT%H%M%SZ).json.bak"
rm /opt/duelly/anvil/state.json
systemctl start duelly-anvil.service

cd /opt/duelly/app
git fetch origin main
git checkout main
git reset --hard origin/main

SEED_QA_BRL1=1 scripts/blockchain/deploy-staging-fork.sh
APP_DIR=/opt/duelly/app BRANCH=main scripts/deploy/proxmox-staging-pm2.sh
```

After a fresh fork, use the new `DUELLY_ESCROW_ADDRESS` and `DUELLY_DEPLOYMENT_BLOCK` from `cache/staging-fork/deployment.env`.

The automatic recovery flow performs the same fork recreation when the persisted state and all backups are unusable. The old indexed bets remain in Postgres under their previous deployment key and are hidden from the current deployment.

## Logs And Evidence

Recommended evidence folder for manual deployments:

```bash
EVIDENCE_DIR="/opt/duelly/evidence/staging-update-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$EVIDENCE_DIR"
```

Useful logs:

```bash
pm2 logs duelly-backend
pm2 logs duelly-frontend
journalctl -u duelly-anvil.service -n 200 --no-pager
tail -n 200 /var/log/duelly/anvil.log
tail -n 200 /var/log/duelly/backend-pm2.log
tail -n 200 /var/log/duelly/frontend-pm2.log
```

Do not copy `.env`, `frontend/.env`, private keys, tokens, passwords, or RPC URLs with embedded credentials into PR evidence.
