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
