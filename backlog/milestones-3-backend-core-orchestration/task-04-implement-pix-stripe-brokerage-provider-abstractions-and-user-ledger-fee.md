# M3.T04 — Implement Pix, Stripe, brokerage provider abstractions, and user ledger fees

**Milestone:** M3 — Backend Core Orchestration  
**Priority:** P0  
**Type:** Backend / Payments / Ledger  
**Status:** Planned

## Dependencies

- M3.T01
- Stripe account
- BRL1 brokerage/provider decision

## Recommended specialist subagents

- backend-specialist
- qa-specialist
- security-reviewer

## Execution requirements

- Execute the task in an independent git worktree created from the intended base branch.
- Open the implementation PR as a Draft PR and keep it in draft until QA evidence is complete.
- Use granular, descriptive commits. Avoid large mixed commits.
- Use specialist subagents whenever the task touches their domain; critical development or QA decisions must use the best available model with reasoning xhigh.
- Do not mark the task complete by the agent. Human-in-the-loop approval closes the task after PR review and QA approval.

## Scope

- Create provider interfaces for deposit, withdrawal, and BRL1 purchase/sale operations.
- Implement mock providers for local testing.
- Implement user ledger entries for fiat deposit, BRL1 purchase, brokerage transaction fee, BRL1 credit, withdrawal, and withdrawal fee.
- Ensure brokerage transaction fees are deducted from user balance when money moves into or out of the platform, separate from loserFee.

## Non-goals

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- Real provider integrations may be blocked until credentials and contracts are available; mocks must still be complete.
- Ledger must be auditable and should not merge brokerage fees with betting fees.

## Acceptance criteria

- Deposit mock flow records gross deposit, brokerage fee, net BRL1 credited, and provider reference.
- Withdrawal mock flow records withdrawal amount, brokerage/transaction fee, net user payout, and provider reference.
- Ledger exposes immutable transaction records through a protected API.
- Fee values are visible to frontend through quote endpoints before user confirmation.
- Brokerage fees are never paid to the smart-contract treasury unless explicitly configured in a later milestone.

## Required QA and test plan

- Run backend ledger/payment tests.
- Run curl to request deposit quote and verify brokerage fee field.
- Run curl to simulate deposit confirmation and verify net BRL1 credit.
- Run curl to request withdrawal quote and verify fee deduction.
- Run curl to fetch ledger entries and verify gross/fee/net separation.

## Required evidence to version and attach to the PR

- evidence/M3-T04/payment-ledger-tests.log.
- evidence/M3-T04/curl-deposit-quote.json.
- evidence/M3-T04/curl-deposit-confirmation.json.
- evidence/M3-T04/curl-withdrawal-quote.json.
- evidence/M3-T04/curl-ledger.json.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
