# M1.T05 — Implement strict sports template filters and rejection reasons

**Milestone:** M1 — Product Rules & Sports Template System  
**Priority:** P0  
**Type:** Backend / Product Rules  
**Status:** Planned

## Dependencies

- M1.T00
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
- Use specialist subagents whenever the task touches their domain; critical development or QA decisions must use the best available model with reasoning `xhigh`.
- Do not mark the task complete by the agent. Human-in-the-loop approval closes the task after PR review and QA approval.

## Scope

- Implement filters as Fastify-accessible backend services and expose accepted/rejected template endpoints.
- Persist accepted templates, rejected candidates, and rejection reasons through PostgreSQL/TypeORM when they are part of the M1 operational flow.
- Implement filtering logic for accepted and rejected sports templates inside the Fastify/TypeScript backend.
- Persist accepted templates and rejected candidates through PostgreSQL/TypeORM when runtime persistence is used.
- Produce machine-readable rejection reasons.
- Prevent near-expiry, ambiguous, unsupported, multi-outcome, negative-risk, subjective, and price-only markets from being accepted.
- Expose accepted templates and rejected candidates through Fastify endpoints for QA/debugging.
- Ensure the accepted universe is limited to the approved sports scope and binary result shapes.

## Non-goals

- Do not implement provider discovery; M1.T03 owns adapter discovery.
- Do not implement on-chain publishing; M1.T06 owns publisher stub.
- Do not loosen filters to increase template count without human approval.

## Implementation guidance

- Keep rejection reason codes stable in TypeScript enums or constant maps.
- Use TypeORM repositories for persisted accepted/rejected template records.
- Be conservative. False negatives are acceptable for MVP; false positives are not.
- Keep rejection reason codes stable for tests and useful for operators.
- Prefer a composed filter pipeline where every rejection reason can be individually tested.
- Keep filtering logic in typed services; Fastify routes should delegate to services.
- Use TypeORM repositories for accepted/rejected template persistence and keep rejection reason codes stable in database records.
- Do not infer final outcomes from prices, probabilities, liquidity, or odds.

## Required acceptance filters

A candidate can be accepted only if all of the following are true:

- `provider` is `polymarket`.
- `sport` is one of: `football`, `tennis`, `ufc`, `f1`.
- `competition` is allowed for the sport:
  - football: FIFA World Cup, FIFA Club World Cup/world-level approved competition, Brasileirão, Copa Libertadores;
  - tennis: ATP 250+ only (ATP 250, ATP 500, ATP Masters 1000, ATP Finals, and Grand Slams);
    Tennis aliases must normalize to `ATP_250`, `ATP_500`, `ATP_MASTERS_1000`, `ATP_FINALS`, or `GRAND_SLAM`;
  - UFC: main event only;
  - F1: race or sprint race only.
- Market is active, not closed, not archived, and accepting orders when this field is available.
- `negRisk` is false.
- `conditionId` is present.
- `questionId` is present.
- Rules or description are present and hashable.
- Outcome count is exactly two.
- The two outcomes map to an approved binary result type.
- The binary market has explicit or inferable final-result semantics from official event/tournament result, not from price/probability.
- `bettingCloseAt` and `resolutionDeadline` are present and not stale.
- `loserFeeBps` is within allowed range.

## Required rejection reason codes

Implement stable reason codes including at least:

- `UNSUPPORTED_SPORT`
- `UNSUPPORTED_COMPETITION`
- `UNSUPPORTED_EVENT_TYPE`
- `NON_BINARY_MARKET`
- `MISSING_CONDITION_ID`
- `MISSING_QUESTION_ID`
- `MISSING_RULES`
- `NEGATIVE_RISK_UNSUPPORTED`
- `MARKET_INACTIVE`
- `MARKET_CLOSED`
- `MARKET_ARCHIVED`
- `NOT_ACCEPTING_ORDERS`
- `NEAR_EXPIRY`
- `AMBIGUOUS_RESOLUTION`
- `ODDS_OR_PROBABILITY_RESULT`
- `DISALLOWED_FOOTBALL_MARKET_TYPE`
- `DISALLOWED_TENNIS_MARKET_TYPE`
- `ATP_250_PLUS_UNSUPPORTED`
- `DISALLOWED_UFC_MARKET_TYPE`
- `DISALLOWED_F1_MARKET_TYPE`
- `INVALID_LOSER_FEE_BPS`

## Sport-specific rejection examples

- Football/Soccer:
  - Reject 3-way match winner with draw as third outcome.
  - Reject spreads, totals, cards, corners, player props.
  - Reject competitions outside approved scope.
- Tennis:
  - Reject tennis tournaments outside ATP 250+ scope (ATP 250, ATP 500, ATP Masters 1000, ATP Finals, and Grand Slams).
  - Reject set spreads, game totals, handicaps, ace props, retirement-ambiguous markets without explicit rules.
- UFC:
  - Reject undercard fights.
  - Reject method, round, distance, significant strike props.
  - Reject no-contest/draw markets without explicit void handling.
- F1:
  - Reject qualifying, fastest lap, podium, DNF, safety-car, and season championship markets.
  - Reject markets not tied to race or sprint final classification.

## Acceptance criteria

- Accepted endpoint returns only templates that satisfy all MVP sports rules.
- Accepted/rejected endpoints are served by the Fastify backend and pass curl-based QA.
- Rejected endpoint returns rejected candidates with stable reason codes.
- Tests cover every rejection reason defined in the policy.
- No template is accepted if `conditionId` is missing, outcome count is not exactly two, rules are missing, sport/competition is not allowed, or result depends on odds/probabilities.
- Accepted templates include sport-specific normalized metadata and `templateHash`.

## Required QA and test plan

- Run backend typecheck before filter tests.
- Validate accepted/rejected endpoints with `curl` against the Fastify service in fixture mode.
- Validate persisted rejected reasons against PostgreSQL when persistence is implemented.
- Run backend typecheck and filter unit tests.
- Run TypeORM integration tests for accepted/rejected persistence when implemented.
- Run `curl -sS http://localhost:<port>/templates?mode=fixture | jq` and verify only accepted sports templates appear.
- Run `curl -sS http://localhost:<port>/templates/rejected?mode=fixture | jq` and verify rejection reasons.
- Run per-sport curl checks for accepted and rejected endpoints.

Suggested commands:

```bash
docker compose up -d postgres
npm --workspace @duelly/backend run db:migration:run
npm --workspace @duelly/backend run typecheck
npm --workspace @duelly/backend test -- template-filter
npm --workspace @duelly/backend run dev
curl -sS "http://localhost:<port>/templates?mode=fixture" | jq
curl -sS "http://localhost:<port>/templates/rejected?mode=fixture" | jq
curl -sS "http://localhost:<port>/templates?mode=fixture&sport=f1" | jq
```

## Required evidence to version and attach to the PR

- `evidence/M1-T05/backend-typecheck.log`.
- `evidence/M1-T05/filter-tests.log`.
- `evidence/M1-T05/typeorm-filter-persistence.log`.
- `evidence/M1-T05/curl-accepted-templates.json`.
- `evidence/M1-T05/curl-rejected-candidates.json`.
- `evidence/M1-T05/curl-accepted-by-sport.json`.
- `evidence/M1-T05/rejection-reason-coverage.md`.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes curl responses for backend flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
