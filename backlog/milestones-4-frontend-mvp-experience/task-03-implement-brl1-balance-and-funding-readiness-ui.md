# M4.T03 — Implement BRL1 balance and funding-readiness UI

**Milestone:** M4 — Frontend MVP Experience, Wallet-First Flow  
**Priority:** P0  
**Type:** Frontend / Wallet / BRL1  
**Status:** Planned

## Dependencies

- M4.T02
- M3.T04
- M3.T07

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

- Display BRL1 balance for the connected wallet in BRL terms.
- Display funding readiness for a selected stake and loserFee quote.
- Show required amount as `stake + loserFee`.
- Show insufficient balance guidance for wallet-first MVP.
- Keep money-movement/deposit UI out of M4.

## Non-goals

- Do not show deposit quote, withdrawal quote, Pix, Stripe, or brokerage fee UI.
- Do not merge loserFee with future on-ramp fees.

## Acceptance criteria

- Balance screen displays available BRL1 and wallet readiness state.
- Insufficient balance state explains that the user must add BRL1 to their wallet outside the MVP flow.
- Fee preview clearly explains loserFee and total required amount.
- Frontend consumes M3 balance/readiness/fee quote fixtures correctly.

## Required QA and test plan

- Run frontend tests.
- Run Playwright balance sufficient and insufficient scenarios.
- Run curl commands for balance/readiness/fee quote fixtures.
- Capture screenshots of sufficient and insufficient readiness states.

## Required evidence to version and attach to the PR

- evidence/M4-T03/frontend-tests.log
- evidence/M4-T03/playwright-balance-readiness-report/
- evidence/M4-T03/curl-balance-readiness-fixtures.json
- evidence/M4-T03/screenshots/balance-sufficient.png
- evidence/M4-T03/screenshots/balance-insufficient.png

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
