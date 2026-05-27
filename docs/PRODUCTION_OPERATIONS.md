# Production Operations

Use this runbook for the production VM that serves real Polygon mainnet state.

Public routes:

```text
frontend: https://duelly.typewith.ai/
backend:  https://api-duelly.typewith.ai/
```

## Host Layout

```text
/opt/duelly/prod/
  .env
  cache/production/deployment.env
/etc/duelly/production/
  relayer.env
/var/log/duelly/production/
```

Required host-local `/opt/duelly/prod/.env` values include:

```bash
NODE_ENV=production
AUTH_MOCK_ENABLED=false
CORS_ORIGINS=https://duelly.typewith.ai
VITE_API_BASE_URL=https://api-duelly.typewith.ai
VITE_ALLOWED_HOSTS=duelly.typewith.ai
DATABASE_URL=
TREASURY_ADDRESS=
POLYGONSCAN_API_KEY=
INTERNAL_API_TOKEN=
POLYMARKET_DISCOVERY_MODE=live
POLYMARKET_LIVE_DISCOVERY_ENABLED=true
POLYMARKET_ALLOW_NEG_RISK=false
POLYMARKET_RESOLUTION_MIRROR_ENABLED=false
POLYMARKET_TEMPLATE_CTF_SYNC_ENABLED=false
```

Production constants are pinned by `scripts/blockchain/deploy-production-polygon.sh` and emitted into `cache/production/deployment.env`:

```bash
POLYGON_RPC_URL=https://polygon-rpc.com
BRL1_ADDRESS_POLYGON=0x5C067C80C00eCd2345b05E83A3e758eF799C40B5
BRL1_TOKEN_ADDRESS=0x5C067C80C00eCd2345b05E83A3e758eF799C40B5
POLYMARKET_CTF_ADDRESS=0x4D97DCd97eC945f40cF65F87097ACe5EA0476045
```

Keep the relayer private key outside the app checkout:

```bash
install -d -m 700 /etc/duelly/production
touch /etc/duelly/production/relayer.env
chmod 600 /etc/duelly/production/relayer.env
```

`/etc/duelly/production/relayer.env` contains:

```bash
RELAYER_PRIVATE_KEY=
```

Both production scripts refuse `RELAYER_PRIVATE_KEY` in `/opt/duelly/prod/.env` and refuse a relayer env file that is group/world-readable.

Never copy `.env`, `relayer.env`, private keys, API tokens, database passwords, or credentialed RPC URLs into PR evidence.

## Deploy Contract

Run a dry run first:

```bash
cd /opt/duelly/prod
scripts/blockchain/deploy-production-polygon.sh --dry-run
```

Broadcast only after the dry run passes:

```bash
scripts/blockchain/deploy-production-polygon.sh
```

The script writes:

```text
cache/production/deployment.env
```

Verify after deployment:

```bash
source .env
source cache/production/deployment.env

cast code "$DUELLY_ESCROW_ADDRESS" --rpc-url "$CHAIN_RPC_URL"
cast call "$DUELLY_ESCROW_ADDRESS" 'owner()(address)' --rpc-url "$CHAIN_RPC_URL"
cast call "$DUELLY_ESCROW_ADDRESS" 'minLoserFee()(uint256)' --rpc-url "$CHAIN_RPC_URL"
cast call "$DUELLY_ESCROW_ADDRESS" \
  'hasRole(bytes32,address)(bool)' \
  "$(cast keccak TEMPLATE_PUBLISHER_ROLE)" \
  "$RELAYER_ADDRESS" \
  --rpc-url "$CHAIN_RPC_URL"
```

## Deploy Backend And Frontend

```bash
cd /opt/duelly/prod
APP_DIR=/opt/duelly/prod BRANCH=main scripts/deploy/proxmox-production-pm2.sh
```

Verify:

```bash
pm2 status
curl -fsS http://127.0.0.1:3000/health
curl -fsS http://127.0.0.1:3000/ready
curl -fsS -I http://127.0.0.1:5173 | head
```

## Internal Endpoint QA

Run this against a production-mode local/staging backend before real production cutover. Redact the token in evidence.

```bash
API="${API:-https://api-duelly.typewith.ai}"
TOKEN="$INTERNAL_API_TOKEN"

for path in \
  /internal/indexer/reindex \
  /internal/resolution/run \
  /internal/resolution/mirror \
  /internal/resolution/mock-payout \
  /internal/templates/ctf-sync/run \
  /relayer/fund
do
  printf '\n%s without token\n' "$path"
  curl -sS -o /tmp/duelly-internal-no-token.json -w '%{http_code}\n' \
    -X POST "$API$path" \
    -H 'content-type: application/json' \
    -d '{}'
  cat /tmp/duelly-internal-no-token.json

  printf '\n%s with wrong token\n' "$path"
  curl -sS -o /tmp/duelly-internal-wrong-token.json -w '%{http_code}\n' \
    -X POST "$API$path" \
    -H 'content-type: application/json' \
    -H 'authorization: Bearer wrong-token' \
    -d '{}'
  cat /tmp/duelly-internal-wrong-token.json

  printf '\n%s with valid token\n' "$path"
  curl -sS -o /tmp/duelly-internal-valid-token.json -w '%{http_code}\n' \
    -X POST "$API$path" \
    -H 'content-type: application/json' \
    -H "authorization: Bearer $TOKEN" \
    -d '{}'
  sed 's/'"$TOKEN"'/<redacted>/g' /tmp/duelly-internal-valid-token.json
done
```

Expected results:

- Missing token returns `401` with `INTERNAL_API_TOKEN_REQUIRED`.
- Wrong token returns `403` with `INTERNAL_API_TOKEN_INVALID`.
- Valid token reaches endpoint logic. Some endpoints may return a validation error for the empty body, but not an internal-auth error.
- Fork-only endpoints return `PRODUCTION_FORK_ENDPOINT_DISABLED` in production.
