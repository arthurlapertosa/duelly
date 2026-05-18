# M3.T09 — Implement contract event indexer and bet state API

**Milestone:** M3 — Backend Core Orchestration  
**Priority:** P0  
**Type:** Backend / Indexing  
**Status:** Planned

## Dependencies

- M2.T06
- M2.T07
- M2.T08
- M3.T08

## Recommended specialist subagents

- backend-specialist
- blockchain-specialist
- qa-specialist

## Execution requirements

- Execute the task in an independent git worktree created from the intended base branch.
- Open the implementation PR as a Draft PR and keep it in draft until QA evidence is complete.
- Use granular, descriptive commits. Avoid large mixed commits.
- Use specialist subagents whenever the task touches their domain; critical development or QA decisions must use the best available model with reasoning xhigh.
- Do not mark the task complete by the agent. Human-in-the-loop approval closes the task after PR review and QA approval.

## Scope

- Index TemplateRegistered, BetFunded, BetResolved, BetVoided, and relevant config events.
- Persist derived bet state for frontend queries.
- Expose bet detail endpoint by betId and invite id when linked.
- Support local chain reindex from block zero or configured deployment block.

## Non-goals

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- Indexer should be idempotent and safe to restart.
- Store source transaction hash and block number for auditability.

## Acceptance criteria

- Indexer processes local BetFunded event and creates/updates bet state.
- Indexer processes local BetResolved and BetVoided events and updates final state.
- Bet API includes participants, templateHash, stake, loserFee, status, payout fields when resolved, and transaction references.
- Repeated indexing does not duplicate records.

## Required QA and test plan

- Run backend indexer tests.
- Generate local contract events using test script or relayer flow.
- Run curl to fetch indexed bet detail.
- Run reindex command twice and verify idempotency.

## Required evidence to version and attach to the PR

- evidence/M3-T09/indexer-tests.log.
- evidence/M3-T09/local-contract-events.log.
- evidence/M3-T09/curl-bet-detail.json.
- evidence/M3-T09/reindex-idempotency.log.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
