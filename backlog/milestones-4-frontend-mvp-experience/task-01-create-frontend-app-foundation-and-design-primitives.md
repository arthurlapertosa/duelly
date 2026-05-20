# M4.T01 — Create frontend app foundation and design primitives

**Milestone:** M4 — Frontend MVP Experience, Wallet-First Flow  
**Priority:** P0  
**Type:** Frontend / Foundation  
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

- Create frontend app foundation inside `frontend/`.
- Add routing, layout shell, shared UI primitives, and test setup.
- Add Playwright setup and screenshot artifact conventions.
- Add mock API fixture strategy for wallet-first flows.

## Non-goals

- Do not implement payments, wallet signatures, or betting flow in this task.

## Acceptance criteria

- Frontend dev server starts locally.
- Frontend test command passes.
- Playwright smoke test can load the app shell.
- Design primitives are documented or discoverable.

## Required QA and test plan

- Run frontend tests.
- Run Playwright smoke test.
- Capture app shell screenshot.

## Required evidence to version and attach to the PR

- evidence/M4-T01/frontend-tests.log
- evidence/M4-T01/playwright-smoke-report/
- evidence/M4-T01/screenshots/app-shell.png

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
