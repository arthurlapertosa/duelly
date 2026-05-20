# M3 — Backend Core Orchestration, Wallet-First Flow

## Goal

Build the backend required for the MVP using a wallet-first funding model: users bring their own private wallet and BRL1 balance, the backend generates signing payloads, relays valid transactions, indexes contract events, and triggers automatic resolution.

This milestone intentionally removes fiat deposits, Pix, brokerage integrations, embedded/platform wallets, and automated BRL1 purchases from the critical path. Those capabilities move to M3.5 and must not block M4, M5, or M6.

## External dependencies

- M1 accepted template payloads and fixtures.
- M2 contract ABI/spec, local deployment scripts, and EIP-712/permit test vectors.
- Optional `POLYGON_RPC_URL` for live-read QA.
- No Stripe account, no bank API, no brokerage credentials, and no embedded wallet provider are required for M3.

## Required backend stack

- Node.js.
- TypeScript.
- Fastify.
- PostgreSQL.
- TypeORM.

## Delivery principles

- Deliver in small Draft PRs using independent worktrees.
- Every task must include tests and versioned evidence artifacts.
- Backend feature validation must include curl end-to-end calls whenever an API endpoint is touched.
- Agent work is not final until human-in-the-loop review approves QA and closes the task.
- Keep implementation decisions flexible, but keep acceptance criteria and QA gates strict.

## In scope

- Backend API skeleton and configuration.
- Auth/session/user model for a wallet-first MVP.
- External private wallet linking and ownership verification.
- BRL1 on-chain balance, nonce, allowance, and funding-readiness reads.
- Template discovery/publishing APIs from M1.
- Invite/offer service and EIP-712 payload generation.
- ERC-2612 permit metadata for frontend signing.
- Relayer for `acceptBetWithPermits` and `resolveFromPolymarket`.
- Gas-fee-based minimum loserFee quoting.
- Contract event indexer and bet state API.
- Resolution trigger that never decides the winner itself.

## Out of scope

- No Pix deposits.
- No Stripe flows.
- No Inter/bank API integration.
- No OKX/Mercado Bitcoin trading integration.
- No platform-created wallets.
- No embedded wallet provider.
- No automatic BRL1 purchase/sale.
- No fiat withdrawal or brokerage fee ledger.
- No custody of user private keys.

## Relationship to M3.5

M3.5 adds platform wallets, Pix/on-ramp, exchange automation, and fiat withdrawals as an independent optional track. M3.5 may depend on parts of M3, but M4, M5, and M6 depend only on the wallet-first M3 path.

## Task plan, priorities, and dependencies

| Task | Priority | Title | Dependencies |
|---|---:|---|---|
| M3.T01 | P0 | Create backend service skeleton, configuration, and health checks | M0 completed or repository bootstrap available |
| M3.T02 | P0 | Implement auth, session, and wallet-first user model | M3.T01 |
| M3.T03 | P0 | Implement external wallet linking and ownership verification | M3.T02 |
| M3.T04 | P0 | Implement BRL1 wallet balance and funding-readiness service | M3.T03, M2.T04 test vectors or compatible local spec |
| M3.T05 | P0 | Integrate template discovery and template publisher API | M1.T05, M1.T06, M3.T01 |
| M3.T06 | P0 | Implement invite, offer, and EIP-712 payload service | M3.T02, M3.T04, M3.T05, M2.T03 test vectors or compatible local spec |
| M3.T07 | P0 | Implement loserFee quote and gas-fee-anchored minimum service | M2.T05, M3.T04, M3.T06 |
| M3.T08 | P0 | Implement relayer service for signed wallet-first funding and resolution calls | M2.T04, M2.T07, M3.T06, M3.T07 |
| M3.T09 | P0 | Implement contract event indexer and bet state API | M2.T06, M2.T07, M2.T08, M3.T08 |
| M3.T10 | P1 | Implement resolution trigger and backend curl E2E validation | M2.T08, M3.T09 |

## Milestone-level quality gates

- Backend tests pass locally.
- Every backend feature PR includes curl commands and responses.
- Backend never uses Polymarket odds/prices as final result.
- Backend does not perform fiat, Pix, brokerage, or platform-wallet operations in M3.
- User funding readiness is based only on BRL1 wallet balance, permit/nonce metadata, and contract requirements.
- Relayer and resolution trigger are observable and auditable.

## Milestone Definition of Done

- Backend can run locally with mocks and fixtures.
- Backend can link/verify an external user wallet in mock and local signing modes.
- Backend can read BRL1 balance/funding-readiness for a wallet.
- Backend can generate EIP-712 payloads and permit-related metadata for frontend signing.
- Backend can relay funding/resolution calls against a local contract environment.
- Backend can index contract events and expose bet state to frontend.
- Curl evidence validates the main endpoints end-to-end.

## Evidence requirements

- Each task stores versioned evidence under `evidence/<task-id>/` and links it from the PR.
- Backend evidence includes curl command outputs for end-to-end API validation whenever backend is touched.
- Smart-contract evidence includes local test outputs and state/outcome summaries whenever contracts are touched.
- End-to-end evidence includes combined frontend, backend, and smart-contract validation whenever all three systems are involved.
