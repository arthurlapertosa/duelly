# M2.T03 — Implement EIP-712 BetOffer and BetAcceptance validation

**Milestone:** M2 — Smart Contract Settlement Core  
**Priority:** P0  
**Type:** Smart Contract / Signatures  
**Status:** Planned

## Dependencies

- M2.T02

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

- Define EIP-712 domain for the escrow contract.
- Define BetOffer and BetAcceptance type hashes.
- Validate maker and taker signatures, nonces, deadlines, and offerHash reuse.
- Reject same-player bets, same-outcome bets, tampered fields, and unauthorized takers.

## Non-goals

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- Use deterministic test private keys and Foundry vm.sign helpers.
- Use explicit revert errors to improve QA and backend debugging.

## Acceptance criteria

- Valid BetOffer and BetAcceptance signatures pass.
- Signature by wrong private key fails.
- Expired offer or acceptance fails.
- Reused offerHash or nonce fails.
- Any tampering with stake, templateHash, conditionId, outcomes, taker, or deadlines invalidates the signature.

## Required QA and test plan

- Run `cd smartcontract && forge test --match-path "test/*EIP712*.t.sol" -vvv`.
- Run full `cd smartcontract && forge test`.
- Capture digest/test vector values for backend compatibility.

## Required evidence to version and attach to the PR

- evidence/M2-T03/eip712-tests.log.
- evidence/M2-T03/eip712-test-vectors.json.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
