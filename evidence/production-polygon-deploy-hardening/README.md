# Production Polygon Deploy Hardening Evidence

## Scope

- Added Polygon mainnet deployment and production PM2 scripts.
- Added production frontend env writer with QA wallet refusal.
- Required `INTERNAL_API_TOKEN` for production backend config.
- Protected operational mutation endpoints with bearer-token auth.
- Disabled fork-only mutation endpoints in production.

## Automated QA

```bash
npm run validate
npm test
npm run qa
npm --workspace backend run build
npm --workspace frontend run build
npm --workspace smartcontract test
bash -n scripts/blockchain/deploy-production-polygon.sh
bash -n scripts/deploy/proxmox-production-pm2.sh
bash -n scripts/dev/write-production-frontend-env.sh
scripts/blockchain/deploy-production-polygon.sh --self-test
scripts/dev/write-production-frontend-env.sh --self-test
```

All commands passed on the task worktree.

Notes:

- Backend integration tests that require PostgreSQL were skipped by the existing test guards when no test database was configured.
- Frontend build completed with the existing Vite chunk-size warning.
- Foundry emitted the existing mutability warning in `test/Config.t.sol`.

## Manual Internal Endpoint QA

Target:

```text
backend:  http://127.0.0.1:3300
frontend: http://127.0.0.1:5174
```

Setup:

```bash
NODE_ENV=production INTERNAL_API_TOKEN=<redacted-valid-token> \
  CORS_ORIGINS=http://127.0.0.1:5174 PORT=3300 HOST=127.0.0.1 \
  node --import reflect-metadata --import tsx --input-type=module -

npm --workspace frontend run start -- --host 127.0.0.1 --port 5174
```

Health checks:

```text
GET /health -> 200 {"status":"ok","service":"duelly-backend",...}
GET frontend preview -> 200
```

Exploratory results:

```text
/internal/indexer/reindex no-token -> 401 INTERNAL_API_TOKEN_REQUIRED
/internal/indexer/reindex wrong-token -> 403 INTERNAL_API_TOKEN_INVALID
/internal/indexer/reindex valid-token -> 500 BRL1, escrow, and CTF addresses must be configured

/internal/resolution/run no-token -> 401 INTERNAL_API_TOKEN_REQUIRED
/internal/resolution/run wrong-token -> 403 INTERNAL_API_TOKEN_INVALID
/internal/resolution/run valid-token -> 400 MISSING_BETID

/internal/resolution/mirror no-token -> 401 INTERNAL_API_TOKEN_REQUIRED
/internal/resolution/mirror wrong-token -> 403 INTERNAL_API_TOKEN_INVALID
/internal/resolution/mirror valid-token -> 403 PRODUCTION_FORK_ENDPOINT_DISABLED

/internal/resolution/mock-payout no-token -> 401 INTERNAL_API_TOKEN_REQUIRED
/internal/resolution/mock-payout wrong-token -> 403 INTERNAL_API_TOKEN_INVALID
/internal/resolution/mock-payout valid-token -> 403 PRODUCTION_FORK_ENDPOINT_DISABLED

/internal/templates/ctf-sync/run no-token -> 401 INTERNAL_API_TOKEN_REQUIRED
/internal/templates/ctf-sync/run wrong-token -> 403 INTERNAL_API_TOKEN_INVALID
/internal/templates/ctf-sync/run valid-token -> 403 PRODUCTION_FORK_ENDPOINT_DISABLED

/relayer/fund no-token -> 401 INTERNAL_API_TOKEN_REQUIRED
/relayer/fund wrong-token -> 403 INTERNAL_API_TOKEN_INVALID
/relayer/fund valid-token -> 400 MISSING_INVITEID
```

The valid-token responses reached endpoint logic and did not fail internal authentication.

## Frontend Parity

No user-facing layout or flow changed. Frontend changes are limited to internal/operator error-code registration and the production env writer script, so `.prototype/` screenshot parity is not applicable.
