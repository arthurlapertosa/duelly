# M4.T05 — Implement create invite flow with fee preview

**Milestone:** M4 — Frontend MVP Experience, Wallet-First Flow  
**Priority:** P0  
**Type:** Frontend / Betting / Invites  
**Status:** Planned

## Dependencies

- M4.T03
- M4.T04
- M3.T06
- M3.T07

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

- Implement create invite form for selected template/outcome/stake.
- Show loserFee quote and total required BRL1 before confirmation.
- Request maker EIP-712 BetOffer signature through wallet UI or fixture.
- Show generated invite link.

## Non-goals

- Do not submit funding transaction in create invite step unless the approved M2/M3 flow requires it.
- Do not show deposit/on-ramp UI.

## Acceptance criteria

- Invite creation requires verified wallet and sufficient readiness information.
- Fee preview shows stake, loserFee, total required amount, and explanation.
- Maker signature rejection is handled gracefully.
- Invite link is generated only after backend accepts the signed offer.

## Required QA and test plan

- Run frontend tests.
- Run Playwright create invite happy path.
- Run Playwright signature rejected path.
- Run curl commands for fee quote and invite creation fixtures.
- Capture screenshots for fee preview and invite link.

## Required evidence to version and attach to the PR

- evidence/M4-T05/frontend-tests.log
- evidence/M4-T05/playwright-create-invite-report/
- evidence/M4-T05/curl-create-invite-fixtures.json
- evidence/M4-T05/screenshots/fee-preview.png
- evidence/M4-T05/screenshots/invite-link.png

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
