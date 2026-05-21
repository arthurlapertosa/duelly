# Frontend-Ready Async Invite API Evidence

## Scope

- Stored maker offer signatures and maker BRL1 permits before an invite becomes shareable.
- Stored taker acceptance signatures and taker BRL1 permits before relayer funding.
- Kept the relayer funding endpoint on stored authorizations only.
- Added frontend CORS configuration, authenticated bet summaries, and `docs/FRONTEND_API.md`.

## QA Commands

- `npm run validate` -> `validate.log`
- `npm --workspace @duelly/backend run typecheck` -> `backend-typecheck.log`
- `npm --workspace @duelly/backend test` -> `backend-test.log`
- `NODE_ENV=test npm --workspace @duelly/backend run test:integration` with the base `.env` PostgreSQL settings -> `backend-integration-postgres.log`
- `npm --workspace @duelly/smartcontract test` -> `smartcontract-test.log`
- `npm test` -> `npm-test.log`
- `npm run qa` -> `qa.log`
- `git diff --check` -> `git-diff-check.log`
- Backend runtime naming scan -> `runtime-name-scan.log`
- Source diff secret scan -> `secret-scan.log`

All commands above passed. Empty scan logs mean no matches.

## Local Fork E2E

Evidence file: `local-fork-e2e.json`

- Fork RPC: `http://127.0.0.1:8545`
- Chain ID: `137`
- Draft invite was hidden from public reads until maker authorization.
- Maker signed and stored `offerPayload` plus `makerPermitPayload`.
- Taker signed and stored `acceptancePayload` plus `takerPermitPayload`.
- Taker authorization triggered relayer funding through `acceptBetWithPermits`.
- Indexed bet reached `Funded`, then `Resolved` after `resolveFromPolymarket`.
- Reused fork state already had the fixture CTF payout, so explicit mock payout was skipped in this run.

Summary:

```json
{
  "betId": "11",
  "finalIndexedStatus": "Resolved",
  "publishStatus": "already_registered",
  "fundedReindexEvents": 8,
  "resolvedReindexEvents": 9
}
```

## Definition Of Done

- [x] Independent worktree used.
- [x] Behavior changes covered by backend unit/integration tests.
- [x] PostgreSQL-backed integration tested.
- [x] Smart-contract suite rerun.
- [x] Local fork backend/contract E2E executed.
- [x] Evidence attached under this folder.
- [x] Frontend parity: not applicable, backend/API docs only.
- [x] No secrets committed.
- [x] Agent did not merge.

## Risks And Follow-Ups

- `/internal/*` endpoints remain internal-style endpoints but are still route-level HTTP APIs; production hardening should put them behind service auth before public deployment.
- The frontend must use the backend-provided typed-data payloads directly and preserve `value`, `nonce`, and `deadline` when submitting parsed permit signatures.
