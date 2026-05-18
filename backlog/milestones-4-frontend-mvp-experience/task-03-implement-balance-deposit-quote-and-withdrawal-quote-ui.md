# M4.T03 — Implement balance, deposit quote, and withdrawal quote UI

**Milestone:** M4 — Frontend MVP Experience  
**Priority:** P0  
**Type:** Frontend / Payments / Ledger  
**Status:** Planned

## Dependencies

- M4.T02
- M3.T04
- M3.T05

## Recommended specialist subagents

- frontend-specialist
- designer
- backend-specialist
- qa-specialist

## Execution requirements

- Execute the task in an independent git worktree created from the intended base branch.
- Open the implementation PR as a Draft PR and keep it in draft until QA evidence is complete.
- Use granular, descriptive commits. Avoid large mixed commits.
- Use specialist subagents whenever the task touches their domain; critical development or QA decisions must use the best available model with reasoning xhigh.
- Do not mark the task complete by the agent. Human-in-the-loop approval closes the task after PR review and QA approval.

## Scope

- Display user balance in BRL terms backed by BRL1.
- Show deposit quote including brokerage transaction fee and net credited amount.
- Show withdrawal quote including brokerage transaction fee and net payout amount.
- Display ledger rows or recent transactions with gross/fee/net breakdown.

## Non-goals

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- User-facing copy may say balance in R$ while details can explain token-backed settlement in help text.
- Fee transparency is mandatory before the user confirms money movement.

## Acceptance criteria

- Balance screen shows available amount and pending/mocked transaction state if applicable.
- Deposit quote shows gross deposit, transaction fee, and net balance impact.
- Withdrawal quote shows requested amount, transaction fee, and net payout.
- Brokerage transaction fees are visually separate from loserFee/betting fees.

## Required QA and test plan

- Run Playwright balance/deposit/withdrawal quote tests.
- Run curl deposit quote and withdrawal quote commands used by the frontend fixtures.
- Capture screenshots of balance, deposit quote, withdrawal quote, and ledger state.

## Required evidence to version and attach to the PR

- evidence/M4-T03/playwright-balance-payments.log.
- evidence/M4-T03/curl-deposit-quote.json.
- evidence/M4-T03/curl-withdrawal-quote.json.
- evidence/M4-T03/screenshots/balance.png.
- evidence/M4-T03/screenshots/deposit-quote.png.
- evidence/M4-T03/screenshots/withdrawal-quote.png.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
