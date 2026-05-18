# M3.T07 — Implement invite, offer, and EIP-712 payload service

**Milestone:** M3 — Backend Core Orchestration  
**Priority:** P0  
**Type:** Backend / Betting  
**Status:** Planned

## Dependencies

- M3.T02
- M3.T05
- M3.T06
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

- Create invite records for 1x1 bets.
- Generate BetOffer and BetAcceptance payloads compatible with the smart contract EIP-712 schema.
- Calculate loserFee using current stake, loserFeeBps, and minLoserFee quote.
- Manage invite expiration and taker restrictions.

## Non-goals

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- Backend prepares signature payloads; users/wallets sign them.
- Store offerHash and invite state for traceability.

## Acceptance criteria

- Create invite endpoint validates template active status and user affordability.
- Create invite endpoint returns EIP-712 BetOffer payload and calculated loserFee.
- Accept invite endpoint returns EIP-712 BetAcceptance payload and required funding amount.
- Tampered stake/template/outcome is rejected by backend validation before relayer submission.
- Expired invite cannot be accepted.

## Required QA and test plan

- Run backend invite tests.
- Run curl to create invite for accepted template.
- Run curl to accept invite as second user.
- Run curl for tampered/expired invite negative cases.
- Compare payload hash against M2 EIP-712 test vector if available.

## Required evidence to version and attach to the PR

- evidence/M3-T07/invite-tests.log.
- evidence/M3-T07/curl-create-invite.json.
- evidence/M3-T07/curl-accept-invite.json.
- evidence/M3-T07/eip712-payload-vector.json.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
