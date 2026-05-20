# M3.5.T07 — Implement BRL1-to-BRL sale and Inter PJ Pix withdrawal flow

**Milestone:** M3.5 — Platform Wallet, Pix, and Automated BRL1 Operations  
**Priority:** P1  
**Type:** Backend / Off-ramp / Withdrawals / Inter PJ / OKX PJ  
**Status:** Planned

## Dependencies

- M3.5.T02
- M3.5.T04
- M3.5.T05

## Recommended specialist subagents

- backend-specialist
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

- Implement withdrawal quote and request flow.
- Implement BRL1 sell flow through mock OKX adapter and OKX PJ live adapter when approved.
- Implement Inter PJ Pix payout request abstraction in mock mode and live mode when approved.
- Record fees, sale price, Inter/OKX provider references, and final status.
- Require user confirmation after quote before initiating withdrawal.
- Validate beneficiary data before Pix payout.

## Non-goals

- Do not process live withdrawals without human approval.
- Do not send Pix to unverified beneficiary data.
- Do not allow withdrawal if wallet/user status fails compliance gates.
- Do not make this flow mandatory for M4/M5/M6 wallet-first validation.

## Acceptance criteria

- Withdrawal quote returns requested BRL/BRL1 amount, BRL1 sale estimate, OKX exchange fee, OKX/network fee when applicable, Inter/Pix payout fee when applicable, and net fiat payout.
- Confirmed withdrawal creates immutable ledger entries and provider references.
- Mock withdrawal can complete successfully through OKX sell and Inter payout states.
- Failed withdrawal creates auditable failure state and does not corrupt balance.
- Inter Pix payout only accepts verified beneficiary records.

## Required QA and test plan

- Run backend withdrawal tests.
- Run curl to create withdrawal quote.
- Run curl to confirm mock withdrawal.
- Run curl to simulate OKX sale failure.
- Run curl to simulate Inter payout failure.
- Run curl to fetch final ledger state.

## Required evidence to version and attach to the PR

- evidence/M3.5-T07/withdrawal-tests.log
- evidence/M3.5-T07/curl-withdrawal-quote.json
- evidence/M3.5-T07/curl-withdrawal-confirmed.json
- evidence/M3.5-T07/curl-okx-sale-failure.json
- evidence/M3.5-T07/curl-inter-payout-failure.json
- evidence/M3.5-T07/curl-final-ledger.json

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
