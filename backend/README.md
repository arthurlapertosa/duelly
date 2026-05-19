# Duelly Backend

Open-source backend workspace.

## Responsibilities

- Auth.
- Wallet abstraction.
- Pix/on-ramp integration.
- BRL1 balance management.
- Polymarket template discovery and normalization.
- Invite and offer management.
- Relayer/gas sponsor.
- On-chain event indexing.
- Automatic resolution trigger.

## Core rule

The backend does not decide the winner. It triggers resolution, while the smart contract reads final on-chain result data whenever possible.

## QA

```bash
npm --workspace @duelly/backend run typecheck
npm --workspace @duelly/backend test
npm --workspace @duelly/backend run test:integration
```

Integration tests use PostgreSQL when `DATABASE_URL` or `DB_HOST`, `DB_USERNAME`, and
`DB_DATABASE` are present. `DB_PASSWORD` is read from the local environment and must
never be committed or copied into evidence.

## Local API

```bash
npm --workspace @duelly/backend run dev
curl -sS http://localhost:3000/health
curl -sS http://localhost:3000/ready
curl -sS "http://localhost:3000/templates/candidates?mode=fixture"
curl -sS "http://localhost:3000/templates?mode=fixture"
curl -sS "http://localhost:3000/templates/rejected?mode=fixture"
curl -sS -X POST "http://localhost:3000/templates/publish?mode=fixture" \
  -H "Content-Type: application/json" \
  -d '{"templateId":"fixture-f1-sprint-winner"}'
```

Fixture mode is deterministic and is the default M1 QA path. Live mode uses the
public Polymarket Gamma API and never requires a key, but the HTTP API rejects
`mode=live` unless `POLYMARKET_LIVE_DISCOVERY_ENABLED=true` is set explicitly.
The service binds to `HOST=127.0.0.1` by default.

## PostgreSQL

Use the checked-in Compose service for a reproducible local database:

```bash
docker compose up -d postgres
export DB_HOST=127.0.0.1
export DB_PORT=5432
export DB_USERNAME=duelly
export DB_PASSWORD=duelly_local
export DB_DATABASE=duelly
npm --workspace @duelly/backend run db:migration:run
```

For personal databases, set the same variable names in an untracked `.env`.
