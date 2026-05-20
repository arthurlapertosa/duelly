# M3.5.T06 — Implement Inter-to-OKX funding, BRL-to-BRL1 purchase, and platform-wallet credit flow

**Milestone:** M3.5 — Platform Wallet, Pix, and Automated BRL1 Operations  
**Priority:** P0  
**Type:** Backend / On-ramp / Inter PJ / OKX PJ / BRL1  
**Status:** Planned

## Dependencies

- M3.5.T03
- M3.5.T04
- M3.5.T05

## Recommended specialist subagents

- backend-specialist
- blockchain-specialist
- qa-specialist
- security-reviewer

## Execution requirements

- Execute the task in an independent git worktree created from the intended base branch.
- Open the implementation PR as a Draft PR and keep it in draft until QA evidence is complete.
- Use granular, descriptive commits. Avoid large mixed commits.
- Use specialist subagents whenever the task touches their domain; critical development or QA decisions must use the best available model with reasoning xhigh.
- Do not mark the task complete by the agent. Human-in-the-loop approval closes the task after PR review and QA approval.

## Scope

- Implement state machine for:
  - confirmed user Pix deposit into Inter PJ;
  - BRL available in Duelly Inter PJ balance;
  - Inter-to-OKX PJ funding transfer or manual-approved funding reference;
  - BRL available in OKX PJ;
  - OKX BRL1-BRL buy order;
  - OKX BRL1-Polygon withdrawal to the user's platform wallet;
  - wallet balance refresh and ledger finalization.
- Use mock provider mode by default.
- In live mode, require Inter PJ and OKX PJ titularity configuration to be approved before Inter-to-OKX funding can run.
- Record every state transition in ledger and provider transaction tables.
- Support manual funding reference mode for early PoC if Inter-to-OKX API payout is not automated yet.

## Non-goals

- Do not credit user wallet before purchase/withdrawal confirmation.
- Do not mix banking/exchange/network fees with betting loserFee.
- Do not enable live mode without explicit human approval.
- Do not send user Pix directly to OKX.

## Acceptance criteria

- Mock flow converts confirmed Inter Pix deposit into BRL1 credit to user platform wallet.
- Quote and final ledger show gross BRL, Inter/banking fee, OKX trade fee, BRL1 amount, OKX/network withdrawal fee, and net BRL1 credited amount.
- Titularity guard blocks live Inter-to-OKX funding unless Inter PJ and OKX PJ are configured as the same Duelly legal entity/tax identity.
- Failures in Inter funding, OKX purchase, OKX withdrawal, or wallet balance refresh leave recoverable pending/failed states.
- User wallet balance can be refreshed after credit.

## Required QA and test plan

- Run backend on-ramp flow tests.
- Run curl to create mock Inter deposit, confirm it, execute Inter-to-OKX funding, execute OKX purchase, and credit wallet.
- Run curl to fetch ledger and platform wallet balance.
- Run failure-path curl for Inter funding failure, OKX purchase failure, OKX withdrawal failure, and wallet refresh failure.
- Run configuration test proving titularity guard blocks live funding when mismatched.

## Required evidence to version and attach to the PR

- evidence/M3.5-T06/onramp-flow-tests.log
- evidence/M3.5-T06/curl-confirmed-inter-deposit.json
- evidence/M3.5-T06/curl-inter-to-okx-funding.json
- evidence/M3.5-T06/curl-okx-purchase-and-wallet-credit.json
- evidence/M3.5-T06/curl-ledger-after-credit.json
- evidence/M3.5-T06/curl-failure-recovery.json
- evidence/M3.5-T06/titularity-guard-test.log

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
