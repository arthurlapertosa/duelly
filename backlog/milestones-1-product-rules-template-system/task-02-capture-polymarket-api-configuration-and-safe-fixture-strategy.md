# M1.T02 — Capture Polymarket public API configuration and sports fixture strategy

**Milestone:** M1 — Product Rules & Sports Template System  
**Priority:** P0  
**Type:** Backend / Integration  
**Status:** Planned

## Dependencies

- M1.T00
- M1.T01

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

- Configure Polymarket discovery settings inside the Node.js/TypeScript Fastify backend.
- Store fixture metadata and discovery configuration through PostgreSQL/TypeORM where persistence is required for the M1 flow.
- Define environment variable names for Polymarket public Gamma API access without committing secrets.
- Support public unauthenticated mode as the default M1 path.
- Create deterministic sports fixture files for accepted, rejected, and edge-case markets.
- Wire fixture loading into the Node.js + Fastify + TypeScript backend created in M1.T00.
- Ensure fixture mode can run with PostgreSQL and TypeORM repositories when the backend persists candidates or fixture-derived records.
- Create a safe local/mock mode that does not require live API access.
- Document how QA should run live public API checks when internet access is available.
- Ensure fixture strategy covers the human-approved M1 sports scope.

## Non-goals

- Do not require a Polymarket API key for M1.
- Do not commit credentials or user-specific secrets.
- Do not implement trading, authenticated CLOB operations, or Polymarket order placement.

## Implementation guidance

- Implement the configuration in the `backend/` workspace using Node.js, TypeScript, Fastify, PostgreSQL, and TypeORM.
- Any persisted fixture/discovery metadata must use TypeORM entities or migrations.
- Suggested config names:
  - `POLYMARKET_GAMMA_BASE_URL`
  - `POLYMARKET_DISCOVERY_MODE=fixture|live`
  - `POLYMARKET_DISCOVERY_TIMEOUT_MS`
  - `POLYMARKET_DISCOVERY_MAX_RESULTS`
- Fixture data should be sanitized, stable, and deterministic.
- Live API checks must never be required for CI unless explicitly approved.
- Fixture files should represent normalized inputs from Gamma API plus expected filter outputs.
- Fastify route handlers must remain thin and delegate fixture/config behavior to typed services.
- Any persisted fixture-derived state must use TypeORM repositories and PostgreSQL-compatible schemas.

## Required fixture coverage

Fixtures must include at least:

- Football/Soccer accepted or candidate fixture:
  - FIFA World Cup, Brasileirão, Copa Libertadores, or approved world-level football competition.
  - Binary tournament/championship winner market preferred.
- Football/Soccer rejected fixtures:
  - 3-way match result without explicit binary resolution.
  - handicap/spread/totals or player prop.
- Tennis accepted or candidate fixture:
  - Fixture coverage should include at least two accepted tennis levels when practical, such as ATP 250 plus Grand Slam or ATP Masters 1000.
  - ATP 250+ individual match winner (ATP 250, ATP 500, ATP Masters 1000, ATP Finals, or Grand Slam).
  - ATP 250+ tournament winner binary market (ATP 250, ATP 500, ATP Masters 1000, ATP Finals, or Grand Slam) if available.
- Tennis rejected fixtures:
  - set spread, game total, handicap, retirement-ambiguous fixture without rules.
- UFC accepted or candidate fixture:
  - main event fight winner.
- UFC rejected fixtures:
  - method of victory, round, undercard, no-contest-ambiguous fixture.
- F1 accepted or candidate fixture:
  - race winner or sprint winner binary market.
- F1 rejected fixtures:
  - qualifying, fastest lap, podium, DNF, season championship.
- Generic rejected fixtures:
  - missing `conditionId`;
  - missing `questionId`;
  - missing rules;
  - non-binary outcome count;
  - negative-risk market;
  - odds/probability-as-result market;
  - unsupported sport or unsupported competition.

## Acceptance criteria

- Backend config supports live public mode and fixture mode.
- Missing Polymarket API key does not break local tests because no key is required for fixture or public Gamma discovery.
- Fixtures include target sport coverage and explicit expected decisions.
- Rejected fixtures cover subjective, multi-outcome, missing `conditionId`, missing rules, disallowed competition, disallowed market type, and price-only examples.
- Fixture names are stable and map to task evidence files.

## Required QA and test plan

- Start the Fastify backend locally and validate fixture discovery configuration with `curl`.
- Validate TypeORM/PostgreSQL connectivity if any fixture metadata is persisted.
- Run backend tests in fixture mode.
- Run `curl` against the local template discovery fixture endpoint and capture response.
- If live public API access is available, run one live discovery `curl` command per target sport and capture sanitized output.

Suggested commands:

```bash
docker compose up -d postgres
npm --workspace @duelly/backend run db:migration:run
npm --workspace @duelly/backend run typecheck
npm --workspace @duelly/backend test
npm --workspace @duelly/backend run dev
curl -sS "http://localhost:<port>/ready" | jq
curl -sS "http://localhost:<port>/templates/candidates?mode=fixture" | jq
curl -sS "http://localhost:<port>/templates/rejected?mode=fixture" | jq
```

## Required evidence to version and attach to the PR

- `evidence/M1-T02/backend-typecheck.log`.
- `evidence/M1-T02/backend-fixture-test.log`.
- `evidence/M1-T02/typeorm-fixture-db-validation.log`.
- `evidence/M1-T02/curl-ready.json`.
- `evidence/M1-T02/curl-template-fixtures.json`.
- `evidence/M1-T02/live-football-check-sanitized.json` or dependency note.
- `evidence/M1-T02/live-tennis-check-sanitized.json` or dependency note.
- `evidence/M1-T02/live-ufc-check-sanitized.json` or dependency note.
- `evidence/M1-T02/live-f1-check-sanitized.json` or dependency note.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes curl responses for backend flows if backend endpoints are touched.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
