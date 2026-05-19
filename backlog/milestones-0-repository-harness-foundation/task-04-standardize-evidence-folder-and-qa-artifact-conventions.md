# M0.T04 — Standardize evidence folder and QA artifact conventions

**Milestone:** M0 — Repository & Harness Foundation  
**Priority:** P1  
**Type:** Harness / QA  
**Status:** Done

## Dependencies

- M0.T01

## Recommended specialist subagents

- qa-specialist
- harness-lead

## Execution requirements

- Execute the task in an independent git worktree created from the intended base branch.
- Open the implementation PR as a Draft PR and keep it in draft until QA evidence is complete.
- Use granular, descriptive commits. Avoid large mixed commits.
- Use specialist subagents whenever the task touches their domain; critical development or QA decisions must use the best available model with reasoning xhigh.
- Do not mark the task complete by the agent. Human-in-the-loop approval closes the task after PR review and QA approval.

## Scope

- Create or update documentation for evidence/<task-id>/ conventions.
- Define naming for screenshots, curl outputs, smart-contract logs, and E2E reports.
- Define when large binary artifacts should be committed versus attached only to PR.
- Ensure PR template asks for evidence paths and command outputs.

## Non-goals

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- Prefer small text logs committed to the repository and link heavier attachments in the PR.
- Keep evidence deterministic and reviewable.

## Acceptance criteria

- Evidence conventions are documented in English.
- Every future task can point to a specific evidence/<task-id>/ folder.
- PR template includes an Evidence section with checkboxes for frontend, backend, smart-contract, and E2E evidence.
- No secrets or personal data are allowed in evidence artifacts.

## Required QA and test plan

- Run `npm run validate` to ensure docs/templates are accepted by the repository validators.
- Create a sample evidence README for a fake task and ensure it matches conventions, then remove or keep it as documented sample.

## Required evidence to version and attach to the PR

- evidence/M0-T04/evidence-convention-check.md summarizing the convention.
- evidence/M0-T04/validate.log with validation command output.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
