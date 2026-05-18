# M2.T07 — Implement escrow settlement and payout math

**Milestone:** M2 — Smart Contract Settlement Core  
**Priority:** P0  
**Type:** Smart Contract / Settlement  
**Status:** Planned

## Dependencies

- M2.T04
- M2.T05
- M2.T06

## Recommended specialist subagents

- blockchain-specialist
- qa-specialist

## Execution requirements

- Execute the task in an independent git worktree created from the intended base branch.
- Open the implementation PR as a Draft PR and keep it in draft until QA evidence is complete.
- Use granular, descriptive commits. Avoid large mixed commits.
- Use specialist subagents whenever the task touches their domain; critical development or QA decisions must use the best available model with reasoning xhigh.
- Do not mark the task complete by the agent. Human-in-the-loop approval closes the task after PR review and QA approval.

## Scope

- Implement internal settlement for player A win and player B win.
- Implement winner payout: `2 * stake + own loserFee`.
- Implement treasury payout: loserFee of losing player.
- Implement void/refund path that returns `stake + loserFee` to each player and pays treasury zero.

## Non-goals

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- Update bet status before external token transfers where appropriate to reduce reentrancy risk.
- Emit complete settlement events for backend indexing.

## Acceptance criteria

- Player A win pays player A exactly `2 * stake + loserFee` and treasury exactly `loserFee`.
- Player B win pays player B exactly `2 * stake + loserFee` and treasury exactly `loserFee`.
- Void refunds both players exactly `stake + loserFee`.
- Double settlement fails.
- Settlement events contain winner, loser, winningOutcomeIndex, winnerPayout, and treasuryPayout.

## Required QA and test plan

- Run `cd smartcontract && forge test --match-path "test/*Settlement*.t.sol" -vvv`.
- Run full `cd smartcontract && forge test`.
- Capture balance delta table before and after each settlement scenario.

## Required evidence to version and attach to the PR

- evidence/M2-T07/settlement-tests.log.
- evidence/M2-T07/balance-delta-table.md.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
