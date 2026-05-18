# M2.T01 — Set up Foundry smart-contract test environment and mocks

**Milestone:** M2 — Smart Contract Settlement Core  
**Priority:** P0  
**Type:** Smart Contract / Test Infrastructure  
**Status:** Planned

## Dependencies

- None

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

- Initialize or complete Foundry configuration in smartcontract/.
- Add MockBRL1 implementing ERC-20 and ERC-2612 permit for local tests.
- Add MockPolymarketCTF with configurable payout vectors.
- Add reusable test base with deterministic maker/taker private keys and addresses.

## Non-goals

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- Use local mocks as the CI baseline; no external RPC should be required for normal tests.
- Keep mock behavior close to the interfaces used by the production contract.

## Acceptance criteria

- smartcontract/foundry.toml exists and is documented.
- MockBRL1 supports minting in tests, permit signing, nonces, DOMAIN_SEPARATOR, transfer, and transferFrom.
- MockPolymarketCTF supports unresolved, player A wins, player B wins, and void/ambiguous payout vectors.
- A smoke test proves `forge test` runs successfully without network access.

## Required QA and test plan

- Run `cd smartcontract && forge test`.
- Run `cd smartcontract && forge test -vvv --match-test test_MocksSmoke` or equivalent smoke test.
- Capture mock mint, permit, and payout vector test outcomes in logs.

## Required evidence to version and attach to the PR

- evidence/M2-T01/forge-test.log.
- evidence/M2-T01/mocks-smoke.log.
- evidence/M2-T01/mock-capabilities.md.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
