# M2.T02 — Implement BetEscrowBRL1 contract skeleton and configuration

**Milestone:** M2 — Smart Contract Settlement Core  
**Priority:** P0  
**Type:** Smart Contract / Core  
**Status:** Planned

## Dependencies

- M2.T01

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

- Create BetEscrowBRL1 contract with immutable BRL1 and Polymarket CTF addresses.
- Add treasury configuration and access control for administrative functions.
- Define BetStatus, Template, Bet structs, and core events.
- Add min/max stake and max loserFeeBps configuration.

## Non-goals

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- Prefer simple, explicit storage structures over overly generic abstractions.
- BRL1 is the only token in MVP; do not build token allowlist complexity unless needed for tests.

## Acceptance criteria

- Contract compiles with no warnings that indicate broken storage, unused critical vars, or missing overrides.
- Constructor rejects zero addresses for BRL1, CTF, and treasury.
- Configuration setters are access-controlled and emit events.
- Initial default limits are test-covered.

## Required QA and test plan

- Run `cd smartcontract && forge test --match-path "test/*Config*.t.sol" -vvv` or equivalent.
- Run full `cd smartcontract && forge test`.

## Required evidence to version and attach to the PR

- evidence/M2-T02/config-tests.log.
- evidence/M2-T02/contract-storage-summary.md.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
