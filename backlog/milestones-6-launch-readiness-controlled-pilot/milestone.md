# M6 — Launch Readiness & Controlled Pilot, Wallet-First Flow

## Goal

Prepare the MVP for a controlled pilot using the wallet-first model: participants bring or receive BRL1 in their own private wallets before using Duelly. The pilot can be run with manual/pre-funded BRL1 and does not require Pix, embedded wallets, exchange automation, or M3.5.

## External dependencies

- None for wallet-first pilot readiness beyond project-approved infrastructure and legal/compliance review.
- M3.5 is not required for M6.

## Delivery principles

- Deliver in small Draft PRs using independent worktrees.
- Every task must include tests and versioned evidence artifacts.
- Agent work is not final until human-in-the-loop review approves QA and closes the task.
- Keep implementation decisions flexible, but keep acceptance criteria and QA gates strict.

## In scope

- Operational limits for stake, exposure, users, and relayer usage.
- Treasury and contract configuration runbook.
- Pause/unpause and safe refund/void paths.
- Monitoring for relayer, resolution trigger, indexer, smart contract, and wallet-first API failures.
- Minimal admin controls/status view.
- Compliance and regulatory readiness checklist.
- Security review and incident runbook.
- Controlled pilot signoff.

## Out of scope

- No automatic Pix deposit flow.
- No automatic fiat withdrawal flow.
- No platform wallet creation requirement.
- No OKX/MB live exchange automation requirement.
- No uncontrolled public launch.

## Task plan, priorities, and dependencies

| Task | Priority | Title | Dependencies |
|---|---:|---|---|
| M6.T01 | P0 | Implement operational limits and risk configuration | M5.T07 |
| M6.T02 | P0 | Create staging/control deployment runbook | M6.T01 |
| M6.T03 | P0 | Implement monitoring, error tracking, and operational logs | M6.T01, M6.T02 |
| M6.T04 | P1 | Implement minimal admin controls and status view | M6.T01, M6.T03 |
| M6.T05 | P1 | Create compliance and regulatory readiness checklist | M6.T01 |
| M6.T06 | P1 | Run security review and create incident runbook | M6.T02, M6.T03, M6.T04 |
| M6.T07 | P1 | Controlled pilot readiness review and human signoff | M6.T01, M6.T02, M6.T03, M6.T04, M6.T05, M6.T06 |

## Milestone-level quality gates

- Limits are enforced and testable.
- Pause/unpause and safe refund/void paths are documented.
- Monitoring surfaces relayer, resolution, wallet-readiness, contract, and indexing failures.
- Admin controls avoid exposing wallet secrets or sensitive user data.
- Compliance checklist explicitly states that M3.5 fiat/on-ramp is out of scope for this controlled pilot unless separately approved.

## Milestone Definition of Done

- Controlled pilot runbook is complete.
- Operational limits and monitoring are tested.
- Compliance and security checklists are reviewed by humans.
- Wallet-first pilot can proceed with manual/pre-funded BRL1 participants.
- Human reviewer signs off before any pilot starts.

## Evidence requirements

- Each task stores versioned evidence under `evidence/<task-id>/` and links it from the PR.
- Frontend evidence includes Playwright reports and screenshots when UI is touched.
- Backend evidence includes curl command outputs for end-to-end API validation when backend is touched.
- Smart-contract evidence includes local test outputs and state/outcome summaries when contracts are touched.
- Operational evidence includes runbooks, checklists, monitoring screenshots, and dry-run logs.
