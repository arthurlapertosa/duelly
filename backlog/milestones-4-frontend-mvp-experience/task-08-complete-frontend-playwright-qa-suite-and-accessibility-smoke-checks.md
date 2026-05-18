# M4.T08 — Complete frontend Playwright QA suite and accessibility smoke checks

**Milestone:** M4 — Frontend MVP Experience  
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

- Organize Playwright tests for all MVP user flows.
- Add screenshot capture and trace/video settings as appropriate.
- Add basic accessibility checks for primary pages or documented manual checks.
- Create final frontend QA evidence pack.

## Non-goals

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- Prefer reliable selectors and deterministic fixture data.
- Keep tests stable in CI and local runs.

## Acceptance criteria

- Playwright suite covers login, balance, template browsing, create invite, accept invite, funded state, resolved state, and void state.
- At least one test verifies the UI avoids Web3 jargon in the primary flow.
- Screenshots are captured for key states.
- Accessibility smoke findings are documented.

## Required QA and test plan

- Run full frontend Playwright suite.
- Run frontend build/test commands.
- Review Playwright HTML report locally and capture summary.

## Required evidence to version and attach to the PR

- evidence/M4-T08/playwright-full.log.
- evidence/M4-T08/playwright-report-summary.md.
- evidence/M4-T08/accessibility-smoke.md.
- evidence/M4-T08/screenshots/flow-summary.png.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
