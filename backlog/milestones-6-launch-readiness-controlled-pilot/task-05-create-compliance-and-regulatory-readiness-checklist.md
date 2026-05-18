# M6.T05 — Create compliance and regulatory readiness checklist

**Milestone:** M6 — Launch Readiness & Controlled Pilot  
**Priority:** P0  
**Type:** Compliance / Product  
**Status:** Planned

## Dependencies

- M5.T07

## Recommended specialist subagents

- product-architect
- security-reviewer
- qa-specialist

## Execution requirements

- Execute the task in an independent git worktree created from the intended base branch.
- Open the implementation PR as a Draft PR and keep it in draft until QA evidence is complete.
- Use granular, descriptive commits. Avoid large mixed commits.
- Use specialist subagents whenever the task touches their domain; critical development or QA decisions must use the best available model with reasoning xhigh.
- Do not mark the task complete by the agent. Human-in-the-loop approval closes the task after PR review and QA approval.

## Scope

- Create a checklist of legal/regulatory questions for betting operations, payment processing, custody/wallet model, KYC/AML, and Brazilian market constraints.
- Document which decisions require human/legal approval before pilot.
- Define product limits for any internal controlled pilot.

## Non-goals

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- Agents do not provide legal signoff. The task produces a checklist and evidence of review needs.
- Use explicit unknown/pending status rather than guessing.

## Acceptance criteria

- Checklist covers betting authorization, payment/on-ramp provider terms, wallet custody model, user eligibility, KYC/AML, data privacy, tax/accounting, and terms of service needs.
- Each item has status: approved, pending human review, blocked, or not applicable.
- Public launch is explicitly blocked until human/legal approval is recorded.

## Required QA and test plan

- Have human product/legal owner review the checklist and record notes.
- Run docs validation if available.

## Required evidence to version and attach to the PR

- evidence/M6-T05/compliance-checklist.md.
- evidence/M6-T05/human-review-notes.md.
- evidence/M6-T05/validate.log.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
