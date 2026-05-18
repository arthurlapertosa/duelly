# M5.T02 — Implement deterministic E2E seed data

**Milestone:** M5 — End-to-End MVP Integration  
**Priority:** P0  
**Type:** E2E / Fixtures  
**Status:** Planned

## Dependencies

- M5.T01

## Recommended specialist subagents

- backend-specialist
- blockchain-specialist
- qa-specialist

## Execution requirements

- Execute the task in an independent git worktree created from the intended base branch.
- Open the implementation PR as a Draft PR and keep it in draft until QA evidence is complete.
- Use granular, descriptive commits. Avoid large mixed commits.
- Use specialist subagents whenever the task touches their domain; critical development or QA decisions must use the best available model with reasoning xhigh.
- Do not mark the task complete by the agent. Human-in-the-loop approval closes the task after PR review and QA approval.

## Scope

- Seed two or more users with wallets and BRL1 balances.
- Seed accepted and rejected templates.
- Seed MockPolymarketCTF conditions for unresolved, A wins, B wins, and void outcomes.
- Make seed outputs available to frontend/backend tests.

## Non-goals

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- Seeds must be deterministic across local runs.
- Avoid using real user data or real keys for seed data.

## Acceptance criteria

- Seed script creates users A and B with known balances.
- Seed script registers at least one accepted template on-chain/local registry.
- Seed script records conditionIds and expected outcomes.
- Seed script is idempotent or documents clean reset requirements.

## Required QA and test plan

- Run seed command after local stack startup.
- Run curl to fetch seeded users/templates.
- Run local smart-contract read command or test to verify seeded balances and template registration.

## Required evidence to version and attach to the PR

- evidence/M5-T02/seed.log.
- evidence/M5-T02/curl-seeded-templates.json.
- evidence/M5-T02/curl-seeded-users.json.
- evidence/M5-T02/seeded-contract-state.md.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
