# M3.T03 — Implement wallet abstraction provider interface

**Milestone:** M3 — Backend Core Orchestration  
**Priority:** P0  
**Type:** Backend / Wallets  
**Status:** Planned

## Dependencies

- M3.T02

## Recommended specialist subagents

- backend-specialist
- blockchain-specialist
- security-reviewer
- qa-specialist

## Execution requirements

- Execute the task in an independent git worktree created from the intended base branch.
- Open the implementation PR as a Draft PR and keep it in draft until QA evidence is complete.
- Use granular, descriptive commits. Avoid large mixed commits.
- Use specialist subagents whenever the task touches their domain; critical development or QA decisions must use the best available model with reasoning xhigh.
- Do not mark the task complete by the agent. Human-in-the-loop approval closes the task after PR review and QA approval.

## Scope

- Define an interface for embedded wallet provider operations.
- Support creating or linking a wallet for a user.
- Support external wallet mode for users who already hold BRL1.
- Add mock wallet provider for local tests.

## Non-goals

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- Keep provider-specific SDK usage behind an adapter.
- Never store private keys unless explicitly required by a chosen provider and approved by security review.

## Acceptance criteria

- User can have an embedded wallet address in mock mode.
- User can link an external wallet address in mock mode.
- Wallet ownership verification requirement is documented for external wallet mode.
- API responses show safe public wallet metadata only.

## Required QA and test plan

- Run backend wallet tests.
- Run curl to create mock embedded wallet.
- Run curl to link mock external wallet.
- Run curl to fetch user wallet metadata.

## Required evidence to version and attach to the PR

- evidence/M3-T03/wallet-tests.log.
- evidence/M3-T03/curl-create-wallet.json.
- evidence/M3-T03/curl-link-wallet.json.
- evidence/M3-T03/curl-wallet-metadata.json.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
