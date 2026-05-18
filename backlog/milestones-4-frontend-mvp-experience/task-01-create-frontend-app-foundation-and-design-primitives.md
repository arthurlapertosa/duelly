# M4.T01 — Create frontend app foundation and design primitives

**Milestone:** M4 — Frontend MVP Experience  
**Priority:** P0  
**Type:** Frontend / Design  
**Status:** Planned

## Dependencies

- M0 completed or repository bootstrap available

## Recommended specialist subagents

- frontend-specialist
- designer
- qa-specialist

## Execution requirements

- Execute the task in an independent git worktree created from the intended base branch.
- Open the implementation PR as a Draft PR and keep it in draft until QA evidence is complete.
- Use granular, descriptive commits. Avoid large mixed commits.
- Use specialist subagents whenever the task touches their domain; critical development or QA decisions must use the best available model with reasoning xhigh.
- Do not mark the task complete by the agent. Human-in-the-loop approval closes the task after PR review and QA approval.

## Scope

- Set up frontend app architecture inside frontend/.
- Create base routing/layout structure.
- Create design primitives for buttons, cards, forms, status badges, and currency display.
- Add Playwright configuration and a smoke test.

## Non-goals

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- Framework choice can be selected by the agent if it integrates with the monorepo and Playwright.
- Keep UI copy simple and non-Web3-facing.

## Acceptance criteria

- Frontend app runs locally with a documented command.
- Base route renders a Duelly landing or app shell.
- Core components are reusable and tested where practical.
- Playwright smoke test passes and captures at least one screenshot.

## Required QA and test plan

- Run frontend unit/build tests if configured.
- Run `npm --workspace @duelly/frontend run test:e2e` or documented Playwright command.
- Capture Playwright screenshot of app shell.

## Required evidence to version and attach to the PR

- evidence/M4-T01/frontend-tests.log.
- evidence/M4-T01/playwright-report-summary.md.
- evidence/M4-T01/screenshots/app-shell.png.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
