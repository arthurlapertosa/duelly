# M1.T04 — Define deterministic template schema and templateHash

**Milestone:** M1 — Product Rules & Template System  
**Priority:** P0  
**Type:** Backend / Smart Contract Interface  
**Status:** Planned

## Dependencies

- M1.T01
- M1.T03

## Recommended specialist subagents

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

- Define the canonical Template schema shared by backend and smart contract.
- Define deterministic templateHash input ordering and encoding.
- Include loserFeeBps and minLoserFee policy fields where appropriate.
- Add tests proving equal inputs produce equal hashes and changed fields change the hash.

## Non-goals

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- Prefer an ABI-compatible hash definition that the smart contract can reproduce.
- Avoid hashing non-canonical JSON serialization unless canonicalization is formally specified and tested.

## Acceptance criteria

- Template schema includes marketId, conditionId, questionId, outcome labels, rulesHash, close time, resolution deadline, category, loserFeeBps, and active status.
- templateHash is deterministic across backend tests and Solidity tests or documented test vectors.
- Changing any critical field changes templateHash.
- Non-critical display metadata is either excluded from hash or explicitly included by design.

## Required QA and test plan

- Run backend hash tests.
- Run local smart-contract hash vector test or a placeholder contract/vector test if M2 contract is not implemented yet.
- Run curl endpoint to fetch a template candidate and verify the returned templateHash matches the test vector.

## Required evidence to version and attach to the PR

- evidence/M1-T04/hash-tests.log.
- evidence/M1-T04/template-hash-vectors.json.
- evidence/M1-T04/curl-template-hash.json.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
