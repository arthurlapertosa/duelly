# M2.T04 — Implement ERC-2612 permit-based atomic funding

**Milestone:** M2 — Smart Contract Settlement Core  
**Priority:** P0  
**Type:** Smart Contract / Funding  
**Status:** Planned

## Dependencies

- M2.T03

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

- Implement acceptBetWithPermits or equivalent funding entrypoint.
- Call BRL1 permit for maker and taker.
- Transfer stake + loserFee from both users into escrow in one transaction.
- Create betId only after both sides have been successfully funded.

## Non-goals

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- Atomicity is the most important property: if any permit or transfer fails, the transaction must revert with no partial funding.
- Use SafeERC20-compatible patterns where applicable.

## Acceptance criteria

- Valid permits fund a bet and emit BetFunded.
- Expired permit fails.
- Wrong spender permit fails.
- Permit value lower than deposit requirement fails.
- Insufficient balance fails without creating a bet.
- If taker funding fails after maker permit succeeds, final token balances remain unchanged due to transaction revert.

## Required QA and test plan

- Run `cd smartcontract && forge test --match-path "test/*Funding*.t.sol" -vvv`.
- Run full `cd smartcontract && forge test`.
- Capture pre/post balance assertions for successful and reverted funding cases.

## Required evidence to version and attach to the PR

- evidence/M2-T04/funding-tests.log.
- evidence/M2-T04/atomicity-outcomes.md.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
