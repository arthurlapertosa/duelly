# M1 — Product Rules & Template System

## Goal

Define and implement the allowed template system that prevents free-form betting and only admits objective, binary, deterministic Polymarket-derived markets.

## External dependencies

- Polymarket API key or approved API access method.
- Human product decision on initial category priority: collectibles first, or sports fallback if no valid collectibles exist.

## Delivery principles

- Deliver in small Draft PRs using independent worktrees.
- Every task must include tests and versioned evidence artifacts.
- Agent work is not final until human-in-the-loop review approves QA and closes the task.
- Keep implementation decisions flexible, but keep acceptance criteria and QA gates strict.

## In scope

- Template acceptance policy and normalized template schema.
- Polymarket discovery adapter and deterministic fixtures.
- Template hashing rules and rejection criteria.
- On-chain template registration interface requirements.
- Loser fee basis points at template level and global minimum loser fee policy aligned to at least 3x estimated gas fee.

## Out of scope

- No free-form user-created bets.
- No use of odds or probabilities as final outcomes.
- No support for non-BRL1 assets.
- No subjective markets or ambiguous rules.

## Task plan, priorities, and dependencies

| Task | Priority | Title | Dependencies |
|---|---:|---|---|
| M1.T01 | P0 | Finalize template acceptance policy and initial category decision | Polymarket API access confirmed or fixture-only fallback approved, Human category decision: collectibles or sports fallback |
| M1.T02 | P0 | Capture Polymarket API configuration and safe fixture strategy | M1.T01, Polymarket API key or approved unauthenticated access path |
| M1.T03 | P0 | Implement Polymarket market discovery adapter | M1.T01, M1.T02 |
| M1.T04 | P0 | Define deterministic template schema and templateHash | M1.T01, M1.T03 |
| M1.T05 | P0 | Implement strict template filters and rejection reasons | M1.T01, M1.T03, M1.T04 |
| M1.T06 | P1 | Specify and stub template registry publisher | M1.T04, M1.T05 |
| M1.T07 | P1 | Create template QA fixture and evidence pack | M1.T02, M1.T03, M1.T04, M1.T05 |

## Milestone-level quality gates

- Template generation is deterministic for the same Polymarket input.
- Invalid markets are rejected with explicit machine-readable reasons.
- Backend validation is testable with fixtures and curl endpoints.
- Smart-contract registry interface accepts only approved templates in later contract tasks.

## Milestone Definition of Done

- An approved template schema exists and is documented.
- Backend adapter can discover, normalize, and filter candidate markets using fixtures and, when credentials exist, live API access.
- At least one accepted fixture and multiple rejected fixtures are included.
- Acceptance/rejection tests pass and evidence is committed.

## Evidence requirements

- Each task stores versioned evidence under evidence/<task-id>/ and links it from the PR.
- Frontend evidence includes Playwright reports and screenshots when UI is touched.
- Backend evidence includes curl command outputs for end-to-end API validation when backend is touched.
- Smart-contract evidence includes local test outputs and state/outcome summaries when contracts are touched.
- End-to-end evidence includes combined frontend, backend, and smart-contract validation whenever all three systems are involved.
