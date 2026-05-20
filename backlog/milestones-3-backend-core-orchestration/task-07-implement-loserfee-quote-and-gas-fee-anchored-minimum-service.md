# M3.T07 — Implement loserFee quote and gas-fee-anchored minimum service

**Milestone:** M3 — Backend Core Orchestration, Wallet-First Flow  
**Priority:** P0  
**Type:** Backend / Fees  
**Status:** Planned

## Dependencies

- M2.T05
- M3.T04
- M3.T06

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

- Implement fee quote endpoint used before invite creation and acceptance.
- Calculate percent loserFee from stake.
- Calculate configured gas-anchored minimum loserFee as at least 3x estimated gas fee.
- Select `max(percentLoserFee, minGasAnchoredLoserFee)`.
- Return a user-readable explanation without Web3 jargon in main copy fields.

## Non-goals

- Do not include brokerage, Pix, Stripe, exchange, or withdrawal fees in M3 loserFee quotes.
- Do not modify smart-contract fee math outside the M2-approved formula.

## Acceptance criteria

- Fee quote endpoint returns stake, loserFeeBps, percentFee, gasAnchoredMinimum, selectedLoserFee, and totalRequiredAmount.
- Selected loserFee is never below configured 3x gas fee estimate.
- Small stake values use the gas-anchored minimum when it is larger.
- Normal/high stake values use the percent fee when it is larger.
- Curl evidence covers small, normal, and high stake values.

## Required QA and test plan

- Run backend fee tests.
- Run curl to fee quote endpoint for small, normal, and high stake values.
- Run curl with invalid stake and capture rejection.

## Required evidence to version and attach to the PR

- evidence/M3-T07/fee-tests.log
- evidence/M3-T07/curl-fee-quote-small.json
- evidence/M3-T07/curl-fee-quote-normal.json
- evidence/M3-T07/curl-fee-quote-high.json
- evidence/M3-T07/curl-fee-invalid-stake.json

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
