# M6.T04 — Implement minimal admin controls and status view

**Milestone:** M6 — Launch Readiness & Controlled Pilot  
**Priority:** P1  
**Type:** Backend / Frontend / Operations  
**Status:** Planned

## Dependencies

- M6.T01
- M6.T03

## Recommended specialist subagents

- backend-specialist
- frontend-specialist
- designer
- qa-specialist
- security-reviewer

## Execution requirements

- Execute the task in an independent git worktree created from the intended base branch.
- Open the implementation PR as a Draft PR and keep it in draft until QA evidence is complete.
- Use granular, descriptive commits. Avoid large mixed commits.
- Use specialist subagents whenever the task touches their domain; critical development or QA decisions must use the best available model with reasoning xhigh.
- Do not mark the task complete by the agent. Human-in-the-loop approval closes the task after PR review and QA approval.

## Scope

- Create minimal admin APIs and/or UI for viewing templates, bets, relayer attempts, resolution attempts, and pause/limit state.
- Support pause new bets and inspect recovery/refund status.
- Protect admin access with appropriate authorization.

## Non-goals

- Do not make M3.5 platform-wallet, Pix, or exchange automation a prerequisite for wallet-first pilot readiness.

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- Admin UI can be basic, but it must be safe and clear.
- Do not build broad internal tooling beyond launch readiness needs.

## Acceptance criteria

- Admin can view current operational status and recent failures.
- Admin can pause/unpause new bets or see smart-contract pause state if controlled elsewhere.
- Admin cannot access private wallet secrets or sensitive user data not required for operations.
- Admin actions are logged and auditable.

## Required QA and test plan

- Run backend admin curl authorization tests.
- Run Playwright admin status/pause flow if UI is implemented.
- Run smart-contract local pause/refund validation if pause touches contract state.

## Required evidence to version and attach to the PR

- evidence/M6-T04/admin-api-tests.log.
- evidence/M6-T04/curl-admin-status.json.
- evidence/M6-T04/curl-admin-pause.json.
- evidence/M6-T04/screenshots/admin-status.png or admin-ui-not-implemented.md.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
