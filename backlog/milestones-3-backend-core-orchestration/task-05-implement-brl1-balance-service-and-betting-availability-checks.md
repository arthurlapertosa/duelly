# M3.T05 — Implement BRL1 balance service and betting availability checks

**Milestone:** M3 — Backend Core Orchestration  
**Priority:** P0  
**Type:** Backend / Blockchain  
**Status:** Planned

## Dependencies

- M3.T03
- M3.T04

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

- Implement BRL1 balance lookup abstraction for embedded and external wallets.
- Support mock balance mode and optional local Anvil/Foundry mode.
- Expose available balance and required deposit amount for a bet.
- Account for stake + loserFee requirement before creating/accepting an invite.

## Non-goals

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- For MVP UI, present BRL1 as BRL-equivalent balance while preserving exact token units internally.
- Do not rely on off-chain ledger balance alone for contract funding availability.

## Acceptance criteria

- Balance endpoint returns wallet address, token symbol, raw units, display amount, and availability status.
- Bet affordability check includes stake + loserFee.
- Balance service distinguishes on-chain BRL1 balance from off-chain ledger events.
- Errors for missing wallet or unsupported wallet mode are machine-readable.

## Required QA and test plan

- Run backend balance tests.
- Run curl to fetch balance for embedded mock wallet.
- Run curl to fetch affordability quote for a sample stake.
- If local contract stack exists, run curl against local chain-backed balance mode.

## Required evidence to version and attach to the PR

- evidence/M3-T05/balance-tests.log.
- evidence/M3-T05/curl-balance.json.
- evidence/M3-T05/curl-affordability.json.
- evidence/M3-T05/local-chain-balance.json or local-chain-not-available.md.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
