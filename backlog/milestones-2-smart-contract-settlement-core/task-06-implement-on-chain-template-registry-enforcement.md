# M2.T06 — Implement on-chain template registry enforcement

**Milestone:** M2 — Smart Contract Settlement Core  
**Priority:** P0  
**Type:** Smart Contract / Product Rules  
**Status:** Planned

## Dependencies

- M2.T02
- M1.T04 approved schema or compatible local placeholder

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

- Add template registration, deactivation, and lookup functions.
- Store conditionId, bettingCloseAt, resolutionDeadline, loserFeeBps, and active flag.
- Enforce registered and active template use in funding.
- Reject funding after bettingCloseAt.

## Non-goals

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- Keep registry minimal. Do not store large display metadata on-chain.
- Use templateHash as primary identifier.

## Acceptance criteria

- Registered active template can be used for a bet.
- Unregistered, inactive, expired, or mismatched conditionId template fails.
- Template registration and deactivation are access-controlled.
- Template events include enough fields for backend indexer to sync.

## Required QA and test plan

- Run `cd smartcontract && forge test --match-path "test/*Template*.t.sol" -vvv`.
- Run full `cd smartcontract && forge test`.
- Capture event assertions for register/deactivate/funding validation.

## Required evidence to version and attach to the PR

- evidence/M2-T06/template-registry-tests.log.
- evidence/M2-T06/template-events.md.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
