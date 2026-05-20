# M3.5.T08 — Implement fee quotation, reconciliation, and failure recovery

**Milestone:** M3.5 — Platform Wallet, Pix, and Automated BRL1 Operations  
**Priority:** P1  
**Type:** Backend / Reconciliation  
**Status:** Planned

## Dependencies

- M3.5.T02
- M3.5.T04
- M3.5.T05
- M3.5.T06

## Recommended specialist subagents

- backend-specialist
- qa-specialist
- security-reviewer

## Execution requirements

- Execute the task in an independent git worktree created from the intended base branch.
- Open the implementation PR as a Draft PR and keep it in draft until QA evidence is complete.
- Use granular, descriptive commits. Avoid large mixed commits.
- Use specialist subagents whenever the task touches their domain; critical development or QA decisions must use the best available model with reasoning xhigh.
- Do not mark the task complete by the agent. Human-in-the-loop approval closes the task after PR review and QA approval.

## Scope

- Implement reconciliation jobs for Inter Pix events, Inter-to-OKX funding events, OKX trades, OKX withdrawals, wallet credits, Inter payouts, and ledger state.
- Implement idempotent retry and manual review queues for failed states.
- Expose internal endpoints to inspect reconciliation status.
- Ensure all fee categories are reported separately.
- Implement reconciliation reports for provider balances versus internal ledger balances.

## Non-goals

- Do not auto-resolve ambiguous provider states without explicit rules.
- Do not hide failed states from admin/QA evidence.
- Do not reconcile M3 wallet-first BRL1 balances as if they were platform-custodied funds.

## Acceptance criteria

- Reconciliation detects missing provider reference, duplicate Inter event, duplicate OKX event, failed Inter-to-OKX funding, failed OKX order, failed OKX withdrawal, failed Inter payout, and stale pending state.
- Retry logic is idempotent.
- Manual-review queue includes actionable reason and related records.
- Fee report separates Inter/Pix/banking fee, OKX exchange fee, OKX/network withdrawal fee, wallet/provider fee, and betting loserFee.
- Balance report identifies mismatches between ledger, Inter balance, OKX balance, and wallet credit state.

## Required QA and test plan

- Run reconciliation tests.
- Run curl to inspect reconciliation summary.
- Run curl to simulate duplicate Inter event.
- Run curl to simulate duplicate OKX event.
- Run curl to simulate stale pending transaction and verify manual-review queue.
- Run curl to fetch fee separation report.

## Required evidence to version and attach to the PR

- evidence/M3.5-T08/reconciliation-tests.log
- evidence/M3.5-T08/curl-reconciliation-summary.json
- evidence/M3.5-T08/curl-duplicate-inter-event.json
- evidence/M3.5-T08/curl-duplicate-okx-event.json
- evidence/M3.5-T08/curl-manual-review-queue.json
- evidence/M3.5-T08/fee-separation-report.json
- evidence/M3.5-T08/balance-reconciliation-report.json

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
