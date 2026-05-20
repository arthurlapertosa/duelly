# M5.T01 — Create local full-stack orchestration

**Milestone:** M5 — End-to-End MVP Integration  
**Priority:** P0  
**Type:** E2E / DevOps  
**Status:** Planned

## Dependencies

- M2.T10
- M3.T10
- M4.T08

## Recommended specialist subagents

- backend-specialist
- frontend-specialist
- blockchain-specialist
- qa-specialist

## Execution requirements

- Execute the task in an independent git worktree created from the intended base branch.
- Open the implementation PR as a Draft PR and keep it in draft until QA evidence is complete.
- Use granular, descriptive commits. Avoid large mixed commits.
- Use specialist subagents whenever the task touches their domain; critical development or QA decisions must use the best available model with reasoning xhigh.
- Do not mark the task complete by the agent. Human-in-the-loop approval closes the task after PR review and QA approval.

## Scope

- Create a local command or script to start smart-contract local chain, backend, and frontend together.
- Ensure ports, environment variables, and dependencies are documented.
- Provide clean startup and teardown behavior.
- Support deterministic fixture mode.

## Non-goals

- Do not depend on M3.5 platform-wallet, Pix, or exchange automation work.

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- Use Docker Compose, npm scripts, or another pragmatic local orchestration approach selected by the agent.
- Keep commands simple for human QA.

## Acceptance criteria

- One documented command starts the full local stack or a small documented sequence starts it reliably.
- One documented command tears down the stack and cleans temporary state.
- Frontend can reach backend, backend can reach local chain, and local chain has deployed mocks/contracts.
- Health checks confirm all systems are ready before tests run.

## Required QA and test plan

- Run full-stack startup command.
- Run curl backend health and frontend availability checks.
- Run smart-contract local chain status command or deployment verification.
- Run teardown command and verify no stale processes remain.

## Required evidence to version and attach to the PR

- evidence/M5-T01/full-stack-startup.log.
- evidence/M5-T01/curl-backend-health.json.
- evidence/M5-T01/frontend-health.txt.
- evidence/M5-T01/local-chain-deployment.json.
- evidence/M5-T01/teardown.log.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
