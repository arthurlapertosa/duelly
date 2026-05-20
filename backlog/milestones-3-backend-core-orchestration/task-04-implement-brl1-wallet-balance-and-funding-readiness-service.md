# M3.T04 — Implement BRL1 wallet balance and funding-readiness service

**Milestone:** M3 — Backend Core Orchestration, Wallet-First Flow  
**Priority:** P0  
**Type:** Backend / Blockchain / BRL1  
**Status:** Planned

## Dependencies

- M3.T03
- M2.T04 test vectors or compatible local spec

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

- Implement BRL1 read service for linked external wallets.
- Read BRL1 balance, decimals, symbol, permit nonce, and allowance when a spender is configured.
- Expose a betting-readiness endpoint that compares wallet balance against `stake + loserFee`.
- Return permit metadata needed by the frontend to request ERC-2612 signatures.
- Support local MockBRL1 and optional Polygon live-read mode.

## Non-goals

- Do not buy BRL1 for the user.
- Do not move user funds.
- Do not perform fiat operations.
- Do not use exchange/brokerage APIs.

## Acceptance criteria

- Balance endpoint returns BRL1 balance for a linked wallet.
- Funding-readiness endpoint returns required amount, available amount, missing amount, permit nonce, and whether the wallet can attempt a bet.
- Readiness clearly separates betting loserFee from any future brokerage/on-ramp fee.
- Local MockBRL1 mode is deterministic and testable.
- Optional live-read mode uses `POLYGON_RPC_URL` and `BRL1_ADDRESS_POLYGON` without requiring secrets beyond the RPC URL.

## Required QA and test plan

- Run backend BRL1 service tests.
- Run local MockBRL1 stack and query a seeded wallet via curl.
- Run curl for insufficient balance and sufficient balance cases.
- Optional: run live-read curl against a public wallet if `POLYGON_RPC_URL` is available.

## Required evidence to version and attach to the PR

- evidence/M3-T04/brl1-service-tests.log
- evidence/M3-T04/curl-balance-sufficient.json
- evidence/M3-T04/curl-balance-insufficient.json
- evidence/M3-T04/curl-permit-metadata.json
- evidence/M3-T04/live-read-optional.md

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
