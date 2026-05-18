# M2.T09 — Implement expiry, pause, and security controls

**Milestone:** M2 — Smart Contract Settlement Core  
**Priority:** P0  
**Type:** Smart Contract / Security  
**Status:** Planned

## Dependencies

- M2.T07
- M2.T08

## Recommended specialist subagents

- blockchain-specialist
- security-reviewer
- qa-specialist

## Execution requirements

- Execute the task in an independent git worktree created from the intended base branch.
- Open the implementation PR as a Draft PR and keep it in draft until QA evidence is complete.
- Use granular, descriptive commits. Avoid large mixed commits.
- Use specialist subagents whenever the task touches their domain; critical development or QA decisions must use the best available model with reasoning xhigh.
- Do not mark the task complete by the agent. Human-in-the-loop approval closes the task after PR review and QA approval.

## Scope

- Add expiry/void path after resolutionDeadline when CTF resolution is unavailable.
- Add pause/unpause controls for new funding.
- Ensure refund/void paths remain available while paused if that is the selected policy.
- Add reentrancy protections and tests with malicious token or test harness if feasible.
- Enforce min/max stake and access controls.

## Non-goals

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- Prefer keeping user recovery paths available even when new bets are paused.
- Document any security tradeoff that cannot be fully tested in MVP.

## Acceptance criteria

- New bets are blocked while paused.
- Void/refund path works while paused if policy says refunds remain available.
- Bet can be voided/refunded after resolutionDeadline if unresolved.
- Before resolutionDeadline, expiry/refund fails unless result is ambiguous/void.
- Reentrancy test passes or documented threat model explains why it is not applicable.

## Required QA and test plan

- Run `cd smartcontract && forge test --match-path "test/*Security*.t.sol" -vvv`.
- Run full `cd smartcontract && forge test`.
- Capture pause/refund and expiry state transition outcomes.

## Required evidence to version and attach to the PR

- evidence/M2-T09/security-tests.log.
- evidence/M2-T09/state-transition-table.md.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
