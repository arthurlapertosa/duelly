# M0.T02 — Configure GitHub repository safety controls

**Milestone:** M0 — Repository & Harness Foundation  
**Priority:** P0  
**Type:** Repository / Governance  
**Status:** Planned

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

- Configure branch protection or rulesets for the default branch.
- Require PR review before merge.
- Require status checks from the QA workflow before merge.
- Document the exact GitHub settings in the PR evidence.

## Non-goals

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- If GitHub settings cannot be modified by the agent, produce a checklist with exact settings for a human owner.
- Prefer rulesets if available; branch protection is acceptable for MVP.

## Acceptance criteria

- Default branch cannot be force-pushed by normal contributors.
- Merges require at least one human approval.
- GitHub Actions QA workflow is required or explicitly documented as pending human setup.
- Draft PRs are accepted as the standard implementation entry point.

## Required QA and test plan

- Open a test Draft PR or document a dry-run if repository permissions block the operation.
- Verify the QA workflow is visible in the PR checks section.
- Record the repository settings screen or CLI output used for validation.

## Required evidence to version and attach to the PR

- evidence/M0-T02/github-settings.md with configured rules or human checklist.
- evidence/M0-T02/pr-checks-screenshot.png if UI access is available.
- evidence/M0-T02/gh-cli-output.txt if GitHub CLI is used.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
