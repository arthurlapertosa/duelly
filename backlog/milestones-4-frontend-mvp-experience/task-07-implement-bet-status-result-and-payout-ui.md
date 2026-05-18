# M4.T07 — Implement bet status, result, and payout UI

**Milestone:** M4 — Frontend MVP Experience  
**Priority:** P0  
**Type:** Frontend / Betting / Results  
**Status:** Planned

## Dependencies

- M4.T06
- M3.T09
- M3.T10

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

- Display bet state from backend indexer: funded, awaiting result, resolved, voided, expired.
- Display winner, loser, payout, treasury/fee information, and refund status when applicable.
- Display resolution source summary without implying backend manually chose winner.
- Poll or subscribe to status updates as selected by implementation.

## Non-goals

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- Use human-readable status copy and avoid raw chain jargon.
- Provide clear void/refund copy for ambiguous outcomes.

## Acceptance criteria

- Funded bet shows awaiting result state.
- Resolved bet shows winner payout and loser fee outcome accurately.
- Void bet shows full refund of stake + loserFee for both sides.
- Expired/unresolved state explains next action or refund policy.
- Displayed payout matches backend indexed values.

## Required QA and test plan

- Run Playwright status/result tests for funded, A wins, B wins, void, and expired states.
- Run curl bet detail endpoint for each fixture state.
- Capture screenshots for each status/result state.

## Required evidence to version and attach to the PR

- evidence/M4-T07/playwright-bet-status.log.
- evidence/M4-T07/curl-bet-funded.json.
- evidence/M4-T07/curl-bet-resolved.json.
- evidence/M4-T07/curl-bet-voided.json.
- evidence/M4-T07/screenshots/status-funded.png.
- evidence/M4-T07/screenshots/status-resolved.png.
- evidence/M4-T07/screenshots/status-voided.png.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
