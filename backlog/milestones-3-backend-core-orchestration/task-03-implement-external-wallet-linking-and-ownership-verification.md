# M3.T03 — Implement external wallet linking and ownership verification

**Milestone:** M3 — Backend Core Orchestration, Wallet-First Flow  
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

- Implement wallet-linking endpoints for user-owned private wallets.
- Generate a short-lived wallet ownership challenge.
- Verify the challenge signature and bind the wallet address to the user.
- Support mock signature verification mode for local QA.
- Store only safe public wallet metadata.

## Non-goals

- Do not create embedded wallets.
- Do not accept private keys or seed phrases.
- Do not perform token transfers.
- Do not assume the wallet has BRL1 until M3.T04 validates it.

## Acceptance criteria

- User can request a wallet-linking challenge.
- User can link a wallet after submitting a valid signature.
- Invalid, expired, replayed, or mismatched signatures are rejected.
- One wallet cannot be active for two users unless an explicit human-approved policy says otherwise.
- API responses return wallet address, verification status, and verification timestamp only.

## Required QA and test plan

- Run backend wallet-linking tests.
- Run curl to request wallet challenge.
- Run curl to submit valid mock signature.
- Run curl for expired/replayed/invalid signature negative cases.
- Capture resulting wallet metadata via curl.

## Required evidence to version and attach to the PR

- evidence/M3-T03/wallet-linking-tests.log
- evidence/M3-T03/curl-wallet-challenge.json
- evidence/M3-T03/curl-wallet-link-success.json
- evidence/M3-T03/curl-wallet-link-negative-cases.json
- evidence/M3-T03/curl-wallet-metadata.json

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
