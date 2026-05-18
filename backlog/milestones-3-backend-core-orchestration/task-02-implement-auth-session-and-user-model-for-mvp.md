# M3.T02 — Implement auth, session, and user model for MVP

**Milestone:** M3 — Backend Core Orchestration  
**Priority:** P0  
**Type:** Backend / Auth  
**Status:** Planned

## Dependencies

- M3.T01

## Recommended specialist subagents

- backend-specialist
- qa-specialist
- security-reviewer

## Execution requirements

- Execute the task in an independent git worktree created from the intended base branch.
- Open the implementation PR as a Draft PR and keep it in draft until QA evidence is complete.
- Use granular, descriptive commits. Avoid large mixed commits.
- Use specialist subagents whenever the task touches their domain; critical development or QA decisions must use the best available model with reasoning xhigh.
- Do not mark the task complete by the agent. Human-in-the-loop approval closes the task after PR review and QA approval.

## Scope

- Implement MVP auth/session model suitable for embedded wallet onboarding.
- Create user records and stable user identifiers.
- Add session validation middleware for protected endpoints.
- Support mock auth mode for local QA.

## Non-goals

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- Use mock auth in local tests if a production auth provider is not selected yet.
- Do not expose secrets or wallet private material through API responses.

## Acceptance criteria

- Unauthenticated protected requests are rejected.
- Authenticated mock user can call protected endpoints.
- User model includes id, display identifier, wallet linkage placeholder, and ledger linkage placeholder.
- Session errors are consistent and machine-readable.

## Required QA and test plan

- Run backend auth tests.
- Run curl unauthenticated request to a protected endpoint and verify 401/403.
- Run curl authenticated request using mock token/header and verify 200 response.

## Required evidence to version and attach to the PR

- evidence/M3-T02/auth-tests.log.
- evidence/M3-T02/curl-unauthenticated.json.
- evidence/M3-T02/curl-authenticated.json.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
