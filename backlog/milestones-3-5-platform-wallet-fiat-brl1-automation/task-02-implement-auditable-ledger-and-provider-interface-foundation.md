# M3.5.T02 — Implement auditable ledger and provider interface foundation

**Milestone:** M3.5 — Platform Wallet, Pix, and Automated BRL1 Operations  
**Priority:** P0  
**Type:** Backend / Ledger / Providers  
**Status:** Planned

## Dependencies

- M3.5.T01

## Recommended specialist subagents

- backend-specialist
- security-reviewer
- qa-specialist

## Execution requirements

- Execute the task in an independent git worktree created from the intended base branch.
- Open the implementation PR as a Draft PR and keep it in draft until QA evidence is complete.
- Use granular, descriptive commits. Avoid large mixed commits.
- Use specialist subagents whenever the task touches their domain; critical development or QA decisions must use the best available model with reasoning xhigh.
- Do not mark the task complete by the agent. Human-in-the-loop approval closes the task after PR review and QA approval.

## Scope

- Implement ledger entities and TypeORM migrations for fiat deposits, Inter Pix movements, OKX funding movements, OKX trades, BRL1 withdrawals, wallet credits, BRL1 sells, fiat withdrawals, fees, reversals, and failures.
- Implement provider interfaces for:
  - `BankingProvider`, with Inter PJ as the PoC live provider and a deterministic mock provider;
  - `ExchangeProvider`, with OKX PJ as the PoC live provider and a deterministic mock provider;
  - `WalletProvider`, with the selected embedded/platform wallet provider and a deterministic mock provider.
- Define ledger transaction states and idempotency keys for all money-movement paths.
- Store safe provider references without secrets.
- Provide internal APIs for ledger inspection during QA.

## Non-goals

- Do not integrate live Inter or OKX endpoints in this task.
- Do not process real money.
- Do not store API secrets, certificates, passphrases, private keys, CPF/CNPJ, or bank account details in logs or committed fixtures.

## Acceptance criteria

- Ledger schema separates:
  - user Pix deposit;
  - Inter PJ bank balance movement;
  - Inter-to-OKX funding transfer;
  - OKX BRL balance;
  - OKX BRL1 trade;
  - OKX BRL1-Polygon withdrawal;
  - user wallet BRL1 credit;
  - betting loserFee.
- Provider interfaces are typed, testable, and mockable.
- Every ledger state transition is append-only or auditable.
- Duplicate provider event ids do not create duplicate ledger credits.
- Fee categories include at least: Inter/Pix/banking fee, OKX exchange fee, OKX/network withdrawal fee, wallet/provider fee, and betting loserFee.
- Backend exposes a QA-safe ledger inspection endpoint with sensitive fields redacted.

## Required QA and test plan

- Run backend unit tests for ledger entities and provider interfaces.
- Run TypeORM migration up/down locally against PostgreSQL.
- Run curl to create a mock ledger scenario.
- Run curl to fetch redacted ledger entries.
- Run duplicate-event test and verify idempotency.

## Required evidence to version and attach to the PR

- evidence/M3.5-T02/ledger-tests.log
- evidence/M3.5-T02/typeorm-migration.log
- evidence/M3.5-T02/curl-create-mock-ledger-scenario.json
- evidence/M3.5-T02/curl-redacted-ledger.json
- evidence/M3.5-T02/idempotency-test.log

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
