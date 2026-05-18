# M5.T03 — E2E happy path: player A wins

**Milestone:** M5 — End-to-End MVP Integration  
**Priority:** P0  
**Type:** E2E / Full Stack  
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

- Run full flow from user A login through invite creation, user B acceptance, funding, CTF resolution, settlement, and UI result.
- Use MockPolymarketCTF outcome where player A selected winning outcome.
- Capture full evidence across all systems.

## Non-goals

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- Prefer Playwright driving the user flow and curl/smart-contract commands validating backend/contract state after each major step.

## Acceptance criteria

- User A creates an invite from an accepted template.
- User B accepts the invite and funding succeeds.
- Contract escrows stake + loserFee from both users.
- Resolution settles with player A as winner.
- Player A payout equals `2 * stake + loserFee`; treasury payout equals loserFee of player B.
- Frontend displays player A as winner and correct payout.

## Required QA and test plan

- Run Playwright full-flow test for player A win.
- Run curl to fetch bet state before and after resolution.
- Run smart-contract local read/test command to confirm balances and settlement event.

## Required evidence to version and attach to the PR

- evidence/M5-T03/playwright-a-wins.log.
- evidence/M5-T03/screenshots/a-create-invite.png.
- evidence/M5-T03/screenshots/b-accepts.png.
- evidence/M5-T03/screenshots/a-wins-result.png.
- evidence/M5-T03/curl-bet-before-resolution.json.
- evidence/M5-T03/curl-bet-after-resolution.json.
- evidence/M5-T03/contract-outcome-a-wins.md.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
