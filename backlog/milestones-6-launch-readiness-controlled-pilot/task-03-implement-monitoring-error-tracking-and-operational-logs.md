# M6.T03 — Implement monitoring, error tracking, and operational logs

**Milestone:** M6 — Launch Readiness & Controlled Pilot  
**Priority:** P0  
**Type:** Backend / Observability  
**Status:** Planned

## Dependencies

- M3.T08
- M3.T09
- M3.T10

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

- Add structured logs for relayer, indexer, resolution trigger, wallet-readiness APIs, optional M3.5 provider adapters if enabled, and critical API actions.
- Define metrics or health signals for pending bets, failed relayer txs, unresolved bets, and failed provider operations.
- Add error tracking integration or documented placeholder if provider not selected.

## Non-goals

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- Avoid logging secrets, private keys, raw signed payloads when not needed, or personal data beyond what is approved.
- Make logs useful for investigating money movement and settlement issues.

## Acceptance criteria

- Relayer logs include request id, transaction hash, status, and error reason when failed.
- Resolution trigger logs pending/success/failure attempts.
- Indexer logs processed block/event and idempotency behavior.
- Health/metrics endpoint or documented dashboard query exists.

## Required QA and test plan

- Run backend observability tests if implemented.
- Run curl to trigger relayer/resolution/indexer flows and capture logs.
- Run curl to health/metrics endpoint.

## Required evidence to version and attach to the PR

- evidence/M6-T03/observability-tests.log.
- evidence/M6-T03/relayer-log-sample.jsonl.
- evidence/M6-T03/resolution-log-sample.jsonl.
- evidence/M6-T03/curl-metrics.json.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
