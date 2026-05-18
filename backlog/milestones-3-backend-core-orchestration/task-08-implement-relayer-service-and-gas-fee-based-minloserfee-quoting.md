# M3.T08 — Implement relayer service and gas-fee-based minLoserFee quoting

**Milestone:** M3 — Backend Core Orchestration  
**Priority:** P0  
**Type:** Backend / Blockchain / Relayer  
**Status:** Planned

## Dependencies

- M2.T04
- M2.T05
- M3.T07

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

- Implement relayer interface for acceptBetWithPermits and resolveFromPolymarket calls.
- Implement gas fee estimator used to set or quote minLoserFee as at least 3x estimated gas cost in BRL1 terms.
- Expose a fee quote endpoint used by frontend before user confirmation.
- Support local Anvil/Foundry chain for QA.

## Non-goals

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- For MVP, use a conservative estimate and document assumptions for BRL1 conversion.
- Relayer must log transaction hash, request id, user ids, bet id when available, and errors.

## Acceptance criteria

- Fee quote endpoint returns stake, percent fee, gas-anchored minimum fee, selected loserFee, and explanation fields.
- Selected loserFee is never below configured 3x gas fee estimate.
- Relayer submits local funding transaction successfully when given valid signatures/permits.
- Relayer rejects missing/invalid signatures before attempting transaction when possible.
- Relayer logs are queryable for QA.

## Required QA and test plan

- Run backend relayer tests.
- Run local smart-contract stack or mocked relayer mode.
- Run curl to fee quote endpoint for small, normal, and high stake values.
- Run curl to submit a local funding request and capture transaction outcome.

## Required evidence to version and attach to the PR

- evidence/M3-T08/relayer-tests.log.
- evidence/M3-T08/curl-fee-quote-small.json.
- evidence/M3-T08/curl-fee-quote-normal.json.
- evidence/M3-T08/curl-local-funding.json.
- evidence/M3-T08/relayer-transaction-log.json.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
