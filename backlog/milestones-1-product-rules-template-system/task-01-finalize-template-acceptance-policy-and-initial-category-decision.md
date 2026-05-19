# M1.T01 — Finalize sports template acceptance policy and binary market rules

**Milestone:** M1 — Product Rules & Sports Template System  
**Priority:** P0  
**Type:** Product Rules  
**Status:** Planned

## Dependencies

- Human decision confirmed: sports-first scope.
- Polymarket public Gamma API access confirmed or fixture-only fallback approved.

## Recommended specialist subagents

- product-architect
- backend-specialist
- qa-specialist

## Execution requirements

- Execute the task in an independent git worktree created from the intended base branch.
- Open the implementation PR as a Draft PR and keep it in draft until QA evidence is complete.
- Use granular, descriptive commits. Avoid large mixed commits.
- Use specialist subagents whenever the task touches their domain; critical development or QA decisions must use the best available model with reasoning `xhigh`.
- Do not mark the task complete by the agent. Human-in-the-loop approval closes the task after PR review and QA approval.

## Scope

- State that M1 backend implementation must use Node.js, TypeScript, Fastify, PostgreSQL, and TypeORM.
- Write the product acceptance policy for sports templates.
- Replace the previous collectibles-oriented policy with sports-first policy.
- Define accepted sports coverage:
  - Football/Soccer: world championships, including FIFA World Cup, plus Brasileirão and Copa Libertadores.
  - Tennis: ATP 250+ tournaments (ATP 250, ATP 500, ATP Masters 1000, ATP Finals, and Grand Slams), including individual matches.
    - Accepted tennis scope is ATP 250+: ATP 250, ATP 500, ATP Masters 1000, ATP Finals, and Grand Slams. Grand Slams include Australian Open, Roland Garros/French Open, Wimbledon, and US Open.
  - UFC: main events only.
  - Formula 1: Grand Prix races and sprint races.
- Define binary-only acceptance rules for each sport.
- Define rejection rules for odds/probability-as-result, subjective markets, multi-outcome markets, negative-risk markets, unsupported sports, unsupported competitions, and ambiguous resolution rules.
- Define how void/ambiguous/cancelled outcomes are handled.
- Define how `loserFeeBps` is selected per template and how the minimum loser fee is anchored to at least 3x estimated gas fee.

## Tennis ATP 250+ definition

For this milestone, `ATP 250+` means ATP 250+ tournaments (ATP 250, ATP 500, ATP Masters 1000, ATP Finals, and Grand Slams). Tennis templates may include individual match winners and binary tournament winner markets when the Polymarket market is objective, binary, deterministic, and has explicit resolution rules.

## Non-goals

- Do not implement backend code in this task unless needed to support docs validation.
- Do not include collectibles, NFT floor price, Pokémon cards, politics, crypto prices, or entertainment markets in M1.
- Do not accept free-form user-created bets.

## Implementation guidance

- The policy should be strict for MVP and can leave expansion categories for future milestones.
- Prefer false negatives over false positives. A valid market can be skipped; an invalid market must not be accepted.
- For football/soccer, be especially strict because many match outcomes are not naturally binary due to draws.
- For tournament/championship markets, only accept a single binary market if Polymarket exposes it as a standalone binary `conditionId` with clear Yes/No resolution.
- Use fixtures if live Polymarket public access is not yet available, but clearly mark live validation as blocked.

## Acceptance criteria

- The policy states that M1 backend implementation uses Node.js, TypeScript, Fastify, PostgreSQL, and TypeORM.
- Policy states that final result must be deterministic and objective.
- Policy states that Polymarket prices, odds, and probabilities are never accepted as final result.
- Policy defines accepted market shape: binary, standard, clear `conditionId`, clear `questionId`, clear outcome labels, clear close time, clear rules source, and explicit resolution handling.
- Policy defines the sports-first category decision with explicit human approval reference.
- Policy defines accepted sports and competitions exactly:
  - Football/Soccer: world championships including FIFA World Cup, Brasileirão, Copa Libertadores.
  - Tennis: ATP 250+ tournaments (ATP 250, ATP 500, ATP Masters 1000, ATP Finals, and Grand Slams), including individual matches.
    - Accepted tennis scope is ATP 250+: ATP 250, ATP 500, ATP Masters 1000, ATP Finals, and Grand Slams. Grand Slams include Australian Open, Roland Garros/French Open, Wimbledon, and US Open.
  - UFC: main events.
  - Formula 1: races and sprint races.
- Policy defines disallowed market shapes by sport.
- Policy defines void rules for ambiguous outcomes, cancelled events, unresolved CTF conditions after deadline, no-contests, or results not matching either side.
- Policy defines loser fee formula: `loserFee = max(stake * loserFeeBps / 10_000, minLoserFee)` where `minLoserFee` is configured to cover at least 3x estimated gas fee.

## Required QA and test plan

- Run repository docs validation if available: `npm run validate`.
- Review the policy against at least twelve example markets or fixtures:
  - at least two football/soccer fixtures;
  - at least two tennis fixtures;
  - at least two UFC fixtures;
  - at least two F1 fixtures;
  - at least four rejected edge cases.
- Document every accepted/rejected decision with reason codes.

## Required evidence to version and attach to the PR

- `evidence/M1-T01/sports-policy-review.md` with example decisions and rejection reasons.
- `evidence/M1-T01/validate.log`.
- `evidence/M1-T01/accepted-sports-scope.md` summarizing the final human-approved sports scope.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes curl responses for backend flows if backend endpoints are touched.
- PR includes local smart-contract outcomes if smart-contract interfaces are touched.
- PR includes Playwright screenshots if frontend flows are touched.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
