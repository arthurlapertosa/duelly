# M1.T07 — Create sports template QA fixture and evidence pack

**Milestone:** M1 — Product Rules & Sports Template System  
**Priority:** P1  
**Type:** QA / Product Rules  
**Status:** Planned

## Dependencies

- M1.T00
- M1.T02
- M1.T03
- M1.T04
- M1.T05

## Recommended specialist subagents

- qa-specialist
- backend-specialist
- product-architect

## Execution requirements

- Execute the task in an independent git worktree created from the intended base branch.
- Open the implementation PR as a Draft PR and keep it in draft until QA evidence is complete.
- Use granular, descriptive commits. Avoid large mixed commits.
- Use specialist subagents whenever the task touches their domain; critical development or QA decisions must use the best available model with reasoning `xhigh`.
- Do not mark the task complete by the agent. Human-in-the-loop approval closes the task after PR review and QA approval.

## Scope

- Validate the full M1 backend path through Fastify routes and PostgreSQL/TypeORM persistence where available.
- Create a stable fixture pack for accepted, rejected, and edge-case sports template scenarios.
- Document expected outputs for discovery, normalization, filtering, hashing, and publishable payload generation.
- Create a repeatable QA script or checklist for sports template system validation.
- Validate the Fastify backend with PostgreSQL and TypeORM migrations before collecting curl evidence.
- Ensure evidence is versioned and safe to attach to Draft PRs.

## Non-goals

- Do not require live Polymarket API access for deterministic CI.
- Do not add frontend UI unless explicitly requested in a separate task.
- Do not add smart-contract deployment requirements.

## Implementation guidance

- The QA pack must include commands that start the Fastify backend and verify database readiness.
- Fixture coverage matters more than live API coverage for deterministic CI.
- Live API checks should be optional and sanitized.
- Fixtures should include enough raw-like provider data to validate normalization, while remaining stable and safe.
- Expected outputs should be compared in tests or snapshot tests.
- QA should run against the Node.js + Fastify service with PostgreSQL available, unless the task explicitly documents a fixture-only exception.

## Required fixture pack coverage

Accepted or candidate fixtures:

- Football/Soccer:
  - FIFA World Cup or other approved world-level football binary winner market.
  - Brasileirão binary winner market, if available or represented as a deterministic fixture.
  - Copa Libertadores binary winner market, if available or represented as a deterministic fixture.
- Tennis:
  - ATP 250+ individual match winner (ATP 250, ATP 500, ATP Masters 1000, ATP Finals, or Grand Slam).
  - ATP 250+ tournament winner binary market (ATP 250, ATP 500, ATP Masters 1000, ATP Finals, or Grand Slam).
- UFC:
  - Main event fight winner.
- Formula 1:
  - Race winner binary market.
  - Sprint winner binary market.

Rejected fixtures:

- Football 3-way match outcome.
- Football spread, total, corners/cards, or player prop.
- Tennis tournament outside ATP 250+ scope (ATP 250, ATP 500, ATP Masters 1000, ATP Finals, and Grand Slams).
- Tennis spread, total games, or retirement-ambiguous market.
- UFC undercard or method/round prop.
- F1 qualifying, fastest lap, podium, DNF, or season championship.
- Generic missing `conditionId`.
- Generic missing `questionId`.
- Generic missing rules.
- Generic non-binary outcome count.
- Generic negative-risk market.
- Generic odds/probability-as-result market.
- Unsupported sport or unsupported competition.

## Acceptance criteria

- Fixture pack includes accepted, rejected, and edge-case sports templates.
- Expected outputs are committed and compared in tests or snapshot tests.
- QA checklist can be followed by a human without relying on hidden agent context.
- All evidence files avoid secrets and personal data.
- Evidence includes backend curl responses for discovery, accepted templates, rejected templates, and publishable payloads.
- If any target sport has no live candidates during QA, the evidence notes this without blocking fixture-mode QA.

## Required QA and test plan

- Validate `GET /health` and `GET /ready` with `curl` before template endpoint QA.
- Validate that fixture-mode endpoints work against the required Node.js/Fastify/TypeScript backend stack.
- Run backend typecheck, TypeORM migrations, and full backend template test suite.
- Run curl discovery, accepted, rejected, and publish endpoints in fixture mode.
- If available, run live public API discovery and compare category availability without accepting live templates automatically.
- If frontend is touched, add Playwright coverage and capture screenshots.
- If smart-contract stubs are touched, run local contract tests.

Suggested commands:

```bash
docker compose up -d postgres
npm --workspace @duelly/backend run db:migration:run
npm --workspace @duelly/backend run typecheck
npm --workspace @duelly/backend test
npm --workspace @duelly/backend run dev
curl -sS "http://localhost:<port>/health" | jq
curl -sS "http://localhost:<port>/ready" | jq
curl -sS "http://localhost:<port>/templates/candidates?mode=fixture" | jq
curl -sS "http://localhost:<port>/templates?mode=fixture" | jq
curl -sS "http://localhost:<port>/templates/rejected?mode=fixture" | jq
curl -sS -X POST "http://localhost:<port>/templates/publish?mode=fixture" \
  -H "Content-Type: application/json" \
  -d '{"templateId":"fixture-f1-sprint-winner"}' | jq
```

## Required evidence to version and attach to the PR

- `evidence/M1-T07/backend-typecheck.log`.
- `evidence/M1-T07/typeorm-migration-run.log`.
- `evidence/M1-T07/template-fixture-qa.log`.
- `evidence/M1-T07/curl-health.json`.
- `evidence/M1-T07/curl-ready.json`.
- `evidence/M1-T07/curl-fixture-discovery.json`.
- `evidence/M1-T07/curl-fixture-accepted.json`.
- `evidence/M1-T07/curl-fixture-rejected.json`.
- `evidence/M1-T07/curl-fixture-publish.json`.
- `evidence/M1-T07/fixture-coverage.md`.
- `evidence/M1-T07/live-sports-availability.md` or dependency note.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes curl responses for backend flows.
- PR includes screenshots for frontend flows if frontend is touched.
- PR includes local smart-contract outcomes for smart-contract flows if contracts or stubs are touched.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
