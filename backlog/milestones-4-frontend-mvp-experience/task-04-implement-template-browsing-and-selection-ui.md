# M4.T04 — Implement template browsing and selection UI

**Milestone:** M4 — Frontend MVP Experience, Wallet-First Flow  
**Priority:** P0  
**Type:** Frontend / Templates  
**Status:** Planned

## Dependencies

- M4.T01
- M3.T05

## Recommended specialist subagents

- frontend-specialist
- designer
- backend-specialist
- qa-specialist

## Execution requirements

- Execute the task in an independent git worktree created from the intended base branch.
- Open the implementation PR as a Draft PR and keep it in draft until QA evidence is complete.
- Use granular, descriptive commits. Avoid large mixed commits.
- Use specialist subagents whenever the task touches their domain; critical development or QA decisions must use the best available model with reasoning xhigh.
- Do not mark the task complete by the agent. Human-in-the-loop approval closes the task after PR review and QA approval.


## Scope

- Display accepted sports templates from backend.
- Show competition/sport, event, outcomes, close time, and resolution summary.
- Allow user to select a binary template and a side.
- Hide rejected/unsupported templates.

## Non-goals

- Do not show odds/probabilities as final result.
- Do not allow free-form bets.

## Acceptance criteria

- Template list renders backend accepted templates.
- Template detail shows only binary choices.
- Unsupported/rejected fixtures are not selectable.
- Empty state is clear and actionable.

## Required QA and test plan

- Run frontend tests.
- Run Playwright template list/detail/selection scenario.
- Run curl command for template fixture API.
- Capture screenshots for list, detail, and empty state.

## Required evidence to version and attach to the PR

- evidence/M4-T04/frontend-tests.log
- evidence/M4-T04/playwright-template-report/
- evidence/M4-T04/curl-template-fixtures.json
- evidence/M4-T04/screenshots/template-detail.png

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
