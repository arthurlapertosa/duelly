# M3.5.T09 — Implement optional platform-wallet deposit/withdraw frontend experience

**Milestone:** M3.5 — Platform Wallet, Pix, and Automated BRL1 Operations  
**Priority:** P1  
**Type:** Frontend / Platform Wallet / Payments  
**Status:** Planned

## Dependencies

- M4.T01
- M3.5.T03
- M3.5.T06
- M3.5.T07

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

- Add optional UI path for platform wallet creation.
- Add optional Inter Pix deposit quote/status UI.
- Add optional BRL1 credit status UI.
- Add optional withdrawal quote/status UI.
- Keep wallet-first M4 flow available and unaffected.
- Use clear copy that separates betting fee from money-movement fees.
- Hide provider names from the primary user journey unless needed for receipts or legal/payment context.

## Non-goals

- Do not make platform wallet mandatory.
- Do not mention unsupported live providers as available.
- Do not use Web3 jargon in the primary user-facing copy.
- Do not show Stripe as an available PoC route.

## Acceptance criteria

- User can choose platform-wallet path only when feature flag is enabled.
- Deposit quote shows gross amount, Inter/payment fees, OKX/exchange/network fees, and net BRL1 credited.
- Withdrawal quote shows requested amount, fees, and net fiat payout.
- Wallet-first flow still passes existing M4 Playwright tests.
- Feature flag off hides M3.5 UI without breaking navigation.
- UI states include pending Pix, confirmed Pix, purchasing BRL1, transferring BRL1, credited, failed, and manual review.

## Required QA and test plan

- Run frontend tests.
- Run Playwright platform-wallet deposit flow.
- Run Playwright withdrawal quote flow.
- Run Playwright feature-flag-off regression.
- Run curl commands used by frontend fixtures for deposit/withdraw endpoints.

## Required evidence to version and attach to the PR

- evidence/M3.5-T09/frontend-tests.log
- evidence/M3.5-T09/playwright-platform-wallet-report/
- evidence/M3.5-T09/screenshots/deposit-quote.png
- evidence/M3.5-T09/screenshots/withdrawal-quote.png
- evidence/M3.5-T09/screenshots/credit-status.png
- evidence/M3.5-T09/curl-frontend-fixtures.json

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
