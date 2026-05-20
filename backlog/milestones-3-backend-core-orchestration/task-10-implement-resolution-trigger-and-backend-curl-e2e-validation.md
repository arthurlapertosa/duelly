# M3.T10 — Implement resolution trigger and backend curl E2E validation

**Milestone:** M3 — Backend Core Orchestration, Wallet-First Flow  
**Priority:** P1  
**Type:** Backend / Resolution / QA  
**Status:** Planned

## Dependencies

- M2.T08
- M3.T09

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

- Implement a resolution trigger that calls smart-contract `resolveFromPolymarket` when a bet is eligible.
- Ensure backend does not decide the winner; it only triggers contract resolution.
- Expose internal/admin endpoint or scheduled job for resolution attempts.
- Create curl-based backend E2E checklist covering templates, invites, funding submission, indexing, and resolution trigger.

## Non-goals

- Do not use Polymarket odds or outcome prices as final result.
- Do not add manual arbitration in M3.

## Acceptance criteria

- Resolution trigger calls contract and records the attempt.
- If CTF is unresolved, trigger reports pending/not resolved without corrupting bet state.
- If CTF is resolved, trigger submits resolution and indexer updates final bet state.
- Curl E2E document includes exact commands and expected response snippets.

## Required QA and test plan

- Run backend resolution tests.
- Run local contract stack with MockPolymarketCTF unresolved and capture pending response.
- Set MockPolymarketCTF to player A win, trigger resolution via curl, and fetch final bet state via curl.
- Repeat for void outcome if feasible.

## Required evidence to version and attach to the PR

- evidence/M3-T10/resolution-tests.log
- evidence/M3-T10/curl-resolution-pending.json
- evidence/M3-T10/curl-resolution-success.json
- evidence/M3-T10/curl-final-bet-state.json
- evidence/M3-T10/backend-e2e-curl-checklist.md

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
