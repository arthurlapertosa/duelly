# M4.T08 — Complete frontend Playwright QA suite and accessibility smoke checks

**Milestone:** M4 — Frontend MVP Experience, Wallet-First Flow  
**Priority:** P1  
**Type:** Frontend / QA  
**Status:** Planned

## Dependencies

- M4.T01
- M4.T02
- M4.T03
- M4.T04
- M4.T05
- M4.T06
- M4.T07

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

- Consolidate Playwright suite for wallet-first frontend journey.
- Add accessibility smoke checks for critical pages.
- Add screenshot/trace artifact conventions.
- Create QA runbook for local reviewer.

## Non-goals

- Do not expand product scope beyond wallet-first MVP.
- Do not add M3.5 deposit/withdraw flows to mandatory QA.

## Acceptance criteria

- Playwright suite covers login, wallet verification, BRL1 readiness, template selection, create invite, accept invite, and bet status.
- Accessibility smoke checks pass for critical pages.
- QA runbook includes exact commands and expected artifacts.
- Feature-flag-off regression confirms M3.5 UI is hidden if present.

## Required QA and test plan

- Run full frontend test suite.
- Run full Playwright suite.
- Run accessibility smoke checks.
- Capture final QA report and screenshots.

## Required evidence to version and attach to the PR

- evidence/M4-T08/frontend-tests.log
- evidence/M4-T08/playwright-report/
- evidence/M4-T08/accessibility-smoke.log
- evidence/M4-T08/qa-runbook.md

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
