# M3.5 — Platform Wallet, Pix, and Automated BRL1 Operations

## Goal

Add the optional platform-managed funding experience after the wallet-first MVP path is working: platform wallet creation, Pix deposit intake through **Inter PJ**, BRL-to-BRL1 purchase automation through **OKX PJ**, BRL1 credit to user wallets, BRL1 sale, fiat withdrawal, brokerage fee accounting, and reconciliation.

M3.5 is explicitly non-blocking for M4, M5, and M6, and it does not block M4, M5, and M6. It can run in parallel or after the wallet-first MVP, but it must not become a dependency of the user-facing MVP flow, full-stack E2E validation, or controlled pilot readiness.

## PoC provider decision

For the PoC, the approved provider path is:

```text
User Pix payment
  -> Inter PJ account owned by Duelly legal entity
  -> Pix transfer from Inter PJ to OKX PJ account with the same legal entity/tax identity
  -> OKX PJ buys BRL1 on BRL1-BRL
  -> OKX PJ withdraws BRL1-Polygon to the user's platform wallet
```

The reverse path is:

```text
User/platform wallet BRL1
  -> OKX PJ BRL1-Polygon deposit or controlled treasury transfer
  -> OKX PJ sells BRL1 to BRL
  -> BRL is sent from OKX PJ to Inter PJ when needed
  -> Inter PJ pays the user's verified Pix destination
```

This solves the exchange deposit titularity problem because OKX receives fiat from the Duelly PJ banking account, not directly from end users or from unrelated third-party accounts.

## External dependencies

- Inter PJ account and API access for Pix deposit intake, Pix status, bank balance, Pix payout, reconciliation, and webhook handling.
- OKX PJ account with BRL1-BRL trading enabled and BRL1-Polygon withdrawal enabled.
- Confirmation that Inter PJ and OKX PJ belong to the same legal entity/tax identity used by Duelly for the PoC.
- OKX API credentials split by permission: read-only, trade, and withdrawal.
- Inter API credentials/certificates/secrets managed outside the repository.
- Embedded/platform wallet provider decision, for example Privy or equivalent.
- Compliance/legal review for betting, Pix/payment processing, crypto/on-ramp, custody/wallet model, KYC/AML, user eligibility, and provider terms.
- Human approval before any real-money live-mode transaction is enabled.

## Required backend stack

- Node.js.
- TypeScript.
- Fastify.
- PostgreSQL.
- TypeORM.

## Delivery principles

- Deliver in small Draft PRs using independent worktrees.
- Every task must include tests and versioned evidence artifacts.
- Backend feature validation must include curl end-to-end calls whenever an API endpoint is touched.
- Frontend tasks must include Playwright QA, screenshots, and traces.
- Real-money tasks must default to mock/sandbox mode and require explicit human approval for live mode.
- Provider API secrets, certificates, keys, passphrases, CNPJ/CPF, bank details, account ids, and sensitive balances must be redacted from evidence.
- Agent work is not final until human-in-the-loop review approves QA and closes the task.

## In scope

- Platform wallet creation and wallet-provider abstraction.
- Inter PJ Pix deposit provider abstraction, webhook handling, Pix status, Pix payout, and reconciliation.
- OKX PJ exchange adapter for BRL1-BRL market data, balances, spot trading, internal transfers, and BRL1-Polygon withdrawals.
- Automated Inter-to-OKX funding workflow for PoC operations.
- Automated BRL-to-BRL1 purchase and BRL1 transfer/credit to the platform-created user wallet.
- Automated BRL1-to-BRL sale and fiat withdrawal request flow.
- User ledger for fiat deposits, Inter Pix movements, OKX trades, BRL1 withdrawals, brokerage fees, transfer/network fees, withdrawals, failures, and reversals.
- Fee quotes that keep banking/payment fees, exchange fees, network fees, and betting loserFee separate.
- Reconciliation and failure recovery.
- Optional frontend flows for platform wallet, deposit, and withdrawal.

## Out of scope

- M3.5 does not change M3 wallet-first acceptance criteria.
- M3.5 does not block M4, M5, or M6.
- Stripe is not part of the approved PoC money-movement path.
- No direct Pix from end users into OKX, Mercado Bitcoin, or any exchange account.
- No PF account is used for user funds in the M3.5 PoC path.
- No production launch without compliance approval and provider terms acceptance.
- No custody of private keys outside an approved embedded-wallet provider and security review.

## Relationship to M3, M4, M5, and M6

- M3 is the MVP backend path for users who bring their own BRL1 wallet.
- M4 uses M3 wallet-first APIs and must not depend on platform wallet, Pix, Inter, or OKX flows.
- M5 validates E2E with seeded private wallets and local BRL1 funding.
- M6 controlled pilot can use wallet-first users and manual/pre-funded BRL1. M3.5 can be enabled later as an optional enhancement.

## Task plan, priorities, and dependencies

| Task | Priority | Title | Dependencies |
|---|---:|---|---|
| M3.5.T01 | P0 | Define Inter PJ + OKX PJ architecture, provider policy, and compliance gate | M3.T02, Inter/OKX provider decisions |
| M3.5.T02 | P0 | Implement auditable ledger and provider interface foundation | M3.5.T01 |
| M3.5.T03 | P0 | Implement platform wallet provider adapter and wallet creation flow | M3.5.T01, wallet provider decision |
| M3.5.T04 | P0 | Implement Inter PJ Pix deposit intake adapter and webhook handling | M3.5.T02, Inter PJ API access or mock mode |
| M3.5.T05 | P0 | Implement OKX PJ BRL1 exchange adapter for PoC automation | M3.5.T02, OKX PJ credentials for non-mock tests |
| M3.5.T06 | P0 | Implement Inter-to-OKX funding, BRL-to-BRL1 purchase, and platform-wallet credit flow | M3.5.T03, M3.5.T04, M3.5.T05 |
| M3.5.T07 | P1 | Implement BRL1-to-BRL sale and Inter PJ Pix withdrawal flow | M3.5.T02, M3.5.T04, M3.5.T05 |
| M3.5.T08 | P1 | Implement fee quotation, reconciliation, and failure recovery | M3.5.T02, M3.5.T04, M3.5.T05, M3.5.T06 |
| M3.5.T09 | P1 | Implement optional platform-wallet deposit/withdraw frontend experience | M4.T01, M3.5.T03, M3.5.T06, M3.5.T07 |
| M3.5.T10 | P2 | Run optional on-ramp/off-ramp E2E QA bundle | M3.5.T06, M3.5.T07, M3.5.T08, M3.5.T09 |

## Milestone-level quality gates

- Mock mode works without real Inter or OKX credentials.
- Live-provider mode is disabled unless explicitly enabled by environment and human approval.
- Provider configuration verifies the intended PoC titularity model: Inter PJ and OKX PJ must belong to the same legal entity before live Inter-to-OKX funding is enabled.
- Direct user-to-exchange Pix is not supported by any API, test, copy, or runbook.
- Banking/payment fees, exchange fees, network fees, and betting loserFee are separate in quotes, ledger records, UI, and evidence.
- Provider webhooks are idempotent and auditable.
- All money-movement state transitions are recoverable and versioned.
- No M4, M5, or M6 task depends on M3.5.

## Milestone Definition of Done

- Platform wallet creation works in mock mode and provider mode if credentials are available.
- Inter PJ Pix deposit intake works in mock mode and provider mode if credentials are available.
- OKX PJ adapter can validate market data, account currencies, trading, and BRL1-Polygon withdrawal in controlled tests.
- Inter-to-OKX funding state is represented in the ledger and cannot run live without approval.
- BRL-to-BRL1 credit flow records complete ledger entries and provider references.
- Withdrawal flow records quote, sale, Inter/OKX provider transactions, fees, and final status.
- Optional frontend flows pass Playwright QA if implemented.
- Full evidence bundle is versioned and linked from PRs.

## Evidence requirements

- Each task stores versioned evidence under `evidence/<task-id>/` and links it from the PR.
- Backend evidence includes curl command outputs for end-to-end API validation whenever backend is touched.
- Frontend evidence includes Playwright reports, screenshots, and traces whenever UI is touched.
- Provider evidence must redact secrets, API keys, certificates, passphrases, account ids, CPF/CNPJ, bank details, and sensitive balances unless explicitly approved.
- Smart-contract/on-chain evidence includes tx hashes, token balance reads, and redacted provider responses when applicable.
