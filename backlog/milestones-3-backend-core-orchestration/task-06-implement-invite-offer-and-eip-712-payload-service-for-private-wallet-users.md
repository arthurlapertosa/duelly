# M3.T06 — Implement invite, offer, and EIP-712 payload service for private-wallet users

**Milestone:** M3 — Backend Core Orchestration, Wallet-First Flow  
**Priority:** P0  
**Type:** Backend / Betting / EIP-712  
**Status:** Planned

## Dependencies

- M3.T02
- M3.T04
- M3.T05
- M2.T03 test vectors or compatible local spec

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

- Implement invite creation for accepted templates.
- Generate EIP-712 BetOffer payload for the maker wallet.
- Generate EIP-712 BetAcceptance payload for the taker wallet.
- Store invite state and expiration.
- Validate stake, loserFee, templateHash, outcomes, counterparty rules, and deadlines before relayer submission.

## Non-goals

- Do not accept unregistered templates.
- Do not create on-chain bets before both users are ready to fund.
- Do not make backend the final result arbiter.

## Acceptance criteria

- Create invite endpoint returns BetOffer payload and required funding amount.
- Accept invite endpoint returns BetAcceptance payload and required funding amount.
- Payloads match M2 EIP-712 schema/test vectors when available.
- Tampered stake/template/outcome is rejected by backend validation before relayer submission.
- Expired invite cannot be accepted.

## Required QA and test plan

- Run backend invite tests.
- Run curl to create invite for accepted template.
- Run curl to accept invite as second user.
- Run curl for tampered/expired invite negative cases.
- Compare payload hash against M2 EIP-712 test vector if available.

## Required evidence to version and attach to the PR

- evidence/M3-T06/invite-tests.log
- evidence/M3-T06/curl-create-invite.json
- evidence/M3-T06/curl-accept-invite.json
- evidence/M3-T06/curl-negative-cases.json
- evidence/M3-T06/eip712-payload-vector.json

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
