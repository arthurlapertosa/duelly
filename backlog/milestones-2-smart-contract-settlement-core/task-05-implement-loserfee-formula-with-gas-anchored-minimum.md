# M2.T05 — Implement loserFee formula with gas-anchored minimum

**Milestone:** M2 — Smart Contract Settlement Core  
**Priority:** P0  
**Type:** Smart Contract / Finance  
**Status:** Planned

## Dependencies

- M2.T02
- M2.T04

## Recommended specialist subagents

- blockchain-specialist
- backend-specialist
- qa-specialist

## Execution requirements

- Execute the task in an independent git worktree created from the intended base branch.
- Open the implementation PR as a Draft PR and keep it in draft until QA evidence is complete.
- Use granular, descriptive commits. Avoid large mixed commits.
- Use specialist subagents whenever the task touches their domain; critical development or QA decisions must use the best available model with reasoning xhigh.
- Do not mark the task complete by the agent. Human-in-the-loop approval closes the task after PR review and QA approval.

## Scope

- Implement on-chain fee validation for `loserFee = max(stake * loserFeeBps / 10_000, minLoserFee)`.
- Add configurable minLoserFee in BRL1 units controlled by authorized operator/admin.
- Document that backend/relayer must set minLoserFee to at least 3x estimated gas fee.
- Reject bets where provided loserFee does not match contract-calculated value.

## Non-goals

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- The contract should not attempt to calculate live gas cost from chain state.
- For MVP, minLoserFee is an operator-configured BRL1 value derived from backend gas estimation.

## Acceptance criteria

- Percent fee path works when percentage is above minLoserFee.
- Minimum fee path works when 3x gas-anchored minLoserFee is above percentage fee.
- Changing minLoserFee emits an event and is access-controlled.
- Incorrect loserFee in BetOffer fails validation.
- maxLoserFeeBps is enforced.

## Required QA and test plan

- Run `cd smartcontract && forge test --match-path "test/*Fee*.t.sol" -vvv`.
- Run full `cd smartcontract && forge test`.
- Capture fee calculation table for small stake, normal stake, and max stake cases.

## Required evidence to version and attach to the PR

- evidence/M2-T05/fee-tests.log.
- evidence/M2-T05/fee-calculation-table.md.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
