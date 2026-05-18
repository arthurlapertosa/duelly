# M4.T02 — Implement login and wallet onboarding experience

**Milestone:** M4 — Frontend MVP Experience  
**Priority:** P0  
**Type:** Frontend / Auth / Wallets  
**Status:** Planned

## Dependencies

- M4.T01
- M3.T02
- M3.T03

## Recommended specialist subagents

- frontend-specialist
- designer
- backend-specialist
- qa-specialist

## Execution requirements

- Execute the task in an independent git worktree created from the intended base branch.
- Open the implementation PR as a Draft PR and keep it in draft until QA evidence is complete.
- Use granular, descriptive commits. Avoid large mixed commits.
- Use specialist subagents whenever the task touches their domain; critical development or QA decisions must use the best available model with reasoning xhigh.
- Do not mark the task complete by the agent. Human-in-the-loop approval closes the task after PR review and QA approval.

## Scope

- Implement login flow using backend mock/auth endpoints.
- Display embedded wallet creation/linking state.
- Support external wallet option at UI level for users with BRL1.
- Hide raw private key, chain, gas, and ERC terminology from the main flow.

## Non-goals

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- Use mocked backend responses if provider integration is not ready.
- External wallet flow can be a guided placeholder if signing integration is not ready, but must not mislead users.

## Acceptance criteria

- Unauthenticated user is prompted to log in.
- Authenticated user sees wallet status.
- Embedded wallet user sees a simple ready/not-ready state.
- External wallet option communicates BRL1-only support.
- No main flow copy mentions gas, Polygon, ERC-20, or permit.

## Required QA and test plan

- Run Playwright login/onboarding flow.
- Run backend curl health/auth checks used by frontend test setup.
- Capture screenshots for unauthenticated, authenticated, and wallet-ready states.

## Required evidence to version and attach to the PR

- evidence/M4-T02/playwright-login.log.
- evidence/M4-T02/curl-auth-fixture.json.
- evidence/M4-T02/screenshots/unauthenticated.png.
- evidence/M4-T02/screenshots/wallet-ready.png.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
