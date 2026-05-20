# M3.5.T03 — Implement platform wallet provider adapter and wallet creation flow

**Milestone:** M3.5 — Platform Wallet, Pix, and Automated BRL1 Operations  
**Priority:** P0  
**Type:** Backend / Wallets  
**Status:** Planned

## Dependencies

- M3.5.T01
- Wallet provider decision

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

- Create an embedded/platform wallet provider interface.
- Implement mock provider for local tests.
- Implement chosen provider adapter if credentials and SDK access are available.
- Expose backend endpoint to create or fetch a user platform wallet.
- Store only safe public wallet metadata and provider references.
- Ensure wallet metadata is compatible with BRL1-Polygon deposits from OKX PJ.

## Non-goals

- Do not store raw private keys.
- Do not expose seed phrases.
- Do not make platform wallet required for M3 wallet-first flow.
- Do not trigger Inter or OKX operations from wallet creation alone.

## Acceptance criteria

- Mock platform wallet creation returns deterministic test wallet metadata.
- Provider adapter is isolated behind interface and can be disabled.
- User can have either an external wallet from M3 or a platform wallet from M3.5 without breaking M3 APIs.
- Wallet record includes Polygon-compatible address and provider reference.
- Security review confirms no private key material is logged or stored.

## Required QA and test plan

- Run backend wallet-provider tests.
- Run curl to create mock platform wallet.
- Run curl to fetch platform wallet metadata.
- Run negative curl for unauthorized wallet access.
- Run a BRL1-Polygon address format validation test.

## Required evidence to version and attach to the PR

- evidence/M3.5-T03/platform-wallet-tests.log
- evidence/M3.5-T03/curl-create-platform-wallet.json
- evidence/M3.5-T03/curl-platform-wallet-metadata.json
- evidence/M3.5-T03/address-validation.log
- evidence/M3.5-T03/security-review-notes.md

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
