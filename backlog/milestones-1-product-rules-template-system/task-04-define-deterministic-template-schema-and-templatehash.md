# M1.T04 — Define deterministic sports template schema and templateHash

**Milestone:** M1 — Product Rules & Sports Template System  
**Priority:** P0  
**Type:** Backend / Smart Contract Interface  
**Status:** Planned

## Dependencies

- M1.T00
- M1.T01
- M1.T03

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

- Define TypeScript schema/types for the Fastify backend and TypeORM persistence model for canonical templates.
- Define the canonical Sports Template schema shared by backend and smart contract.
- Represent backend template schema in TypeScript types and, where persistence is needed, TypeORM entities backed by PostgreSQL.
- Define deterministic `templateHash` input ordering and encoding.
- Include sports-specific fields required to preserve binary result semantics.
- Include `loserFeeBps` and minimum loser fee policy fields where appropriate.
- Add tests proving equal inputs produce equal hashes and changed critical fields change the hash.

## Non-goals

- Do not implement full smart-contract registry logic; M2 owns contract implementation.
- Do not hash non-canonical raw provider JSON unless canonicalization is formally specified and tested.
- Do not include display-only metadata in the hash unless explicitly required.

## Implementation guidance

- Template schema types must be reusable by Fastify route handlers and TypeORM entities.
- If a database entity is created, add or update a TypeORM migration.
- Prefer an ABI-compatible hash definition that the smart contract can reproduce.
- Define the canonical schema in a way that supports on-chain enforcement while keeping provider metadata available off-chain.
- Normalize string casing and whitespace before hash input where needed, or avoid hashing mutable human-readable strings.
- Use stable enum-like fields for `sport`, `competition`, `eventType`, and `binaryMarketType`.
- Keep TypeScript DTOs, domain types, and TypeORM entities aligned without leaking database-only fields into hash inputs.

## Required canonical fields

The canonical sports template schema must include at least:

- `templateVersion`
- `provider`
- `providerMarketId`
- `conditionId`
- `questionId`
- `sport`
- `competition`
- `eventType`
- `binaryMarketType`
- `outcomeA.label`
- `outcomeA.providerOutcomeIndex`
- `outcomeB.label`
- `outcomeB.providerOutcomeIndex`
- `rulesHash`
- `rulesSourceHash` or `rulesSourceUrlHash`
- `eventStartAt` when available
- `bettingCloseAt`
- `resolutionDeadline`
- `loserFeeBps`
- `active`

Suggested `binaryMarketType` values:

- `FOOTBALL_TOURNAMENT_WINNER_YES_NO`
- `FOOTBALL_BINARY_MATCH_CONDITION`
- `TENNIS_MATCH_WINNER`
- `TENNIS_TOURNAMENT_WINNER_YES_NO`

For tennis templates, include `competitionLevel` as one of `ATP_250`, `ATP_500`, `ATP_MASTERS_1000`, `ATP_FINALS`, or `GRAND_SLAM`; for Grand Slams, include `grandSlamName` when available.
- `UFC_MAIN_EVENT_FIGHT_WINNER`
- `F1_RACE_WINNER_YES_NO`
- `F1_SPRINT_WINNER_YES_NO`
- `F1_RACE_OR_SPRINT_HEAD_TO_HEAD`

## Acceptance criteria

- Template schema includes all required canonical fields above.
- Backend implementation includes TypeScript domain types and TypeORM-compatible persistence mapping for accepted sports templates.
- `templateHash` is deterministic across backend tests and Solidity tests or documented test vectors.
- Changing any critical field changes `templateHash`, including sport, competition, event type, conditionId, questionId, outcomes, rulesHash, close time, resolution deadline, and fee fields.
- Non-critical display metadata is either excluded from hash or explicitly included by design.
- Schema supports future on-chain template registry enforcement without relying on raw Polymarket JSON.

## Required QA and test plan

- Run backend typecheck and tests for schema/hash determinism.
- If TypeORM entities/migrations are added, validate migration status against local PostgreSQL.
- Run backend typecheck and hash tests.
- Run local smart-contract hash vector test or a placeholder contract/vector test if M2 contract is not implemented yet.
- Run curl endpoint to fetch a sports template candidate and verify the returned `templateHash` matches the test vector.

Suggested commands:

```bash
docker compose up -d postgres
npm --workspace @duelly/backend run db:migration:show
npm --workspace @duelly/backend run typecheck
npm --workspace @duelly/backend test -- template-hash
npm --workspace @duelly/backend run dev
curl -sS "http://localhost:<port>/templates?mode=fixture&sport=football" | jq '.[0].templateHash'
# If a smart-contract hash-vector test exists in this PR, run it locally and capture the output as evidence.
```

## Required evidence to version and attach to the PR

- `evidence/M1-T04/backend-typecheck.log`.
- `evidence/M1-T04/typeorm-migration-status.log`.
- `evidence/M1-T04/hash-tests.log`.
- `evidence/M1-T04/template-hash-vectors.json`.
- `evidence/M1-T04/curl-template-hash.json`.
- `evidence/M1-T04/schema-review.md`.
- `evidence/M1-T04/smartcontract-hash-vector-test.log` if a local contract/vector test is added.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes curl responses for backend flows.
- PR includes local smart-contract outcomes if contract/vector tests are added.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
