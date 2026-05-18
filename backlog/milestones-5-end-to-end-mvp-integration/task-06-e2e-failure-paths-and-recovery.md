# M5.T06 — E2E failure paths and recovery

**Milestone:** M5 — End-to-End MVP Integration  
**Priority:** P1  
**Type:** E2E / Full Stack / QA  
**Status:** Planned

## Dependencies

- M5.T01
- M5.T02

## Recommended specialist subagents

- frontend-specialist
- backend-specialist
- blockchain-specialist
- qa-specialist

## Execution requirements

- Execute the task in an independent git worktree created from the intended base branch.
- Open the implementation PR as a Draft PR and keep it in draft until QA evidence is complete.
- Use granular, descriptive commits. Avoid large mixed commits.
- Use specialist subagents whenever the task touches their domain; critical development or QA decisions must use the best available model with reasoning xhigh.
- Do not mark the task complete by the agent. Human-in-the-loop approval closes the task after PR review and QA approval.

## Scope

- Validate insufficient balance, invalid template, expired invite, rejected signature, and unresolved CTF scenarios.
- Ensure failures do not partially fund bets or corrupt backend state.
- Ensure UI error copy is understandable and recoverable.

## Non-goals

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- Prefer deterministic fixtures and mocked signing failures.
- Every failure should have a backend curl response and UI screenshot where applicable.

## Acceptance criteria

- Insufficient balance blocks acceptance before funding transaction.
- Invalid template cannot create or fund a bet.
- Expired invite cannot be accepted.
- Rejected signature does not submit relayer transaction.
- Unresolved CTF leaves bet awaiting result without settlement.
- No partial funding occurs in any failure path.

## Required QA and test plan

- Run Playwright failure-path suite.
- Run curl commands for each failure endpoint/action.
- Run smart-contract local check showing no partial escrow for failed funding cases.

## Required evidence to version and attach to the PR

- evidence/M5-T06/playwright-failure-paths.log.
- evidence/M5-T06/curl-insufficient-balance.json.
- evidence/M5-T06/curl-invalid-template.json.
- evidence/M5-T06/curl-expired-invite.json.
- evidence/M5-T06/contract-no-partial-funding.md.
- evidence/M5-T06/screenshots/error-states.png.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
