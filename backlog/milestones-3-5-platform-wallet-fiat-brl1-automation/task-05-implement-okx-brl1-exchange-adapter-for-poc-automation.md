# M3.5.T05 — Implement OKX PJ BRL1 exchange adapter for PoC automation

**Milestone:** M3.5 — Platform Wallet, Pix, and Automated BRL1 Operations  
**Priority:** P0  
**Type:** Backend / Exchange / OKX PJ / BRL1  
**Status:** Planned

## Dependencies

- M3.5.T02
- OKX PJ credentials for non-mock tests

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

- Implement exchange adapter interface for OKX PJ market data, balances, internal transfers, spot orders, order status, fills, and BRL1-Polygon withdrawals.
- Support read-only validation mode.
- Support mock trading and mock withdrawal mode for CI.
- Support live tiny-trade mode only behind explicit human-approved flag.
- Support separate OKX API credentials for read-only, trade, and withdrawal operations.
- Redact all provider secrets and sensitive account data in logs/evidence.
- Validate the known PoC market and chain identifiers:
  - `BRL1-BRL` spot instrument;
  - `BRL1-Polygon` withdrawal chain;
  - BRL1 Polygon contract address.

## Non-goals

- Do not enable live trade/withdrawal by default.
- Do not store API secrets in the repository.
- Do not use a PF OKX account for user-fund PoC flows.
- Do not make OKX adapter required for M3 wallet-first flow.

## Acceptance criteria

- Public market data validates `BRL1-BRL` instrument, ticker, and order book.
- Read-only private validation confirms `BRL1-Polygon`, `canWd=true`, minimum withdrawal, fee, and contract address when credentials are provided.
- Mock order flow records order id, fill, fee, and average price.
- Mock withdrawal flow records withdrawal id, chain, fee, destination, and pending/success/failure states.
- Live tiny-trade and live tiny-withdrawal modes require explicit feature flags and human approval evidence.
- Adapter exposes enough data for fee quotation and reconciliation.

## Required QA and test plan

- Run backend OKX adapter tests.
- Run curl to fetch public BRL1-BRL market data through backend adapter.
- Run read-only private validation when credentials are available.
- Run mock trade and mock withdrawal through backend endpoints.
- Optional: run tiny live trade and withdrawal only after human approval.

## Required evidence to version and attach to the PR

- evidence/M3.5-T05/okx-adapter-tests.log
- evidence/M3.5-T05/curl-okx-public-market-data.json
- evidence/M3.5-T05/okx-read-only-validation-redacted.json
- evidence/M3.5-T05/curl-okx-mock-trade.json
- evidence/M3.5-T05/curl-okx-mock-withdrawal.json
- evidence/M3.5-T05/live-trade-and-withdrawal-optional.md

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
