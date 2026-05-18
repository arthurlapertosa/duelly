# M4.T05 — Implement create invite flow with fee preview

**Milestone:** M4 — Frontend MVP Experience  
**Priority:** P0  
**Type:** Frontend / Betting  
**Status:** Planned

## Dependencies

- M4.T03
- M4.T04
- M3.T07
- M3.T08

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

- Allow user A to choose outcome, stake, and optional taker restriction.
- Show loserFee calculation using percent fee and gas-anchored minimum.
- Show required deposit amount: stake + loserFee.
- Create invite via backend and display/share invite link.

## Non-goals

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- Explain loserFee as a fee paid only by the losing side, while both sides reserve/deposit it upfront.
- Keep transaction/gas details abstracted but show fee calculation clearly.

## Acceptance criteria

- User cannot create invite with stake below/above configured limits.
- User cannot create invite if balance is insufficient for stake + loserFee.
- Fee preview displays percent fee, minimum fee adjustment when applicable, and total required amount.
- Successful invite creation returns an invite link and a pending signature/funding state as designed.

## Required QA and test plan

- Run Playwright create invite tests for normal stake and small stake where minLoserFee applies.
- Run curl fee quote and create invite endpoints.
- Capture screenshots of fee preview and invite created states.

## Required evidence to version and attach to the PR

- evidence/M4-T05/playwright-create-invite.log.
- evidence/M4-T05/curl-fee-quote.json.
- evidence/M4-T05/curl-create-invite.json.
- evidence/M4-T05/screenshots/fee-preview.png.
- evidence/M4-T05/screenshots/invite-created.png.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
