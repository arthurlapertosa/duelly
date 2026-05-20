# M3.T05 — Integrate template discovery and template publisher API

**Milestone:** M3 — Backend Core Orchestration, Wallet-First Flow  
**Priority:** P0  
**Type:** Backend / Templates  
**Status:** Planned

## Dependencies

- M1.T05
- M1.T06
- M3.T01

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

- Expose backend APIs for accepted sports templates produced by M1.
- Persist accepted template metadata in PostgreSQL.
- Expose template details required for frontend and contract registration.
- Implement or stub template publisher against local smart-contract registry.
- Preserve binary-only sports filters and rejection reasons from M1.

## Non-goals

- Do not introduce collectibles scope unless M1 is updated by human decision.
- Do not use Polymarket outcome prices/odds as final results.

## Acceptance criteria

- List templates endpoint returns only accepted active binary sports templates.
- Template detail includes conditionId, outcomes, rulesHash, close time, resolution deadline, loserFeeBps, and source metadata.
- Rejected markets are not exposed as bettable templates.
- Template publisher can register/stub registration and returns auditable status.

## Required QA and test plan

- Run backend template tests.
- Run curl to list templates.
- Run curl to fetch template detail.
- Run curl to inspect rejection reasons fixture.
- Run local publisher stub and capture response.

## Required evidence to version and attach to the PR

- evidence/M3-T05/template-tests.log
- evidence/M3-T05/curl-list-templates.json
- evidence/M3-T05/curl-template-detail.json
- evidence/M3-T05/curl-rejection-reasons.json
- evidence/M3-T05/curl-publisher-stub.json

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
