# M1.T02 — Capture Polymarket API configuration and safe fixture strategy

**Milestone:** M1 — Product Rules & Template System  
**Priority:** P0  
**Type:** Backend / Integration  
**Status:** Planned

## Dependencies

- M1.T01
- Polymarket API key or approved unauthenticated access path

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

- Define environment variable names for Polymarket access without committing secrets.
- Create fixture files for accepted and rejected markets.
- Create a safe local/mock mode that does not require a live API key.
- Document how QA should run live API checks when credentials are available.

## Non-goals

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- Never commit the API key.
- Fixture data should be sanitized and stable enough for deterministic tests.

## Acceptance criteria

- Backend config supports live and fixture modes.
- Missing API key does not break local tests if fixture mode is enabled.
- Fixtures include at least one collectibles candidate if available, otherwise at least one sports fallback fixture.
- Rejected fixtures cover subjective, multi-outcome, missing conditionId, missing rules, and price-only examples.

## Required QA and test plan

- Run backend tests in fixture mode.
- Run `curl` against the local template discovery fixture endpoint and capture response.
- If API key is available, run one live discovery curl command and capture sanitized output.

## Required evidence to version and attach to the PR

- evidence/M1-T02/backend-fixture-test.log.
- evidence/M1-T02/curl-template-fixtures.json.
- evidence/M1-T02/live-api-check-sanitized.json or evidence note explaining dependency unavailable.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
