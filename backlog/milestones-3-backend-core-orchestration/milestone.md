# M3 — Backend Core Orchestration

## Goal

Build the backend that abstracts Web3 operations, manages templates and invites, runs relayer/resolution operations, indexes contract events, and handles user balances and money movement fees.

## External dependencies

- Stripe account for payment/deposit integration planning.
- Human decision on the brokerage/provider used to buy and sell BRL1.

## Delivery principles

- Deliver in small Draft PRs using independent worktrees.
- Every task must include tests and versioned evidence artifacts.
- Agent work is not final until human-in-the-loop review approves QA and closes the task.
- Keep implementation decisions flexible, but keep acceptance criteria and QA gates strict.

## In scope

- Backend API skeleton and configuration.
- Auth/session/user model.
- Wallet abstraction provider interface.
- Pix, Stripe, and BRL1 brokerage provider abstractions.
- User ledger with brokerage transaction fee deduction on deposits and withdrawals.
- Template discovery, invite/offer service, relayer, event indexer, and resolution trigger.
- Curl-based E2E validation for every backend feature.

## Out of scope

- No production payment processing without approved provider credentials and compliance review.
- No custody policy finalization beyond MVP wallet abstraction model.
- No manual result decision by backend.

## Task plan, priorities, and dependencies

| Task | Priority | Title | Dependencies |
|---|---:|---|---|
| M3.T01 | P0 | Create backend service skeleton, configuration, and health checks | M0 completed or repository bootstrap available |
| M3.T02 | P0 | Implement auth, session, and user model for MVP | M3.T01 |
| M3.T03 | P0 | Implement wallet abstraction provider interface | M3.T02 |
| M3.T04 | P0 | Implement Pix, Stripe, brokerage provider abstractions, and user ledger fees | M3.T01, Stripe account, BRL1 brokerage/provider decision |
| M3.T05 | P0 | Implement BRL1 balance service and betting availability checks | M3.T03, M3.T04 |
| M3.T06 | P0 | Integrate template discovery and template publisher API | M1.T05, M1.T06, M3.T01 |
| M3.T07 | P0 | Implement invite, offer, and EIP-712 payload service | M3.T02, M3.T05, M3.T06, M2.T03 test vectors or compatible local spec |
| M3.T08 | P0 | Implement relayer service and gas-fee-based minLoserFee quoting | M2.T04, M2.T05, M3.T07 |
| M3.T09 | P0 | Implement contract event indexer and bet state API | M2.T06, M2.T07, M2.T08, M3.T08 |
| M3.T10 | P1 | Implement resolution trigger and backend curl E2E validation | M2.T08, M3.T09 |

## Milestone-level quality gates

- Backend tests pass locally.
- Every backend feature PR includes curl commands and responses.
- Backend never uses Polymarket odds/prices as final result.
- Money movement records brokerage transaction fees separately from betting loserFee.
- Relayer and resolution trigger are observable and auditable.

## Milestone Definition of Done

- Backend can run locally with mocks and fixtures.
- Backend can generate EIP-712 payloads and permit-related metadata for frontend signing.
- Backend can relay funding/resolution calls against a local contract environment.
- Backend can index contract events and expose bet state to frontend.
- Curl evidence validates the main endpoints end-to-end.

## Evidence requirements

- Each task stores versioned evidence under evidence/<task-id>/ and links it from the PR.
- Frontend evidence includes Playwright reports and screenshots when UI is touched.
- Backend evidence includes curl command outputs for end-to-end API validation when backend is touched.
- Smart-contract evidence includes local test outputs and state/outcome summaries when contracts are touched.
- End-to-end evidence includes combined frontend, backend, and smart-contract validation whenever all three systems are involved.
