# M4 — Frontend MVP Experience, Wallet-First Flow

## Goal

Deliver the user-facing Duelly flow for the wallet-first MVP. Users log in, connect or verify their own private wallet, use existing BRL1 balance, create and accept 1x1 bets, sign required payloads, and view outcomes without needing to understand smart contracts or gas.

M4 must not depend on Pix, Stripe, exchange automation, embedded/platform wallet creation, or M3.5. Platform wallet and deposit/withdrawal UI belongs to M3.5 and is optional.

## External dependencies

- M3 wallet-first backend APIs.
- M2 local contract environment for end-to-end signing/funding tests.
- No Pix provider, brokerage provider, Stripe account, bank account, embedded wallet provider, or M3.5 delivery is required.

## Delivery principles

- Deliver in small Draft PRs using independent worktrees.
- Every task must include tests and versioned evidence artifacts.
- Every frontend task touching UI must include Playwright QA, screenshots, and traces.
- Agent work is not final until human-in-the-loop review approves QA and closes the task.
- Keep implementation decisions flexible, but keep acceptance criteria and QA gates strict.

## In scope

- Frontend app foundation and design system.
- Login.
- Private wallet connection/verification flow.
- BRL1 balance and funding-readiness display.
- Template browsing and selection.
- Invite creation and acceptance.
- EIP-712 consent signing and ERC-2612 permit signing UX.
- Bet status, result, and payout UI.
- Playwright QA for every UI feature.

## Out of scope

- No mobile-native app in MVP.
- No non-BRL1 tokens.
- No Pix deposit UI.
- No Stripe payment UI.
- No platform wallet creation UI in M4.
- No withdrawal/off-ramp UI in M4.
- No raw Web3 jargon in the main user flow.

## Task plan, priorities, and dependencies

| Task | Priority | Title | Dependencies |
|---|---:|---|---|
| M4.T01 | P0 | Create frontend app foundation and design primitives | M0 completed or repository bootstrap available |
| M4.T02 | P0 | Implement login and private wallet onboarding experience | M4.T01, M3.T02, M3.T03 |
| M4.T03 | P0 | Implement BRL1 balance and funding-readiness UI | M4.T02, M3.T04, M3.T07 |
| M4.T04 | P0 | Implement template browsing and selection UI | M4.T01, M3.T05 |
| M4.T05 | P0 | Implement create invite flow with fee preview | M4.T03, M4.T04, M3.T06, M3.T07 |
| M4.T06 | P0 | Implement accept invite and signing flow | M4.T05, M3.T06, M3.T08, M2.T04 |
| M4.T07 | P0 | Implement bet status, result, and payout UI | M4.T06, M3.T09, M3.T10 |
| M4.T08 | P1 | Complete frontend Playwright QA suite and accessibility smoke checks | M4.T01, M4.T02, M4.T03, M4.T04, M4.T05, M4.T06, M4.T07 |

## Milestone-level quality gates

- Frontend tests pass locally.
- Every UI task includes Playwright validation.
- User-facing copy abstracts gas, Polygon, ERC-20, permit, smart contracts, and relayer concepts.
- The flow clearly communicates that the user needs BRL1 in their own wallet for the MVP.
- M3.5 feature flags, if present, are off by default and do not affect M4 QA.

## Milestone Definition of Done

- User can complete the wallet-first frontend journey against mocked or local backend APIs.
- User can connect/verify private wallet and see BRL1 readiness.
- User can create invite, opponent can accept invite, both can sign, and UI can show result state.
- Playwright coverage includes wallet onboarding, balance readiness, create invite, accept invite, and result display flows.
- Frontend PRs include screenshots/traces and test logs.

## Evidence requirements

- Each task stores versioned evidence under `evidence/<task-id>/` and links it from the PR.
- Frontend evidence includes Playwright reports and screenshots whenever UI is touched.
- Backend evidence includes curl command outputs for fixture APIs used by the frontend.
- End-to-end evidence includes combined frontend, backend, and smart-contract validation whenever all three systems are involved.
