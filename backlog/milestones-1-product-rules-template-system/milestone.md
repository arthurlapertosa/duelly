# M1 — Product Rules & Sports Template System

## Goal

Define and implement the allowed sports template system that prevents free-form betting and only admits objective, binary, deterministic Polymarket-derived markets for the Duelly MVP.

The initial category decision is sports-first. Collectibles are not part of the M1 target scope.

## External dependencies

- Polymarket public Gamma API access validated, or fixture-only fallback approved for local implementation.
- Human product decision confirmed: sports-first scope with the following target sports and competitions:
  - Football/Soccer: world championships, including FIFA World Cup, plus Brasileirão and Copa Libertadores.
  - Tennis: ATP 250+ tournaments, including ATP 250, ATP 500, ATP Masters 1000, ATP Finals, and Grand Slams, including individual matches. Grand Slams include Australian Open, Roland Garros/French Open, Wimbledon, and US Open.
  - UFC: main events only.
  - Formula 1: races and sprint races.

No Polymarket API key is required for the default M1 public discovery path. If authenticated access is introduced later, it must be handled as a separate dependency and secrets must never be committed.

## Required backend implementation stack for M1

All backend implementation work in M1 must use the following stack unless a human reviewer explicitly approves a change in the PR:

- Node.js.
- TypeScript with strict type checking.
- Fastify for HTTP APIs.
- PostgreSQL for persistence.
- TypeORM for entities, repositories, migrations, and database access.

The backend must live under `backend/` in the monorepo and expose APIs that can be validated end-to-end with `curl`. Fixture-mode tests must be deterministic and must not require live Polymarket access. Persistence tests that validate storage behavior must use PostgreSQL, not SQLite or in-memory substitutes.

## Delivery principles

- Deliver in small Draft PRs using independent worktrees.
- Every task must include tests and versioned evidence artifacts.
- Agent work is not final until human-in-the-loop review approves QA and closes the task.
- Keep implementation decisions flexible, but keep acceptance criteria and QA gates strict.
- Use specialist subagents whenever a task touches backend, smart-contract, QA, product rules, or design decisions.
- Critical development, QA, security, or architecture decisions must use the best available model with reasoning `xhigh`.

## Sports scope

### Accepted sports categories for M1

| Sport | Accepted M1 coverage | Accepted binary market shapes |
|---|---|---|
| Football/Soccer | FIFA World Cup, FIFA Club World Cup/world-level tournaments when available, Brasileirão, Copa Libertadores | Binary tournament/championship winner markets such as "Will Team X win Competition Y?". Binary match markets only if the Polymarket rules define a true binary condition and draw/cancelled edge cases are explicit. |
| Tennis | ATP 250+ tournaments: ATP 250, ATP 500, ATP Masters 1000, ATP Finals, and Grand Slams, including individual matches | Individual match winner; binary tournament winner markets such as "Will Player X win Tournament Y?". |
| UFC | Main events only | Fight winner for the main event. |
| Formula 1 | Grand Prix races and sprint races | Binary race winner/sprint winner markets such as "Will Driver X win Race/Sprint Y?"; binary head-to-head may be considered only if it is explicitly tied to race/sprint final classification and approved by policy. |

### Tennis ATP 250+ definition

For M1, `ATP 250+` means ATP 250, ATP 500, ATP Masters 1000, ATP Finals, and Grand Slams. Tennis templates may cover individual match winners and binary tournament winner markets when the market is objective, binary, and has explicit resolution rules.

### Explicitly rejected sports market shapes for M1

- Any market where the final result is inferred from odds, prices, probabilities, liquidity, or trading activity.
- Any non-binary market that cannot be imported as a single objective binary market with its own `conditionId`.
- Football 3-way match outcomes unless represented as a precise binary condition with explicit draw handling.
- Football handicap, spread, totals, cards, corners, player props, or subjective awards.
- Tennis set spreads, game totals, handicap markets, ace counts, retirement-ambiguous markets without explicit rules.
- UFC method of victory, round, distance, significant strikes, undercard fights, or draw/no-contest markets without explicit void rules.
- F1 qualifying, fastest lap, podium, DNF, safety-car, constructor championship, driver championship, or long-running season markets unless explicitly approved outside M1.
- Negative-risk markets for M1.
- Subjective markets, politics, entertainment, crypto-price, NFT-price, collectibles, or non-sports markets.

## In scope

- Node.js/Fastify/TypeScript backend foundation using PostgreSQL and TypeORM for M1 services.
- Sports-first template acceptance policy and normalized template schema.
- Polymarket discovery adapter and deterministic sports fixtures.
- Template hashing rules and rejection criteria.
- On-chain template registration interface requirements.
- Loser fee basis points at template level and global minimum loser fee policy aligned to at least 3x estimated gas fee.
- QA evidence requirements for backend curl validation, local fixture validation, PostgreSQL/TypeORM validation, and future full-stack E2E validation.

## Out of scope

- No free-form user-created bets.
- No use of odds or probabilities as final outcomes.
- No support for non-BRL1 assets.
- No subjective markets or ambiguous rules.
- No collectibles or NFT/card markets in M1.
- No generic sports categories beyond football/soccer, ATP 250+ tennis, UFC main events, and F1 races/sprints.
- No wallet, Pix, Stripe, BRL1 purchase, relayer, or user account features in M1.

## Task plan, priorities, and dependencies

| Task | Priority | Title | Dependencies |
|---|---:|---|---|
| M1.T00 | P0 | Establish backend framework foundation for M1 | M0 repository and harness foundation |
| M1.T01 | P0 | Finalize sports template acceptance policy and binary market rules | Human decision: sports-first scope confirmed; Polymarket public access or fixture-only fallback approved |
| M1.T02 | P0 | Capture Polymarket public API configuration and sports fixture strategy | M1.T00, M1.T01 |
| M1.T03 | P0 | Implement Polymarket sports market discovery adapter | M1.T00, M1.T01, M1.T02 |
| M1.T04 | P0 | Define deterministic sports template schema and templateHash | M1.T00, M1.T01, M1.T03 |
| M1.T05 | P0 | Implement strict sports template filters and rejection reasons | M1.T00, M1.T01, M1.T03, M1.T04 |
| M1.T06 | P1 | Specify and stub sports template registry publisher | M1.T00, M1.T04, M1.T05 |
| M1.T07 | P1 | Create sports template QA fixture and evidence pack | M1.T00, M1.T02, M1.T03, M1.T04, M1.T05 |

## Milestone-level quality gates

- Backend implementation uses Node.js, Fastify, TypeScript, PostgreSQL, and TypeORM.
- Backend validation is testable with deterministic fixtures and curl endpoints.
- TypeORM migrations and PostgreSQL-backed integration tests are available when persistence is touched.
- Template generation is deterministic for the same Polymarket input.
- Invalid sports markets are rejected with explicit machine-readable reasons.
- Accepted templates are always objective, binary, deterministic, and tied to allowed sports coverage.
- Smart-contract registry interface accepts only approved templates in later contract tasks.
- No accepted template uses odds, outcome prices, probabilities, or market prices as the final result.

## Milestone Definition of Done

- Backend framework foundation is operational with Node.js, Fastify, TypeScript, PostgreSQL, and TypeORM.
- An approved sports template schema exists and is documented.
- Backend adapter can discover, normalize, and filter candidate sports markets using fixtures and, when available, live public Gamma API access.
- Fixture pack includes at least one accepted or explicitly candidate fixture for each target sport: football/soccer, tennis, UFC, and F1.
- Fixture pack includes rejected examples for non-binary, missing `conditionId`, missing rules, negative-risk, subjective, odds/probability-result, and disallowed market types.
- Acceptance/rejection tests pass and evidence is committed.

## Evidence requirements

- Each task stores versioned evidence under `evidence/<task-id>/` and links it from the PR.
- Backend evidence includes Fastify health/readiness curl responses, TypeORM/PostgreSQL validation, and curl command outputs for end-to-end API validation when backend is touched.
- Smart-contract evidence includes local test outputs and state/outcome summaries when contracts are touched.
- Frontend evidence includes Playwright reports and screenshots when UI is touched.
- End-to-end evidence includes combined frontend, backend, and smart-contract validation whenever all three systems are involved.
