# M6.T06 — Run security review and create incident runbook

**Milestone:** M6 — Launch Readiness & Controlled Pilot  
**Priority:** P0  
**Type:** Security / Operations  
**Status:** Planned

## Dependencies

- M2.T10
- M3.T10
- M5.T07

## Recommended specialist subagents

- security-reviewer
- blockchain-specialist
- backend-specialist
- qa-specialist

## Execution requirements

- Execute the task in an independent git worktree created from the intended base branch.
- Open the implementation PR as a Draft PR and keep it in draft until QA evidence is complete.
- Use granular, descriptive commits. Avoid large mixed commits.
- Use specialist subagents whenever the task touches their domain; critical development or QA decisions must use the best available model with reasoning xhigh.
- Do not mark the task complete by the agent. Human-in-the-loop approval closes the task after PR review and QA approval.

## Scope

- Review smart-contract, backend, frontend, wallet, relayer, and payment threat model.
- Create incident runbook for failed funding, stuck resolution, wrong template, provider failure, suspected exploit, and user refund issue.
- Document severity levels, owners, and communication steps.

## Non-goals

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- This is not a substitute for an external audit, but it should catch MVP-level operational risks.
- Prioritize user funds and recovery paths.

## Acceptance criteria

- Threat model identifies assets, trust boundaries, and top risks.
- Incident runbook includes detection, triage, mitigation, rollback/pause, user communication, and postmortem steps.
- Open security issues are tracked with severity and owner.
- No critical unowned security issue remains before pilot signoff.

## Required QA and test plan

- Run smart-contract test suite.
- Run backend auth/security tests.
- Run a tabletop incident exercise for at least one stuck-resolution and one relayer-failure scenario.

## Required evidence to version and attach to the PR

- evidence/M6-T06/security-review.md.
- evidence/M6-T06/incident-runbook.md.
- evidence/M6-T06/tabletop-exercise-notes.md.
- evidence/M6-T06/security-test-logs.md.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
