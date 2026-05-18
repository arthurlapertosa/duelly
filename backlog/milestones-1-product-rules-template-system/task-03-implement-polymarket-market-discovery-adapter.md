# M1.T03 — Implement Polymarket market discovery adapter

**Milestone:** M1 — Product Rules & Template System  
**Priority:** P0  
**Type:** Backend / Integration  
**Status:** Planned

## Dependencies

- M1.T01
- M1.T02

## Recommended specialist subagents

- backend-specialist
- qa-specialist

## Execution requirements

- Execute the task in an independent git worktree created from the intended base branch.
- Open the implementation PR as a Draft PR and keep it in draft until QA evidence is complete.
- Use granular, descriptive commits. Avoid large mixed commits.
- Use specialist subagents whenever the task touches their domain; critical development or QA decisions must use the best available model with reasoning xhigh.
- Do not mark the task complete by the agent. Human-in-the-loop approval closes the task after PR review and QA approval.

## Scope

- Implement a backend adapter that fetches or loads candidate Polymarket markets.
- Normalize raw market fields into internal candidate objects.
- Support category priority: collectibles first, sports fallback.
- Expose a local endpoint or CLI command to list normalized candidates.

## Non-goals

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- Adapter implementation may use any backend framework selected for the repo, but it must be testable with fixtures.
- Keep raw provider data separate from normalized template candidates.

## Acceptance criteria

- Adapter returns deterministic normalized objects from fixtures.
- Adapter never returns odds/probabilities as result fields.
- Adapter captures conditionId, marketId, questionId, outcomes, close time, category, source URL/reference, and rules text/hash input when available.
- Adapter surfaces provider errors and missing fields with explicit reasons.

## Required QA and test plan

- Run backend unit tests for adapter fixture normalization.
- Start backend locally and run `curl -sS http://localhost:<port>/templates/candidates?mode=fixture | jq`.
- Capture curl output and verify normalized fields are present.

## Required evidence to version and attach to the PR

- evidence/M1-T03/adapter-tests.log.
- evidence/M1-T03/curl-candidates.json.
- evidence/M1-T03/normalization-summary.md.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
