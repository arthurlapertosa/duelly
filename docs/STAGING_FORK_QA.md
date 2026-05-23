# Staging Fork QA

Use this for Proxmox staging when the target is real Polygon contract code and real Polymarket data, with fork-local BRL1 balances only.

For day-to-day VM layout, PM2 redeploys, contract redeploys, and Anvil service operations, see `docs/STAGING_OPERATIONS.md`.

## Model

- Network: Anvil fork of Polygon with chain ID `137`.
- Real contracts: BRL1 and Polymarket Conditional Tokens Framework.
- Local contract: `BetEscrowBRL1` deployed to the fork.
- Fake value: BRL1 balances transferred on the fork by impersonating a live BRL1 holder.
- Never use customer wallets or production private keys in `VITE_QA_WALLET`.

## Deploy And Seed

From the repository root:

```bash
START_ANVIL=1 SEED_QA_BRL1=1 scripts/blockchain/deploy-staging-fork.sh
VITE_QA_WALLET=true scripts/dev/write-staging-frontend-env.sh
```

`SEED_QA_BRL1=1` always seeds the maker and taker wallets when their private keys or addresses are present. To bootstrap more staging wallets in the same deploy, set `QA_SEED_WALLETS` to a comma-separated list of public addresses:

```bash
QA_SEED_WALLETS=0x1111111111111111111111111111111111111111,0x2222222222222222222222222222222222222222 \
START_ANVIL=1 SEED_QA_BRL1=1 scripts/blockchain/deploy-staging-fork.sh
```

Required root `.env` values:

```bash
POLYGON_RPC_URL=
BRL1_ADDRESS_POLYGON=
POLYMARKET_CTF_ADDRESS=0x4D97DCd97eC945f40cF65F87097ACe5EA0476045
RELAYER_PRIVATE_KEY=
TREASURY_ADDRESS=
QA_MAKER_PRIVATE_KEY=
QA_TAKER_PRIVATE_KEY=
```

The deployment script writes public fork state to:

```text
cache/staging-fork/deployment.env
```

The frontend env helper defaults to `VITE_QA_WALLET=false` for public staging. For injected-wallet agent QA, run it with `VITE_QA_WALLET=true`; only then does it write QA private keys to `frontend/.env`, which is gitignored. Do not commit or attach it as evidence.

## Seed More Fake BRL1

```bash
node scripts/blockchain/seed-fork-brl1.mjs \
  --rpc-url http://127.0.0.1:8545 \
  --wallet "$QA_MAKER_ADDRESS" \
  --wallet "$QA_TAKER_ADDRESS" \
  --wallet "$EXTRA_QA_ADDRESS" \
  --amount-brl1 1000
```

The script refuses non-local RPC URLs unless `--allow-non-local-rpc` is passed.

## Run The Stack

```bash
DEPLOYMENT_ENV="$PWD/cache/staging-fork/deployment.env" npm run dev:stack
```

For live template discovery in staging, keep these enabled:

```bash
POLYMARKET_DISCOVERY_MODE=live
POLYMARKET_LIVE_DISCOVERY_ENABLED=true
POLYMARKET_ALLOW_NEG_RISK=true
POLYMARKET_TEMPLATE_DISCOVERY_REFRESH_INTERVAL_MS=900000
RESOLUTION_WORKER_ENABLED=true
```

`POLYMARKET_ALLOW_NEG_RISK=true` is for fork staging only. Current live sports markets can be negative-risk; keep the default `false` outside staging until negative-risk support is explicitly approved for production.

## Proxmox PM2 Deploy

On the staging VM, keep PostgreSQL and Anvil under systemd, then use PM2 for backend and frontend:

```bash
APP_DIR=/opt/duelly/app BRANCH=codex/staging-fork-web3-e2e \
  scripts/deploy/proxmox-staging-pm2.sh
```

The script pulls the selected branch, installs workspace dependencies, regenerates `frontend/.env`, builds the backend, runs migrations, starts `duelly-backend` and `duelly-frontend` under PM2, configures the `pm2-root` systemd startup unit, and saves the PM2 process list. It requires the host-local `.env` and `cache/staging-fork/deployment.env` to already exist.

Useful operator commands:

```bash
pm2 status
pm2 logs duelly-backend
pm2 logs duelly-frontend
systemctl status pm2-root
```

## Playwright

```bash
set -a
source .env
source cache/staging-fork/deployment.env
set +a

VITE_QA_WALLET=true scripts/dev/write-staging-frontend-env.sh

DUELLY_E2E_MODE=staging-fork \
RESOLUTION_WORKER_INTERVAL_MS="${RESOLUTION_WORKER_INTERVAL_MS:-60000}" \
npm --workspace frontend run test:e2e:staging-fork
```

The staging-fork E2E creates or reuses the local maker/taker accounts, verifies wallets through QA signing, funds one live-template bet with fork-local BRL1, and confirms the funded bet stays pending while the live Polymarket condition is unresolved.

`POLYMARKET_MIN_BETTING_CLOSE_BUFFER_HOURS` controls how close to the market close time Duelly will still accept templates. The backend default is `0` hours, so bets can remain open until the provider event-end close time. Set a positive value for environments that need an additional pre-close safety buffer; already-ended markets still reject as `NEAR_EXPIRY`. `POLYMARKET_MIN_BETTING_CLOSE_BUFFER_SECONDS` remains supported when the hours variable is unset.

## Mirror Resolved CTF Payouts

Persistent Anvil forks preserve Duelly's local escrow bets and fake BRL1 balances, but they do not automatically sync future writes from Polygon. When a real Polymarket condition resolves after the fork was started, mirror only that condition's deterministic CTF payout state into the fork-local CTF contract instead of restarting the fork.

Use a dry run first:

```bash
set -a
source .env
source cache/staging-fork/deployment.env
set +a

node scripts/blockchain/mirror-polymarket-ctf-payout.mjs \
  --source-rpc-url "$POLYGON_RPC_URL" \
  --fork-rpc-url "$LOCAL_FORK_RPC_URL" \
  --ctf "$POLYMARKET_CTF_ADDRESS" \
  --condition-id "$POLYMARKET_CONDITION_ID" \
  --question-id "$POLYMARKET_QUESTION_ID" \
  --dry-run
```

If the source payout is resolved and the dry run shows the expected `reportPayouts` calldata, run the same command without `--dry-run`. The script refuses non-local target RPC URLs, non-Polygon chain IDs, condition/question/oracle mismatches, unresolved source payouts, and already resolved fork payout state unless an explicit safety flag is passed.

After mirroring, trigger the worker path and reindex:

```bash
API="${API:-http://127.0.0.1:3000}"
curl -sS -X POST "$API/internal/resolution/run" \
  -H 'content-type: application/json' \
  -d "{\"betId\":\"$BET_ID\"}"
curl -sS -X POST "$API/internal/indexer/reindex"
```

## Explore Template CTF Sync

Use this after backend changes that touch proactive template CTF sync. It starts a temporary backend process against the local/staging fork, picks a live accepted template, removes an already-prepared fork CTF condition under an Anvil snapshot when needed, syncs it, reverts the fork snapshot to remove that condition again, then syncs again to prove the backend recreates it.

```bash
set -a
source .env
source cache/staging-fork/deployment.env
set +a

node scripts/qa/explore-template-ctf-sync.mjs \
  --deployment-env cache/staging-fork/deployment.env \
  --port 3091
```

Expected evidence:

- JSON output with `ok: true`, the target `templateId`, target `conditionId`, first and second sync statuses, source/fork denominator, fork outcome slot count, and backend log path.
- Backend log lines containing the target `conditionId` and `template CTF sync prepared`, `template CTF sync source-unresolved`, `template CTF sync mirrored`, or `template CTF sync already-resolved`.
- Current staging live football templates are negative-risk markets. Keep `POLYMARKET_NEG_RISK_CTF_ORACLE_ADDRESS` set to Polymarket's negative-risk adapter oracle so `conditionId` validation uses the correct oracle fallback.

## Resolution Worker

The backend worker runs only when `RESOLUTION_WORKER_ENABLED=true`.

Each tick:

1. Reindexes escrow events.
2. Loads funded indexed bets.
3. Reads Polymarket CTF `payoutDenominator`.
4. Calls `resolveFromPolymarket` only when denominator is nonzero.
5. Calls `expireUnresolvedBet` only after the on-chain resolution deadline and while denominator remains zero.

`POST /internal/resolution/run` remains available for operator and QA retries.

Restarting the fork from a newer Polygon block still works for fresh QA environments, but it discards local fork-only bets and fake BRL1 balances. For persistent staging, prefer the mirror script above.
