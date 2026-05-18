# M5 — End-to-End MVP Integration

## Goal

Validate the full Duelly flow with frontend, backend, and smart contract running together locally or in staging-like local mode.

## External dependencies

- None for now. Use local mocks and fixture providers.

## Delivery principles

- Deliver in small Draft PRs using independent worktrees.
- Every task must include tests and versioned evidence artifacts.
- Agent work is not final until human-in-the-loop review approves QA and closes the task.
- Keep implementation decisions flexible, but keep acceptance criteria and QA gates strict.

## In scope

- Local full-stack orchestration.
- Seeded users, wallets, BRL1 balances, templates, and MockPolymarketCTF outcomes.
- E2E tests covering A wins, B wins, void/refund, funding failure, and invalid template.
- Combined evidence with screenshots, curl outputs, and smart-contract outcomes.

## Out of scope

- No mainnet deployment.
- No production payment provider transactions.
- No uncontrolled public pilot.

## Task plan, priorities, and dependencies

| Task | Priority | Title | Dependencies |
|---|---:|---|---|
| M5.T01 | P0 | Create local full-stack orchestration | M2.T10, M3.T10, M4.T08 |
| M5.T02 | P0 | Implement deterministic E2E seed data | M5.T01 |
| M5.T03 | P0 | E2E happy path: player A wins | M5.T01, M5.T02 |
| M5.T04 | P0 | E2E happy path: player B wins | M5.T01, M5.T02 |
| M5.T05 | P0 | E2E void/refund path | M5.T01, M5.T02 |
| M5.T06 | P1 | E2E failure paths and recovery | M5.T01, M5.T02 |
| M5.T07 | P1 | Create final E2E evidence bundle and QA approval gate | M5.T03, M5.T04, M5.T05, M5.T06 |

## Milestone-level quality gates

- All three systems can run together locally.
- End-to-end tests capture frontend screenshots, backend curl responses, and contract state/outcomes.
- Failures are deterministic and recoverable.
- QA approval is required before closing integration tasks.

## Milestone Definition of Done

- Full local E2E happy paths and negative paths pass.
- E2E evidence is versioned and linked from PRs.
- Human QA validates local runbook before merge.

## Evidence requirements

- Each task stores versioned evidence under evidence/<task-id>/ and links it from the PR.
- Frontend evidence includes Playwright reports and screenshots when UI is touched.
- Backend evidence includes curl command outputs for end-to-end API validation when backend is touched.
- Smart-contract evidence includes local test outputs and state/outcome summaries when contracts are touched.
- End-to-end evidence includes combined frontend, backend, and smart-contract validation whenever all three systems are involved.
