# Staging Fork QA

Use this for Proxmox staging when the target is real Polygon contract code and real Polymarket data, with fork-local BRL1 balances only.

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
scripts/dev/write-staging-frontend-env.sh
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

The frontend env helper writes QA private keys to `frontend/.env`, which is gitignored. Do not commit or attach it as evidence.

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
RESOLUTION_WORKER_ENABLED=true
```

`POLYMARKET_ALLOW_NEG_RISK=true` is for fork staging only. Current live sports markets can be negative-risk; keep the default `false` outside staging until negative-risk support is explicitly approved for production.

## Playwright

```bash
set -a
source .env
source cache/staging-fork/deployment.env
set +a

scripts/dev/write-staging-frontend-env.sh

DUELLY_E2E_MODE=staging-fork \
RESOLUTION_WORKER_INTERVAL_MS="${RESOLUTION_WORKER_INTERVAL_MS:-60000}" \
npm --workspace frontend run test:e2e:staging-fork
```

The staging-fork E2E creates or reuses the local maker/taker accounts, verifies wallets through QA signing, funds one live-template bet with fork-local BRL1, and confirms the funded bet stays pending while the live Polymarket condition is unresolved.

`POLYMARKET_MIN_BETTING_CLOSE_BUFFER_HOURS` controls how close to the market close time Duelly will still accept templates. The backend default is `2` hours. Set it to `0` for staging or production runs that intentionally need bets on markets resolving in the next few minutes; already-ended markets still reject as `NEAR_EXPIRY`. `POLYMARKET_MIN_BETTING_CLOSE_BUFFER_SECONDS` remains supported when the hours variable is unset.

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
