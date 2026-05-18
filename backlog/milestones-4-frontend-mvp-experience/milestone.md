# M4 — Frontend MVP Experience

## Goal

Deliver the user-facing Duelly flow that hides Web3 complexity while allowing users to deposit/hold BRL1, create 1x1 invites, accept bets, sign required payloads, and view outcomes.

## External dependencies

- None for now. Use backend mocks/local APIs when provider dependencies are unavailable.

## Delivery principles

- Deliver in small Draft PRs using independent worktrees.
- Every task must include tests and versioned evidence artifacts.
- Agent work is not final until human-in-the-loop review approves QA and closes the task.
- Keep implementation decisions flexible, but keep acceptance criteria and QA gates strict.

## In scope

- Frontend app foundation and design system.
- Login, wallet onboarding, balance, deposits, withdrawals, templates, invite creation, invite acceptance, signatures, and bet status.
- Playwright QA for every frontend task touching UI.
- Screenshots and traces versioned as evidence.

## Out of scope

- No mobile-native app in MVP.
- No support for non-BRL1 tokens.
- No display of raw Web3 jargon in the main user flow.

## Task plan, priorities, and dependencies

| Task | Priority | Title | Dependencies |
|---|---:|---|---|
| M4.T01 | P0 | Create frontend app foundation and design primitives | M0 completed or repository bootstrap available |
| M4.T02 | P0 | Implement login and wallet onboarding experience | M4.T01, M3.T02, M3.T03 |
| M4.T03 | P0 | Implement balance, deposit quote, and withdrawal quote UI | M4.T02, M3.T04, M3.T05 |
| M4.T04 | P0 | Implement template browsing and selection UI | M4.T01, M3.T06 |
| M4.T05 | P0 | Implement create invite flow with fee preview | M4.T03, M4.T04, M3.T07, M3.T08 |
| M4.T06 | P0 | Implement accept invite and signing flow | M4.T05, M3.T07, M3.T08, M2.T04 |
| M4.T07 | P0 | Implement bet status, result, and payout UI | M4.T06, M3.T09, M3.T10 |
| M4.T08 | P1 | Complete frontend Playwright QA suite and accessibility smoke checks | M4.T01, M4.T02, M4.T03, M4.T04, M4.T05, M4.T06, M4.T07 |

## Milestone-level quality gates

- Frontend tests pass locally.
- Every UI task includes Playwright validation.
- User-facing copy abstracts gas, Polygon, ERC-20, permit, and smart-contract concepts.
- Errors are clear and actionable for non-Web3 users.

## Milestone Definition of Done

- User can complete the full frontend journey against mocked or local backend APIs.
- Playwright coverage includes create invite, accept invite, and result display flows.
- Frontend PRs include screenshots/traces and test logs.

## Evidence requirements

- Each task stores versioned evidence under evidence/<task-id>/ and links it from the PR.
- Frontend evidence includes Playwright reports and screenshots when UI is touched.
- Backend evidence includes curl command outputs for end-to-end API validation when backend is touched.
- Smart-contract evidence includes local test outputs and state/outcome summaries when contracts are touched.
- End-to-end evidence includes combined frontend, backend, and smart-contract validation whenever all three systems are involved.
