# QA

## Required root QA

```bash
npm run validate
npm test
npm run qa
```

## Workspace QA

```bash
npm --workspace frontend test
npm --workspace backend test
npm --workspace smartcontract test
```

## Real-stack exploratory QA

When a task touches `frontend/` and/or `backend/`, start the real backend and real frontend as part of QA. Exercise the changed flow through the browser or API against that running stack and record evidence in the PR. Fixture-only or mocked validation is not enough unless a blocker is documented with the attempted command, observed error, risk, and follow-up.

## Internal Endpoint QA

For production-mode backend hardening, run the internal endpoint exploratory checks in `docs/PRODUCTION_OPERATIONS.md`. Record sanitized curl commands and responses showing:

- no `Authorization` header returns `401` with `INTERNAL_API_TOKEN_REQUIRED`;
- `Authorization: Bearer wrong-token` returns `403` with `INTERNAL_API_TOKEN_INVALID`;
- `Authorization: Bearer <redacted-valid-token>` reaches endpoint logic and does not fail internal authentication.

## Fork-backed QA

For fork-backed app QA, agents may use the staging Anvil RPC at `http://10.0.1.220:8545` when it is reachable, returns Polygon chain ID `0x89`, and the task does not change contracts or require conditionId resolution/mirroring writes.

Spin up a local Anvil fork instead when:

- `smartcontract/` changes.
- ConditionId resolution or Polymarket CTF mirroring is needed.
- `http://10.0.1.220:8545` is unavailable or does not return `0x89`.
- Fork safety is ambiguous.

## PR evidence

The PR must list commands executed and their results. Commit small, reviewable logs under `evidence/<task-id>/` and link that folder from the PR. Follow `docs/EVIDENCE.md` for naming, redaction, and binary attachment rules.

Evidence by area:

- Frontend: screenshots and Playwright report links when UI changes.
- Backend: curl command output for end-to-end API validation when backend behavior changes.
- Smartcontract: local test output, state summaries, calldata, or read-only script output when contract behavior changes.
- End-to-end: combined frontend, backend, and smart-contract validation when all three systems are involved.

For backend plus smart-contract orchestration, use `docs/LOCAL_FORK_QA.md` to run the local Polygon fork E2E flow before recording evidence.

## Failures

If a test cannot be executed, record:

- command attempted;
- observed error;
- likely reason;
- risk;
- suggested next step.
