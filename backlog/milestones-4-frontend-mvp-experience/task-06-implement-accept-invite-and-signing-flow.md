# M4.T06 — Implement accept invite and signing flow

**Milestone:** M4 — Frontend MVP Experience  
**Priority:** P0  
**Type:** Frontend / Betting / Wallets  
**Status:** Planned

## Dependencies

- M4.T05
- M3.T07
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

- Render invite details for user B.
- Validate user B has enough balance for stake + loserFee.
- Guide both EIP-712 bet consent signature and ERC-2612 permit signature through wallet abstraction.
- Submit signed payloads to backend relayer and show funding state.

## Non-goals

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- The UI should say “Confirm bet” rather than exposing EIP-712/permit concepts in the primary copy.
- Technical signature details can live in developer logs or advanced/debug mode only.

## Acceptance criteria

- Invite page shows template, outcome sides, stake, loserFee, and total required amount.
- Insufficient balance blocks acceptance before signing.
- Successful acceptance submits payload to backend and transitions to funded/pending confirmation state.
- Signature rejection or relayer failure shows a recoverable user-friendly error.

## Required QA and test plan

- Run Playwright accept invite flow with mocked signatures.
- Run curl accept invite and local funding submission endpoints.
- Capture screenshots of invite details, confirm state, and funded/pending state.

## Required evidence to version and attach to the PR

- evidence/M4-T06/playwright-accept-invite.log.
- evidence/M4-T06/curl-accept-invite.json.
- evidence/M4-T06/curl-funding-submit.json.
- evidence/M4-T06/screenshots/invite-detail.png.
- evidence/M4-T06/screenshots/funded-state.png.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
