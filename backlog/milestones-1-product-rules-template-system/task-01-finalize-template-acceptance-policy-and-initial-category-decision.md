# M1.T01 — Finalize template acceptance policy and initial category decision

**Milestone:** M1 — Product Rules & Template System  
**Priority:** P0  
**Type:** Product Rules  
**Status:** Planned

## Dependencies

- Polymarket API access confirmed or fixture-only fallback approved
- Human category decision: collectibles or sports fallback

## Recommended specialist subagents

- product-architect
- backend-specialist
- qa-specialist

## Execution requirements

- Execute the task in an independent git worktree created from the intended base branch.
- Open the implementation PR as a Draft PR and keep it in draft until QA evidence is complete.
- Use granular, descriptive commits. Avoid large mixed commits.
- Use specialist subagents whenever the task touches their domain; critical development or QA decisions must use the best available model with reasoning xhigh.
- Do not mark the task complete by the agent. Human-in-the-loop approval closes the task after PR review and QA approval.

## Scope

- Write the product acceptance policy for templates.
- Define collectibles-first selection rules and sports fallback rules.
- Define rejection rules for odds/probability-as-result, subjective markets, multi-outcome markets, negative-risk markets, and ambiguous resolution rules.
- Define how void/ambiguous outcomes are handled.
- Define how loserFeeBps is selected per template and how the minimum loser fee is anchored to at least 3x estimated gas fee.

## Non-goals

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- The policy should be strict for MVP and can leave expansion categories for future milestones.
- Use fixtures if live Polymarket API access is not yet available, but clearly mark live validation as blocked.

## Acceptance criteria

- Policy states that final result must be deterministic and objective.
- Policy states that Polymarket prices, odds, and probabilities are never accepted as final result.
- Policy defines accepted market shape: binary, standard, clear conditionId, clear outcome labels, clear close time, clear rules source.
- Policy defines initial category and fallback decision with explicit human approval reference.
- Policy defines loserFee formula: `loserFee = max(stake * loserFeeBps / 10_000, minLoserFee)` where `minLoserFee` is configured to cover at least 3x estimated gas fee.

## Required QA and test plan

- Run repository docs validation if available: `npm run validate`.
- Review the policy against at least five example markets or fixtures and document accepted/rejected decisions.

## Required evidence to version and attach to the PR

- evidence/M1-T01/policy-review.md with example decisions and rejection reasons.
- evidence/M1-T01/validate.log.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
