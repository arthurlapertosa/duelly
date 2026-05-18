# M2.T08 — Implement automatic Polymarket CTF resolution logic

**Milestone:** M2 — Smart Contract Settlement Core  
**Priority:** P0  
**Type:** Smart Contract / Resolution  
**Status:** Planned

## Dependencies

- M2.T06
- M2.T07

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

- Implement resolveFromPolymarket(uint256 betId) or equivalent.
- Read payoutDenominator and payoutNumerators from the CTF interface.
- Resolve winner based on payout vector for the two template outcomes.
- Void/refund ambiguous, equal, or non-strict outcomes according to MVP policy.

## Non-goals

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- Do not read or use odds, probabilities, or API prices.
- Backend may trigger the function, but contract decides the outcome from CTF state.

## Acceptance criteria

- denominator = 0 reverts as not resolved.
- payout [1,0] resolves outcome 0 winner.
- payout [0,1] resolves outcome 1 winner.
- equal/ambiguous payout vectors produce void/refund.
- Mismatched outcome indexes or invalid CTF shape fail safely.
- Any address may trigger resolution or resolver access policy is explicitly documented and tested.

## Required QA and test plan

- Run `cd smartcontract && forge test --match-path "test/*Resolution*.t.sol" -vvv`.
- Run full `cd smartcontract && forge test`.
- Capture CTF payout vector scenarios and resulting bet outcomes.

## Required evidence to version and attach to the PR

- evidence/M2-T08/resolution-tests.log.
- evidence/M2-T08/ctf-outcome-matrix.md.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
