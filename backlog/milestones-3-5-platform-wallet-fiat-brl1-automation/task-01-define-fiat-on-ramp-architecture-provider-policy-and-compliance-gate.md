# M3.5.T01 — Define Inter PJ + OKX PJ architecture, provider policy, and compliance gate

**Milestone:** M3.5 — Platform Wallet, Pix, and Automated BRL1 Operations  
**Priority:** P0  
**Type:** Architecture / Payments / Exchange / Compliance  
**Status:** Planned

## Dependencies

- M3.T02
- Human decision: Inter PJ is the PoC banking/Pix provider
- Human decision: OKX PJ is the PoC exchange/BRL1 provider

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

- Document the M3.5 architecture separately from M3.
- Define the approved PoC money path:
  - user Pix payment into Inter PJ;
  - Inter PJ balance and reconciliation;
  - Pix transfer from Inter PJ to OKX PJ under the same Duelly legal entity/tax identity;
  - OKX PJ BRL-to-BRL1 trade;
  - OKX PJ BRL1-Polygon withdrawal to platform wallet.
- Define the reverse path:
  - BRL1 return/sale through OKX PJ;
  - BRL movement back to Inter PJ when needed;
  - Pix payout from Inter PJ to verified user beneficiary.
- Document provider roles: Inter PJ for banking/Pix, OKX PJ for BRL1 exchange/liquidity/withdrawal, platform wallet provider for user wallet creation, ledger/reconciliation for auditability.
- Explicitly remove Stripe from the approved M3.5 PoC money path.
- Define live-mode approval gates, environment flags, test-only limits, and kill switches.
- Document what remains mock-only until provider/compliance approval.

## Non-goals

- Do not implement provider integrations in this task.
- Do not make M3.5 a dependency of M4, M5, or M6.
- Do not modify M0, M1, or M2 scope.
- Do not approve production launch.

## Acceptance criteria

- Architecture doc states that M3.5 is non-blocking for M4/M5/M6.
- Provider policy explicitly separates Inter PJ, OKX PJ, wallet provider, and ledger responsibilities.
- Provider policy states that direct user-to-OKX Pix is unsupported and forbidden.
- Provider policy states that Inter PJ and OKX PJ must use the same legal entity/tax identity before live funding is enabled.
- Compliance gate checklist covers betting, Pix/payment, crypto/on-ramp, exchange use, custody/wallet model, KYC/AML, user eligibility, provider terms, and evidence redaction.
- Live mode requires explicit environment flag, human approval, and transaction limits.
- Stripe is documented as out of scope for the PoC money path.

## Required QA and test plan

- Run documentation/validation checks.
- Run curl against health/config endpoint if backend config flags are added.
- Capture reviewed architecture decision record.
- Verify that no M4, M5, or M6 task declares M3.5 as a blocking dependency.

## Required evidence to version and attach to the PR

- evidence/M3.5-T01/inter-okx-architecture-decision-record.md
- evidence/M3.5-T01/compliance-gate-checklist.md
- evidence/M3.5-T01/config-validation.log
- evidence/M3.5-T01/non-blocking-dependency-check.log

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
