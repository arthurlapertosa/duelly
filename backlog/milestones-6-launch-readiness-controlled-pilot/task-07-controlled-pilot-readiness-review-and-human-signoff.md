# M6.T07 — Controlled pilot readiness review and human signoff

**Milestone:** M6 — Launch Readiness & Controlled Pilot  
**Priority:** P0  
**Type:** Launch / QA / HITL  
**Status:** Planned

## Dependencies

- M6.T01
- M6.T02
- M6.T03
- M6.T04
- M6.T05
- M6.T06

## Recommended specialist subagents

- qa-specialist
- product-architect
- harness-lead
- security-reviewer

## Execution requirements

- Execute the task in an independent git worktree created from the intended base branch.
- Open the implementation PR as a Draft PR and keep it in draft until QA evidence is complete.
- Use granular, descriptive commits. Avoid large mixed commits.
- Use specialist subagents whenever the task touches their domain; critical development or QA decisions must use the best available model with reasoning xhigh.
- Do not mark the task complete by the agent. Human-in-the-loop approval closes the task after PR review and QA approval.

## Scope

- Aggregate readiness evidence across risk, deployment, monitoring, admin, compliance, and security.
- Run final controlled pilot checklist.
- Require human approval before any real-money or public pilot activity.

## Non-goals

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- This task should not implement major features; it should validate readiness and block if gaps remain.

## Acceptance criteria

- Readiness checklist maps every M6 Definition of Done item to evidence.
- All blockers have owners and decisions.
- Human owner signs off for controlled pilot or explicitly blocks launch with reasons.
- PR remains Draft until QA and human signoff are recorded.

## Required QA and test plan

- Run final local or staging smoke suite: frontend Playwright, backend curl, smart-contract tests, and E2E selected scenarios.
- Review monitoring/logging/admin evidence.
- Record human signoff or block decision.

## Required evidence to version and attach to the PR

- evidence/M6-T07/final-smoke.log.
- evidence/M6-T07/readiness-checklist.md.
- evidence/M6-T07/evidence-index.md.
- evidence/M6-T07/human-signoff.md.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
