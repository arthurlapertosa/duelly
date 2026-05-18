# M5.T05 — E2E void/refund path

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

- Run full flow with ambiguous/equal CTF payout vector.
- Validate void/refund behavior and UI messaging.

## Non-goals

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- Void path must demonstrate that treasury receives zero and both users recover stake + loserFee.

## Acceptance criteria

- Funding succeeds for both users.
- Ambiguous CTF result leads to void/refund.
- Both users receive `stake + loserFee` back.
- Treasury receives zero.
- Frontend displays void/refund state clearly.

## Required QA and test plan

- Run Playwright void/refund E2E test.
- Run curl final bet state and ledger/balance endpoints where applicable.
- Run smart-contract local read/test command to confirm refund balances.

## Required evidence to version and attach to the PR

- evidence/M5-T05/playwright-void-refund.log.
- evidence/M5-T05/screenshots/void-result.png.
- evidence/M5-T05/curl-void-bet-state.json.
- evidence/M5-T05/contract-outcome-void.md.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
