# M1.T06 — Specify and stub sports template registry publisher

**Milestone:** M1 — Product Rules & Sports Template System  
**Priority:** P1  
**Type:** Backend / Smart Contract Interface  
**Status:** Planned

## Dependencies

- M1.T00
- M1.T04
- M1.T05

## Recommended specialist subagents

- backend-specialist
- blockchain-specialist
- qa-specialist

## Execution requirements

- Execute the task in an independent git worktree created from the intended base branch.
- Open the implementation PR as a Draft PR and keep it in draft until QA evidence is complete.
- Use granular, descriptive commits. Avoid large mixed commits.
- Use specialist subagents whenever the task touches their domain; critical development or QA decisions must use the best available model with reasoning `xhigh`.
- Do not mark the task complete by the agent. Human-in-the-loop approval closes the task after PR review and QA approval.

## Scope

- Implement the publisher stub as a Fastify/TypeScript backend module.
- Store publish audit records with PostgreSQL/TypeORM.
- Specify how accepted sports templates are published to the smart contract registry.
- Create a backend publisher interface with mock/local implementation in the Fastify/TypeScript backend.
- Store publish attempts or publishable payload records through PostgreSQL/TypeORM.
- Define expected contract call data and events for sports template registration.
- Ensure the backend cannot publish rejected templates.
- Include sports-specific audit metadata in the publish record.

## Non-goals

- Do not implement full M2 smart contract logic.
- Do not publish to a live chain.
- Do not allow manual bypass of M1 filters.

## Implementation guidance

- Use TypeORM for publish audit persistence; do not store audit records only in memory except in isolated unit tests.
- Expose publisher behavior through Fastify endpoints for curl QA.
- This task can use a stub if the full M2 contract is not ready.
- Keep interface stable enough for M2 and M3 to consume.
- The publisher should preserve both the compact on-chain payload and the richer off-chain source metadata.
- Fastify route handlers should call a typed publisher service, which writes audit records through TypeORM repositories.
- Ensure that the published payload includes enough data for the smart contract to enforce `templateHash`, `conditionId`, deadlines, and fee policy.

## Required publisher payload fields

The publishable payload or contract call data must include at least:

- `templateHash`
- `conditionId`
- `questionId`
- `sport`
- `competition`
- `eventType`
- `binaryMarketType`
- `outcomeAProviderIndex`
- `outcomeBProviderIndex`
- `rulesHash`
- `bettingCloseAt`
- `resolutionDeadline`
- `loserFeeBps`
- `active`

The audit metadata must include at least:

- `providerMarketId`
- `providerEventId` when available
- `slug`
- `question`
- `sourceUrl`
- `rawProviderPayloadHash`
- `acceptedAt`
- `publishedBy`

## Acceptance criteria

- Publisher accepts only templates that passed M1 sports filters.
- Publisher emits or stores an auditable TypeORM-backed record of the `templateHash`, sports scope, provider metadata, and source metadata.
- Publisher rejects stale, inactive, unsupported, or missing-field templates before contract interaction.
- Contract call data or mock call payload is test-covered.
- Publisher cannot publish rejected football, tennis, UFC, F1, or generic invalid fixtures.

## Required QA and test plan

- Run backend typecheck before publisher tests.
- Validate publish audit persistence through PostgreSQL/TypeORM.
- Run backend typecheck and publisher tests.
- Run TypeORM integration tests for publish audit records.
- Run smart-contract local stub test if available, or a call-data validation test.
- Run curl command to request publication of an accepted fixture and a rejected fixture; accepted returns a publishable payload, rejected returns an error.

Suggested commands:

```bash
docker compose up -d postgres
npm --workspace @duelly/backend run db:migration:run
npm --workspace @duelly/backend run typecheck
npm --workspace @duelly/backend test -- template-publisher
npm --workspace @duelly/backend run dev
curl -sS -X POST "http://localhost:<port>/templates/publish?mode=fixture" \
  -H "Content-Type: application/json" \
  -d '{"templateId":"fixture-football-world-cup-binary-winner"}' | jq
curl -sS -X POST "http://localhost:<port>/templates/publish?mode=fixture" \
  -H "Content-Type: application/json" \
  -d '{"templateId":"fixture-football-3way-rejected"}' | jq
```

## Required evidence to version and attach to the PR

- `evidence/M1-T06/backend-typecheck.log`.
- `evidence/M1-T06/publisher-tests.log`.
- `evidence/M1-T06/typeorm-publish-record.log`.
- `evidence/M1-T06/curl-publish-accepted.json`.
- `evidence/M1-T06/curl-publish-rejected.json`.
- `evidence/M1-T06/contract-call-payload.json`.
- `evidence/M1-T06/publish-audit-record.json`.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes curl responses for backend flows.
- PR includes local smart-contract outcomes if call-data validation or stub contract tests are added.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
