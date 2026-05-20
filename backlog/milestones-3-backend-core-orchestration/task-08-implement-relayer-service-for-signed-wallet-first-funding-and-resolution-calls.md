# M3.T08 — Implement relayer service for signed wallet-first funding and resolution calls

**Milestone:** M3 — Backend Core Orchestration, Wallet-First Flow  
**Priority:** P0  
**Type:** Backend / Blockchain / Relayer  
**Status:** Planned

## Dependencies

- M2.T04
- M2.T07
- M3.T06
- M3.T07

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

- Implement relayer interface for `acceptBetWithPermits` and `resolveFromPolymarket` calls.
- Accept user-provided BetOffer, BetAcceptance, and ERC-2612 permit signatures.
- Validate payload shape before submitting transactions when possible.
- Support local Anvil/Foundry chain for QA.
- Record request id, transaction hash, user ids, invite id, bet id when available, and errors.

## Non-goals

- Do not hold user private keys.
- Do not sign user permits.
- Do not perform fiat or exchange operations.
- Do not bypass smart-contract validation.

## Acceptance criteria

- Relayer submits local funding transaction successfully when given valid signatures/permits.
- Relayer rejects missing/invalid signatures before attempting transaction when possible.
- Atomic funding failure leaves no local bet marked as funded.
- Relayer logs are queryable for QA.
- Resolution call can be submitted when a local bet is eligible.

## Required QA and test plan

- Run backend relayer tests.
- Run local smart-contract stack or mocked relayer mode.
- Run curl to submit a local funding request and capture transaction outcome.
- Run curl to fetch relayer transaction log.
- Run negative curl with invalid/missing signature.

## Required evidence to version and attach to the PR

- evidence/M3-T08/relayer-tests.log
- evidence/M3-T08/curl-local-funding.json
- evidence/M3-T08/curl-relayer-transaction-log.json
- evidence/M3-T08/curl-invalid-signature.json
- evidence/M3-T08/local-contract-outcome.log

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
