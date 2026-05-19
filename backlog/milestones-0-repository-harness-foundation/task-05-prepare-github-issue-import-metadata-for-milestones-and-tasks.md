# M0.T05 — Prepare GitHub issue import metadata for milestones and tasks

**Milestone:** M0 — Repository & Harness Foundation  
**Priority:** P1  
**Type:** Project Management / Harness  
**Status:** Done

## Dependencies

- M0.T01
- Backlog package approved by human owner

## Recommended specialist subagents

- harness-lead
- qa-specialist

## Execution requirements

- Execute the task in an independent git worktree created from the intended base branch.
- Open the implementation PR as a Draft PR and keep it in draft until QA evidence is complete.
- Use granular, descriptive commits. Avoid large mixed commits.
- Use specialist subagents whenever the task touches their domain; critical development or QA decisions must use the best available model with reasoning xhigh.
- Do not mark the task complete by the agent. Human-in-the-loop approval closes the task after PR review and QA approval.

## Scope

- Convert approved milestone/task markdown into GitHub issue-ready metadata if desired.
- Preserve task IDs, priorities, dependencies, and QA requirements.
- Create labels proposal for milestone, priority, domain, and QA type.

## Non-goals

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- Do not create issues automatically unless explicitly instructed by the human owner.
- A prepared import file or CLI dry-run is sufficient for this task.

## Acceptance criteria

- Task IDs can be traced from markdown files to proposed GitHub issues.
- Labels include at minimum priority:P0/P1/P2, domain:frontend/backend/smartcontract/harness, qa:playwright/curl/foundry/e2e.
- Milestone names exactly match the approved milestone names.

## Required QA and test plan

- Run the proposed import generation in dry-run mode.
- Validate generated issue payloads are valid JSON or valid GitHub CLI commands.

## Required evidence to version and attach to the PR

- evidence/M0-T05/issue-import-dry-run.log.
- evidence/M0-T05/labels-proposal.md.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
