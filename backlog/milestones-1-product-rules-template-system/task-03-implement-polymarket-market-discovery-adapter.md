# M1.T03 — Implement Polymarket sports market discovery adapter

**Milestone:** M1 — Product Rules & Sports Template System  
**Priority:** P0  
**Type:** Backend / Integration  
**Status:** Planned

## Dependencies

- M1.T00
- M1.T01
- M1.T02

## Recommended specialist subagents

- backend-specialist
- qa-specialist

## Execution requirements

- Execute the task in an independent git worktree created from the intended base branch.
- Open the implementation PR as a Draft PR and keep it in draft until QA evidence is complete.
- Use granular, descriptive commits. Avoid large mixed commits.
- Use specialist subagents whenever the task touches their domain; critical development or QA decisions must use the best available model with reasoning `xhigh`.
- Do not mark the task complete by the agent. Human-in-the-loop approval closes the task after PR review and QA approval.

## Scope

- Implement the adapter inside the Fastify/TypeScript backend and expose fixture/live discovery endpoints.
- Persist normalized discovery runs or candidate snapshots with PostgreSQL/TypeORM when the service stores discovery state.
- Implement the backend adapter that retrieves candidate sports markets from Polymarket Gamma API or fixture mode inside the Node.js + Fastify + TypeScript backend.
- Use typed services/repositories and TypeORM-backed persistence where candidate snapshots are stored.
- Normalize provider-specific market/event fields into internal candidate records.
- Support search/discovery strategies for the approved M1 sports scope.
- Do not use odds, prices, probabilities, or liquidity as final result fields.
- Surface provider errors and missing fields with explicit reasons.
- Expose adapter output through Fastify endpoints suitable for curl-based QA.

## Non-goals

- Do not implement final template acceptance filters in this task; M1.T05 owns strict filtering.
- Do not implement on-chain publishing; M1.T06 owns publisher stub.
- Do not implement Polymarket trading, CLOB operations, or order placement.

## Implementation guidance

- Use Fastify routes or plugins for discovery endpoints; do not introduce another HTTP framework.
- Use TypeORM repositories for any candidate persistence.
The adapter should support both fixture and live modes behind the same interface. It must be implemented as a TypeScript service consumed by Fastify routes. If candidate data is persisted, it must use PostgreSQL through TypeORM repositories, not ad-hoc JSON files as the runtime source of truth.

Suggested discovery strategies:

- Football/Soccer:
  - search terms: `FIFA World Cup`, `World Cup`, `Club World Cup`, `Brasileirão`, `Brazil Serie A`, `Brazilian Serie A`, `Libertadores`, `Copa Libertadores`.
  - event/market tags may be used when available, but the adapter must not rely only on tag names.
- Tennis:
  - Tennis discovery must treat ATP 250+ as the accepted scope: ATP 250, ATP 500, ATP Masters 1000, ATP Finals, and Grand Slams.
  - search terms: `ATP 250`, `ATP250`, `ATP 500`, `ATP500`, `ATP Masters 1000`, `Masters 1000`, `ATP Finals`, `Grand Slam`, `Australian Open`, `Roland Garros`, `French Open`, `Wimbledon`, `US Open`, and known tournament names when applicable.
  - individual match candidates should be classified separately from tournament winner candidates.
- UFC:
  - search terms: `UFC main event`, `UFC`, fighter names when fixtures provide them.
  - adapter must capture whether the market appears to be a main event or an undercard/prop candidate.
- Formula 1:
  - search terms: `Formula 1`, `F1`, `Grand Prix`, `race winner`, `sprint winner`, `sprint race`.

Normalized candidate fields should include at minimum:

- `provider = polymarket`
- `providerEventId`
- `providerMarketId`
- `slug`
- `question`
- `conditionId`
- `questionId`
- `outcomes`
- `outcomeTokenIds` when available
- `active`
- `closed`
- `archived`
- `acceptingOrders`
- `negRisk`
- `endDate`
- `rulesText` or `description`
- `rulesSourceUrl` or source reference when available
- `sport`
- `competition`
- `eventType`
- `binaryMarketType`
- `participants`
- `rawProviderPayloadHash`

## Acceptance criteria

- Adapter can load sports candidate fixtures without network access.
- Adapter runs inside the Fastify backend and passes TypeScript type checking.
- Adapter can call live public Gamma API when configured for live mode.
- Adapter normalizes football/soccer, tennis, UFC, and F1 candidates into the same internal shape.
- Tennis candidates include a normalized `competitionLevel` value: `ATP_250`, `ATP_500`, `ATP_MASTERS_1000`, `ATP_FINALS`, or `GRAND_SLAM`.
- Adapter never marks a candidate as accepted; it only normalizes and classifies candidates for later filtering.
- Adapter never maps `outcomePrices`, odds, probabilities, or liquidity to final result fields.
- Adapter captures `conditionId`, `providerMarketId`, `questionId`, outcomes, close time, category/sport, competition, source URL/reference, and rules text/hash input when available.
- Adapter returns explicit provider or normalization errors for missing critical fields.
- When persistence is enabled, candidate snapshots can be written to and read from PostgreSQL through TypeORM in tests.

## Required QA and test plan

- Run backend typecheck before adapter tests.
- Validate discovery endpoints through Fastify with `curl` in fixture mode.
- Run backend typecheck and unit tests for adapter fixture normalization.
- Run PostgreSQL/TypeORM integration tests if candidate persistence is implemented.
- Start backend locally and run `curl -sS http://localhost:<port>/templates/candidates?mode=fixture | jq`.
- Capture curl output and verify normalized fields are present.
- If live public API access is available, run one sanitized live discovery command for each target sport.

Suggested commands:

```bash
docker compose up -d postgres
npm --workspace @duelly/backend run db:migration:run
npm --workspace @duelly/backend run typecheck
npm --workspace @duelly/backend test -- --runInBand
npm --workspace @duelly/backend run dev
curl -sS "http://localhost:<port>/templates/candidates?mode=fixture&sport=football" | jq
curl -sS "http://localhost:<port>/templates/candidates?mode=fixture&sport=tennis" | jq
curl -sS "http://localhost:<port>/templates/candidates?mode=fixture&sport=ufc" | jq
curl -sS "http://localhost:<port>/templates/candidates?mode=fixture&sport=f1" | jq
```

## Required evidence to version and attach to the PR

- `evidence/M1-T03/backend-typecheck.log`.
- `evidence/M1-T03/adapter-tests.log`.
- `evidence/M1-T03/typeorm-adapter-integration.log`.
- `evidence/M1-T03/curl-football-candidates.json`.
- `evidence/M1-T03/curl-tennis-candidates.json`.
- `evidence/M1-T03/curl-ufc-candidates.json`.
- `evidence/M1-T03/curl-f1-candidates.json`.
- `evidence/M1-T03/normalization-summary.md`.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes curl responses for backend flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
