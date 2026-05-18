# M6 — Launch Readiness & Controlled Pilot

## Goal

Prepare the MVP for a controlled, limited pilot with operational controls, monitoring, runbooks, security checks, and compliance visibility.

## External dependencies

- None for now. Compliance/legal inputs may become blockers before any public launch.

## Delivery principles

- Deliver in small Draft PRs using independent worktrees.
- Every task must include tests and versioned evidence artifacts.
- Agent work is not final until human-in-the-loop review approves QA and closes the task.
- Keep implementation decisions flexible, but keep acceptance criteria and QA gates strict.

## In scope

- Operational risk limits and pause/refund controls.
- Staging or controlled pilot deployment process.
- Monitoring, logs, admin controls, and operational runbooks.
- Security and compliance checklists.
- Controlled pilot readiness validation.

## Out of scope

- No public unrestricted launch.
- No production scale commitments.
- No legal/compliance signoff by agents; humans must own final approval.

## Task plan, priorities, and dependencies

| Task | Priority | Title | Dependencies |
|---|---:|---|---|
| M6.T01 | P0 | Implement operational limits and risk configuration | M2.T09, M3.T08, M5.T07 |
| M6.T02 | P0 | Create staging/control deployment runbook | M5.T07 |
| M6.T03 | P0 | Implement monitoring, error tracking, and operational logs | M3.T08, M3.T09, M3.T10 |
| M6.T04 | P1 | Implement minimal admin controls and status view | M6.T01, M6.T03 |
| M6.T05 | P0 | Create compliance and regulatory readiness checklist | M5.T07 |
| M6.T06 | P0 | Run security review and create incident runbook | M2.T10, M3.T10, M5.T07 |
| M6.T07 | P0 | Controlled pilot readiness review and human signoff | M6.T01, M6.T02, M6.T03, M6.T04, M6.T05, M6.T06 |

## Milestone-level quality gates

- Operational controls can stop new bets without blocking user recovery flows.
- Monitoring surfaces relayer, resolution, payment, and contract/indexing failures.
- Pilot limits are enforced and tested.
- Human review approves compliance and security readiness before any real user pilot.

## Milestone Definition of Done

- A controlled pilot can be run with predefined limits and rollback procedures.
- Admin and monitoring workflows are documented and tested.
- Security/compliance open items are explicitly tracked.
- Human operator signs off on launch readiness or blocks with reasons.

## Evidence requirements

- Each task stores versioned evidence under evidence/<task-id>/ and links it from the PR.
- Frontend evidence includes Playwright reports and screenshots when UI is touched.
- Backend evidence includes curl command outputs for end-to-end API validation when backend is touched.
- Smart-contract evidence includes local test outputs and state/outcome summaries when contracts are touched.
- End-to-end evidence includes combined frontend, backend, and smart-contract validation whenever all three systems are involved.
