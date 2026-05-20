# M5.T04 — E2E happy path: player B wins

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

- Run full flow where player B selected winning outcome.
- Validate opposite-side settlement math and UI display.

## Non-goals

- Do not depend on M3.5 platform-wallet, Pix, or exchange automation work.

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- Reuse the same E2E harness as M5.T03 with different CTF payout vector.

## Acceptance criteria

- Funding succeeds for both users.
- Resolution settles with player B as winner.
- Player B payout equals `2 * stake + loserFee`; treasury payout equals loserFee of player A.
- Frontend displays player B as winner and correct payout.

## Required QA and test plan

- Run Playwright full-flow test for player B win.
- Run curl to fetch bet state before and after resolution.
- Run smart-contract local read/test command to confirm balances and settlement event.

## Required evidence to version and attach to the PR

- evidence/M5-T04/playwright-b-wins.log.
- evidence/M5-T04/screenshots/b-wins-result.png.
- evidence/M5-T04/curl-bet-after-resolution.json.
- evidence/M5-T04/contract-outcome-b-wins.md.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
