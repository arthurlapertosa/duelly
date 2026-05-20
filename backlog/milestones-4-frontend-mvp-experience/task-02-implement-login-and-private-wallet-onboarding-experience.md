# M4.T02 — Implement login and private wallet onboarding experience

**Milestone:** M4 — Frontend MVP Experience, Wallet-First Flow  
**Priority:** P0  
**Type:** Frontend / Auth / Wallets  
**Status:** Planned

## Dependencies

- M4.T01
- M3.T02
- M3.T03

## Recommended specialist subagents

- frontend-specialist
- designer
- backend-specialist
- qa-specialist

## Execution requirements

- Execute the task in an independent git worktree created from the intended base branch.
- Open the implementation PR as a Draft PR and keep it in draft until QA evidence is complete.
- Use granular, descriptive commits. Avoid large mixed commits.
- Use specialist subagents whenever the task touches their domain; critical development or QA decisions must use the best available model with reasoning xhigh.
- Do not mark the task complete by the agent. Human-in-the-loop approval closes the task after PR review and QA approval.


## Scope

- Implement login/session UI.
- Implement private wallet connection or mock connection flow.
- Show wallet ownership verification challenge/signature flow.
- Show wallet verification status.
- Explain BRL1-only MVP support in simple copy.

## Non-goals

- Do not create platform wallets.
- Do not show Pix/deposit/withdrawal flows.
- Do not ask users to paste private keys or seed phrases.

## Acceptance criteria

- Unauthenticated user sees login state.
- Authenticated user can connect/verify a private wallet.
- Invalid wallet verification state is shown clearly.
- Copy avoids raw technical language in primary flow.
- Backend fixture calls match M3 wallet-linking API.

## Required QA and test plan

- Run frontend tests.
- Run Playwright login and wallet onboarding scenario.
- Run curl commands for wallet challenge/link fixture APIs used by frontend.
- Capture screenshots for unauthenticated, authenticated, wallet challenge, and wallet verified states.

## Required evidence to version and attach to the PR

- evidence/M4-T02/frontend-tests.log
- evidence/M4-T02/playwright-wallet-onboarding-report/
- evidence/M4-T02/curl-wallet-fixtures.json
- evidence/M4-T02/screenshots/wallet-verified.png

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
