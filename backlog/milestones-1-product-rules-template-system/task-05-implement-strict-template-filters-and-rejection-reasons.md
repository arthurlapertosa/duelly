# M1.T05 — Implement strict template filters and rejection reasons

**Milestone:** M1 — Product Rules & Template System  
**Priority:** P0  
**Type:** Backend / Product Rules  
**Status:** Planned

## Dependencies

- M1.T01
- M1.T03
- M1.T04

## Recommended specialist subagents

- backend-specialist
- product-architect
- qa-specialist

## Execution requirements

- Execute the task in an independent git worktree created from the intended base branch.
- Open the implementation PR as a Draft PR and keep it in draft until QA evidence is complete.
- Use granular, descriptive commits. Avoid large mixed commits.
- Use specialist subagents whenever the task touches their domain; critical development or QA decisions must use the best available model with reasoning xhigh.
- Do not mark the task complete by the agent. Human-in-the-loop approval closes the task after PR review and QA approval.

## Scope

- Implement filtering logic for accepted and rejected templates.
- Produce machine-readable rejection reasons.
- Prevent near-expiry, ambiguous, multi-outcome, negative-risk, subjective, and price-only markets from being accepted.
- Expose accepted templates and rejected candidates for QA/debugging.

## Non-goals

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- Be conservative. False negatives are acceptable for MVP; false positives are not.
- Keep rejection reasons stable for tests and useful for operators.

## Acceptance criteria

- Accepted endpoint returns only templates that satisfy all MVP rules.
- Rejected endpoint returns rejected candidates with reason codes.
- Tests cover every rejection reason defined in the policy.
- No template is accepted if conditionId is missing, outcome count is not exactly two, rules are missing, or result depends on odds/probabilities.

## Required QA and test plan

- Run backend filter unit tests.
- Run `curl -sS http://localhost:<port>/templates?mode=fixture | jq` and verify only accepted templates appear.
- Run `curl -sS http://localhost:<port>/templates/rejected?mode=fixture | jq` and verify rejection reasons.

## Required evidence to version and attach to the PR

- evidence/M1-T05/filter-tests.log.
- evidence/M1-T05/curl-accepted-templates.json.
- evidence/M1-T05/curl-rejected-candidates.json.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
