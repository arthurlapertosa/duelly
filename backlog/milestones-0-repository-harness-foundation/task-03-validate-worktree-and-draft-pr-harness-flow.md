# M0.T03 — Validate worktree and Draft PR harness flow

**Milestone:** M0 — Repository & Harness Foundation  
**Priority:** P0  
**Type:** Harness / QA  
**Status:** Done

## Dependencies

- M0.T01

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

- Validate task worktree creation script.
- Validate granular commit helper script.
- Validate PR body rendering script.
- Validate Draft PR opening script in dry-run mode.
- Validate worktree close/cleanup script.

## Non-goals

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- Run destructive operations only against a temporary branch/worktree.
- Use dry-run mode when the script supports it.

## Acceptance criteria

- A new worktree can be created from the base branch with a task-specific branch name.
- The PR body renderer produces a PR body with Definition of Done, QA, and Evidence sections.
- Draft PR command supports dry-run without requiring a network operation.
- The worktree cleanup process removes the local worktree without deleting the source branch unexpectedly.

## Required QA and test plan

- Run `scripts/harness/new-task-worktree.sh --dry-run` if available.
- Run `scripts/harness/new-task-worktree.sh <sample-task>` against a temporary branch.
- Run `node scripts/harness/render-pr-body.mjs` or the documented command.
- Run `scripts/harness/open-draft-pr.sh --dry-run`.
- Run `scripts/harness/close-worktree.sh <sample-worktree>` after validation.

## Required evidence to version and attach to the PR

- evidence/M0-T03/worktree-flow.log with every harness command and output.
- evidence/M0-T03/rendered-pr-body.md with the generated PR body.
- evidence/M0-T03/cleanup-status.txt with final `git worktree list` and `git status` outputs.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
