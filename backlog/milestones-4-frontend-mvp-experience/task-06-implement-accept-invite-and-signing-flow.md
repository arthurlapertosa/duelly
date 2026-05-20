# M4.T06 — Implement accept invite and signing flow

**Milestone:** M4 — Frontend MVP Experience, Wallet-First Flow  
**Priority:** P0  
**Type:** Frontend / Betting / Signing  
**Status:** Planned

## Dependencies

- M4.T05
- M3.T06
- M3.T08
- M2.T04

## Recommended specialist subagents

- frontend-specialist
- designer
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

- Implement invite landing page for opponent.
- Show template, sides, stake, loserFee, total required amount, and connected wallet readiness.
- Guide BetAcceptance EIP-712 consent signature.
- Guide ERC-2612 permit signature.
- Submit signed payloads to backend relayer and show pending/funded state.

## Non-goals

- Do not ask user to approve infinite allowance.
- Do not show raw transaction details in primary copy unless in advanced/debug mode.
- Do not use platform wallet or deposit UI.

## Acceptance criteria

- Opponent can accept a valid invite and sign required payloads.
- Insufficient BRL1 blocks acceptance before relayer submission.
- Signature rejection and relayer failure are displayed clearly.
- Successful relayer submission transitions UI to funded/pending result.

## Required QA and test plan

- Run frontend tests.
- Run Playwright accept invite happy path.
- Run Playwright insufficient balance path.
- Run Playwright signature rejected path.
- Run curl commands for accept/relayer fixture APIs.

## Required evidence to version and attach to the PR

- evidence/M4-T06/frontend-tests.log
- evidence/M4-T06/playwright-accept-invite-report/
- evidence/M4-T06/curl-accept-relayer-fixtures.json
- evidence/M4-T06/screenshots/accept-ready.png
- evidence/M4-T06/screenshots/funded-state.png

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
