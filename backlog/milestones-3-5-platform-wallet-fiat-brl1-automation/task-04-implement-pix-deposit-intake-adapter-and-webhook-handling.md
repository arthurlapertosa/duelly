# M3.5.T04 — Implement Inter PJ Pix deposit intake adapter and webhook handling

**Milestone:** M3.5 — Platform Wallet, Pix, and Automated BRL1 Operations  
**Priority:** P0  
**Type:** Backend / Payments / Pix / Inter PJ  
**Status:** Planned

## Dependencies

- M3.5.T02
- Inter PJ API access or mock mode

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

- Implement `BankingProvider` adapter for Inter PJ Pix deposit intake.
- Implement mock Inter provider for deterministic local QA.
- Support Pix charge/deposit creation, status polling, webhook receipt, signature/authentication validation, and reconciliation references.
- Add idempotency handling for duplicate webhook events.
- Map confirmed Inter Pix deposits into ledger entries.
- Record payer information only when required and redact sensitive fields in logs/evidence.
- Add provider configuration flags for mock mode, sandbox mode if available, and live mode.

## Non-goals

- Do not assume Stripe is part of the PoC path.
- Do not use direct user-to-OKX Pix.
- Do not use real-money live mode without explicit human approval.
- Do not credit BRL1 before a Pix deposit is confirmed and reconciled.

## Acceptance criteria

- Mock Inter Pix deposit can move from pending to confirmed.
- Webhook handler rejects invalid signatures or unauthenticated events.
- Duplicate webhook does not double-credit ledger.
- Confirmed Pix deposit creates gross deposit and banking/provider fee ledger entries.
- Failed/cancelled/expired deposit creates auditable status without credit.
- Backend can expose redacted Inter provider status through a QA endpoint.

## Required QA and test plan

- Run backend Inter Pix adapter tests.
- Run curl to create mock Pix deposit.
- Run curl to simulate confirmed Inter webhook.
- Run curl to replay webhook and verify idempotency.
- Run curl for invalid webhook signature.
- Run curl to fetch redacted deposit/ledger state.

## Required evidence to version and attach to the PR

- evidence/M3.5-T04/inter-pix-adapter-tests.log
- evidence/M3.5-T04/curl-create-mock-inter-pix-deposit.json
- evidence/M3.5-T04/curl-inter-webhook-confirmed.json
- evidence/M3.5-T04/curl-inter-webhook-replay.json
- evidence/M3.5-T04/curl-invalid-webhook.json
- evidence/M3.5-T04/curl-redacted-deposit-ledger.json

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
