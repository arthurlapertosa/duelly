# M6.T01 — Implement operational limits and risk configuration

**Milestone:** M6 — Launch Readiness & Controlled Pilot  
**Priority:** P0  
**Type:** Backend / Smart Contract / Risk  
**Status:** Planned

## Dependencies

- M2.T09
- M3.T08
- M5.T07

## Recommended specialist subagents

- backend-specialist
- blockchain-specialist
- security-reviewer
- qa-specialist

## Execution requirements

- Execute the task in an independent git worktree created from the intended base branch.
- Open the implementation PR as a Draft PR and keep it in draft until QA evidence is complete.
- Use granular, descriptive commits. Avoid large mixed commits.
- Use specialist subagents whenever the task touches their domain; critical development or QA decisions must use the best available model with reasoning xhigh.
- Do not mark the task complete by the agent. Human-in-the-loop approval closes the task after PR review and QA approval.

## Scope

- Define and enforce stake minimum/maximum, user exposure limit, global exposure limit, daily limits, and fee bounds.
- Expose limits to frontend/backend quote flows.
- Ensure limits are consistent with smart-contract configuration where applicable.

## Non-goals

- Do not make M3.5 platform-wallet, Pix, or exchange automation a prerequisite for wallet-first pilot readiness.

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- For MVP, conservative limits are preferred.
- Smart contract should enforce the limits that protect funds; backend can enforce additional operational limits.

## Acceptance criteria

- Backend rejects bets exceeding user/global/daily risk limits.
- Smart contract enforces stake and fee bounds.
- Frontend can display limit-related errors.
- Limit changes are auditable.

## Required QA and test plan

- Run backend risk-limit tests and curl rejection cases.
- Run smart-contract local tests for stake/fee bounds.
- Run Playwright limit-error UI test if frontend is touched.

## Required evidence to version and attach to the PR

- evidence/M6-T01/risk-limit-tests.log.
- evidence/M6-T01/curl-risk-limit-rejection.json.
- evidence/M6-T01/contract-limit-tests.log.
- evidence/M6-T01/screenshots/limit-error.png or frontend-not-touched.md.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
