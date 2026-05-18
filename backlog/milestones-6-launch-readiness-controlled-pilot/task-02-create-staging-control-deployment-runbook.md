# M6.T02 — Create staging/control deployment runbook

**Milestone:** M6 — Launch Readiness & Controlled Pilot  
**Priority:** P0  
**Type:** DevOps / Release  
**Status:** Planned

## Dependencies

- M5.T07

## Recommended specialist subagents

- harness-lead
- backend-specialist
- frontend-specialist
- blockchain-specialist
- qa-specialist

## Execution requirements

- Execute the task in an independent git worktree created from the intended base branch.
- Open the implementation PR as a Draft PR and keep it in draft until QA evidence is complete.
- Use granular, descriptive commits. Avoid large mixed commits.
- Use specialist subagents whenever the task touches their domain; critical development or QA decisions must use the best available model with reasoning xhigh.
- Do not mark the task complete by the agent. Human-in-the-loop approval closes the task after PR review and QA approval.

## Scope

- Document deployment steps for frontend, backend, and smart-contract environment selected for pilot.
- Document environment variables, secrets handling, rollback, and smoke tests.
- Define deployment evidence requirements.

## Non-goals

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- If no staging environment exists, create a local/staging-equivalent runbook and mark real deployment as blocked.
- Do not include secrets in docs or evidence.

## Acceptance criteria

- Runbook includes prerequisites, deploy commands, verification commands, rollback, and owner responsibilities.
- Smoke tests include frontend Playwright, backend curl, and smart-contract local or staging validation.
- Runbook identifies what remains blocked by provider credentials or compliance.

## Required QA and test plan

- Execute runbook in local/staging-equivalent environment or document blocked steps.
- Run frontend smoke Playwright, backend curl health, and smart-contract verification commands.

## Required evidence to version and attach to the PR

- evidence/M6-T02/deployment-runbook-execution.md.
- evidence/M6-T02/curl-staging-health.json.
- evidence/M6-T02/playwright-staging-smoke.log.
- evidence/M6-T02/contract-verification.md.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
