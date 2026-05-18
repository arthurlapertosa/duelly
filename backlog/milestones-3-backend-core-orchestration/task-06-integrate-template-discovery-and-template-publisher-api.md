# M3.T06 — Integrate template discovery and template publisher API

**Milestone:** M3 — Backend Core Orchestration  
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

- Expose APIs for accepted templates, rejected candidates, template details, and publish status.
- Integrate template discovery/filtering from M1 into the backend service.
- Integrate template publisher mock or contract-backed implementation.
- Ensure published template state can be served to frontend.

## Non-goals

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- Support fixture mode as a stable test baseline.
- Do not expose unpublished/rejected templates as bettable templates.

## Acceptance criteria

- `GET /templates` returns only active accepted templates.
- `GET /templates/:templateHash` returns normalized details and fee configuration.
- `POST /templates/:templateHash/publish` only succeeds for accepted templates and authorized user/operator.
- Rejected templates remain visible only through an internal/debug endpoint.

## Required QA and test plan

- Run backend template API tests.
- Run curl for accepted templates list.
- Run curl for rejected candidates endpoint.
- Run curl to publish accepted fixture and rejected fixture.

## Required evidence to version and attach to the PR

- evidence/M3-T06/template-api-tests.log.
- evidence/M3-T06/curl-templates.json.
- evidence/M3-T06/curl-template-detail.json.
- evidence/M3-T06/curl-publish-template.json.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
