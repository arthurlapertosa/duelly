# M3.5.T10 — Run optional on-ramp/off-ramp E2E QA bundle

**Milestone:** M3.5 — Platform Wallet, Pix, and Automated BRL1 Operations  
**Priority:** P2  
**Type:** E2E / QA  
**Status:** Planned

## Dependencies

- M3.5.T06
- M3.5.T07
- M3.5.T08
- M3.5.T09

## Recommended specialist subagents

- qa-specialist
- backend-specialist
- frontend-specialist
- blockchain-specialist

## Execution requirements

- Execute the task in an independent git worktree created from the intended base branch.
- Open the implementation PR as a Draft PR and keep it in draft until QA evidence is complete.
- Use granular, descriptive commits. Avoid large mixed commits.
- Use specialist subagents whenever the task touches their domain; critical development or QA decisions must use the best available model with reasoning xhigh.
- Do not mark the task complete by the agent. Human-in-the-loop approval closes the task after PR review and QA approval.

## Scope

- Run full optional M3.5 QA with frontend, backend, mock Inter provider, mock OKX provider, local smart contract, and platform wallet.
- Cover Pix deposit to BRL1 credit, bet funding readiness, withdrawal quote, failure recovery, and feature-flag behavior.
- Collect screenshots, curl outputs, ledger state, provider states, and smart-contract outcomes.
- Optionally run a live controlled Inter/OKX PoC only after explicit human approval.

## Non-goals

- Do not require this bundle for M5 wallet-first E2E.
- Do not run live provider tests unless explicit human approval is recorded.
- Do not use live end-user money outside the approved PoC plan.

## Acceptance criteria

- Mock full-stack on-ramp flow passes.
- Mock full-stack withdrawal flow passes.
- Wallet-first E2E remains passing with M3.5 feature disabled.
- Evidence bundle includes all required artifacts and human QA signoff.
- Optional live PoC evidence, if executed, proves Inter PJ to OKX PJ titularity-compatible funding, OKX BRL1 purchase, OKX BRL1-Polygon withdrawal, and wallet balance update.

## Required QA and test plan

- Run local full-stack M3.5 orchestration.
- Run Playwright on-ramp/off-ramp flows.
- Run curl checks for ledger/reconciliation.
- Run local smart-contract readiness check after BRL1 credit.
- Run feature-flag-off regression for wallet-first M4/M5 flows.
- Optional live controlled test: run only with documented human approval and redacted evidence.

## Required evidence to version and attach to the PR

- evidence/M3.5-T10/playwright-report/
- evidence/M3.5-T10/curl-ledger-reconciliation.json
- evidence/M3.5-T10/smartcontract-readiness.log
- evidence/M3.5-T10/feature-flag-regression.log
- evidence/M3.5-T10/qa-summary.md
- evidence/M3.5-T10/live-poc-optional-redacted.md

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
