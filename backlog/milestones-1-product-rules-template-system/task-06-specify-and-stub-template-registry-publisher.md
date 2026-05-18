# M1.T06 — Specify and stub template registry publisher

**Milestone:** M1 — Product Rules & Template System  
**Priority:** P1  
**Type:** Backend / Smart Contract Interface  
**Status:** Planned

## Dependencies

- M1.T04
- M1.T05

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

- Specify how accepted templates are published to the smart contract registry.
- Create a backend publisher interface with mock/local implementation.
- Define expected contract call data and events for template registration.
- Ensure the backend cannot publish rejected templates.

## Non-goals

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- This task can use a stub if the full M2 contract is not ready.
- Keep interface stable enough for M2 and M3 to consume.

## Acceptance criteria

- Publisher accepts only templates that passed M1 filters.
- Publisher emits or stores an auditable record of the templateHash and source metadata.
- Publisher rejects stale, inactive, or missing-field templates before contract interaction.
- Contract call data or mock call payload is test-covered.

## Required QA and test plan

- Run backend publisher tests.
- Run smart-contract local stub test if available, or a call-data validation test.
- Run curl command to request publication of an accepted fixture and a rejected fixture; accepted returns a publishable payload, rejected returns an error.

## Required evidence to version and attach to the PR

- evidence/M1-T06/publisher-tests.log.
- evidence/M1-T06/curl-publish-accepted.json.
- evidence/M1-T06/curl-publish-rejected.json.
- evidence/M1-T06/contract-call-payload.json.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
