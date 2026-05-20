# M3.T01 — Create backend service skeleton, configuration, and health checks

**Milestone:** M3 — Backend Core Orchestration, Wallet-First Flow  
**Priority:** P0  
**Type:** Backend / Foundation  
**Status:** Planned

## Dependencies

- M0 completed or repository bootstrap available

## Recommended specialist subagents

- backend-specialist
- qa-specialist

## Execution requirements

- Execute the task in an independent git worktree created from the intended base branch.
- Open the implementation PR as a Draft PR and keep it in draft until QA evidence is complete.
- Use granular, descriptive commits. Avoid large mixed commits.
- Use specialist subagents whenever the task touches their domain; critical development or QA decisions must use the best available model with reasoning xhigh.
- Do not mark the task complete by the agent. Human-in-the-loop approval closes the task after PR review and QA approval.


## Scope

- Create backend app structure inside `backend/` using Node.js, TypeScript, Fastify, PostgreSQL, and TypeORM.
- Add environment config loading and validation.
- Add health and readiness endpoints.
- Add test setup and local dev command.
- Keep mock mode enabled by default for local QA.

## Non-goals

- Do not implement payment providers, wallet linking, or smart-contract relaying in this task.

## Acceptance criteria

- `npm --workspace @duelly/backend test` passes.
- Backend starts locally without external secrets in mock mode.
- `GET /health` returns service status and version/build metadata if available.
- `GET /ready` validates database connectivity in local/mock mode.
- Invalid required environment variables fail fast with clear messages outside mock mode.

## Required QA and test plan

- Run backend tests.
- Start backend locally.
- Run `curl -sS http://localhost:<port>/health`.
- Run `curl -sS http://localhost:<port>/ready`.

## Required evidence to version and attach to the PR

- evidence/M3-T01/backend-tests.log
- evidence/M3-T01/curl-health.json
- evidence/M3-T01/curl-ready.json

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
