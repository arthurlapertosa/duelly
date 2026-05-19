# M1.T00 — Establish backend framework foundation for M1

**Milestone:** M1 — Product Rules & Sports Template System  
**Priority:** P0  
**Type:** Backend / Foundation  
**Status:** Planned

## Dependencies

- M0 repository and harness foundation completed.
- Monorepo workspace `backend/` exists.

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

- Establish the required M1 backend implementation stack:
  - Node.js.
  - TypeScript.
  - Fastify for HTTP APIs.
  - PostgreSQL for persistence.
  - TypeORM for database access, entities, repositories, and migrations.
- Configure the `backend/` workspace to run locally and in CI with deterministic commands.
- Add a minimal Fastify application shell with health/readiness endpoints.
- Add PostgreSQL connection configuration and TypeORM DataSource setup.
- Add migration infrastructure for future M1 entities.
- Add test infrastructure for unit and integration tests.
- Add local development support for PostgreSQL through Docker Compose or an equivalent documented local setup.

## Non-goals

- Do not implement Polymarket discovery logic; M1.T03 owns discovery.
- Do not implement strict sports template filters; M1.T05 owns filtering.
- Do not implement smart-contract registry publishing; M1.T06 owns publisher behavior.
- Do not introduce Prisma, Sequelize, NestJS, Express, MongoDB, SQLite, or other framework/database substitutes unless explicitly approved by a human reviewer.

## Implementation guidance

- Keep the backend service small and framework-native. Prefer Fastify plugins, explicit route modules, and TypeScript types over large abstractions.
- TypeORM must use PostgreSQL as the runtime database. SQLite or in-memory substitutes are not acceptable for integration tests that validate persistence behavior.
- Suggested backend structure:

```text
backend/
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── config/
│   │   └── env.ts
│   ├── db/
│   │   ├── data-source.ts
│   │   └── migrations/
│   ├── routes/
│   │   └── health.routes.ts
│   └── modules/
│       └── templates/
├── test/
│   ├── unit/
│   └── integration/
└── package.json
```

- Required environment variables should be documented and validated at startup:
  - `NODE_ENV`
  - `PORT`
  - `DATABASE_URL` or explicit PostgreSQL connection variables
  - `POLYMARKET_GAMMA_BASE_URL`
  - `POLYMARKET_DISCOVERY_MODE`
- Health endpoints should not require Polymarket access.
- Readiness should validate database connectivity when PostgreSQL is enabled.

## Required backend endpoints

At minimum, this task must provide:

- `GET /health` — returns service liveness.
- `GET /ready` — returns readiness and database connectivity status.

Suggested successful response shape:

```json
{
  "status": "ok",
  "service": "duelly-backend",
  "database": "connected"
}
```

## Acceptance criteria

- `backend/` uses Node.js, TypeScript, Fastify, PostgreSQL, and TypeORM.
- No competing backend framework or database ORM is introduced.
- The Fastify app boots locally without Polymarket access.
- PostgreSQL connectivity is validated through TypeORM.
- TypeORM migration commands are available from the backend workspace.
- Unit tests and at least one database-backed integration test pass.
- `GET /health` and `GET /ready` can be validated with `curl`.
- All configuration is documented without committing secrets.

## Required QA and test plan

- Install dependencies.
- Start local PostgreSQL through the documented local workflow.
- Run backend typecheck, unit tests, and integration tests.
- Start the backend and validate endpoints with `curl`.

Suggested commands:

```bash
npm install
npm --workspace @duelly/backend run typecheck
npm --workspace @duelly/backend test
npm --workspace @duelly/backend run test:integration
npm --workspace @duelly/backend run db:migration:show
npm --workspace @duelly/backend run dev
curl -sS "http://localhost:<port>/health" | jq
curl -sS "http://localhost:<port>/ready" | jq
```

If Docker Compose is used for local PostgreSQL:

```bash
docker compose up -d postgres
npm --workspace @duelly/backend run db:migration:run
```

## Required evidence to version and attach to the PR

- `evidence/M1-T00/backend-typecheck.log`.
- `evidence/M1-T00/backend-tests.log`.
- `evidence/M1-T00/backend-integration-tests.log`.
- `evidence/M1-T00/typeorm-migration-status.log`.
- `evidence/M1-T00/curl-health.json`.
- `evidence/M1-T00/curl-ready.json`.
- `evidence/M1-T00/postgres-local-setup.md`.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes `curl` responses for backend flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
