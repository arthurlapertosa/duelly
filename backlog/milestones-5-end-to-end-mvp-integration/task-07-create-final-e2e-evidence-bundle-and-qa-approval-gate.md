# M5.T07 — Create final E2E evidence bundle and QA approval gate

**Milestone:** M5 — End-to-End MVP Integration  
**Priority:** P1  
**Type:** E2E / QA  
**Status:** Planned

## Dependencies

- M5.T03
- M5.T04
- M5.T05
- M5.T06

## Recommended specialist subagents

- qa-specialist
- frontend-specialist
- backend-specialist
- blockchain-specialist

## Execution requirements

- Execute the task in an independent git worktree created from the intended base branch.
- Open the implementation PR as a Draft PR and keep it in draft until QA evidence is complete.
- Use granular, descriptive commits. Avoid large mixed commits.
- Use specialist subagents whenever the task touches their domain; critical development or QA decisions must use the best available model with reasoning xhigh.
- Do not mark the task complete by the agent. Human-in-the-loop approval closes the task after PR review and QA approval.

## Scope

- Aggregate E2E evidence from all full-stack scenarios.
- Create a human-readable QA summary with pass/fail status.
- Document known limitations and deferred items.
- Define the human approval checkpoint before moving to launch readiness.

## Non-goals

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- This task is evidence-heavy and should not change product code unless fixing an identified blocker.

## Acceptance criteria

- Evidence bundle includes frontend screenshots, curl outputs, and smart-contract outcomes for A wins, B wins, void, and failure paths.
- QA summary explicitly maps outcomes to milestone Definition of Done.
- Any failed or skipped check has a clear owner and follow-up issue/task.
- Human QA reviewer approves or blocks the milestone in the PR.

## Required QA and test plan

- Run all E2E suites again from a clean local stack.
- Verify evidence paths exist and are linked from PR description.
- Have human QA follow the runbook and record approval/blocking notes.

## Required evidence to version and attach to the PR

- evidence/M5-T07/e2e-final-run.log.
- evidence/M5-T07/qa-summary.md.
- evidence/M5-T07/evidence-index.md.
- evidence/M5-T07/hitl-qa-approval.md.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
