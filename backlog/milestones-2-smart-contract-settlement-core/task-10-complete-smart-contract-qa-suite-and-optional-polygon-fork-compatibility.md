# M2.T10 — Complete smart-contract QA suite and optional Polygon fork compatibility

**Milestone:** M2 — Smart Contract Settlement Core  
**Priority:** P1  
**Type:** Smart Contract / QA  
**Status:** Planned

## Dependencies

- M2.T01
- M2.T02
- M2.T03
- M2.T04
- M2.T05
- M2.T06
- M2.T07
- M2.T08
- M2.T09

## Recommended specialist subagents

- blockchain-specialist
- qa-specialist
- security-reviewer

## Execution requirements

- Execute the task in an independent git worktree created from the intended base branch.
- Open the implementation PR as a Draft PR and keep it in draft until QA evidence is complete.
- Use granular, descriptive commits. Avoid large mixed commits.
- Use specialist subagents whenever the task touches their domain; critical development or QA decisions must use the best available model with reasoning xhigh.
- Do not mark the task complete by the agent. Human-in-the-loop approval closes the task after PR review and QA approval.

## Scope

- Organize the full smart-contract test suite into meaningful files.
- Add optional fork test instructions for BRL1 and Polymarket CTF compatibility using POLYGON_RPC_URL.
- Add gas/reporting output if useful for estimating minLoserFee.
- Create a final M2 smart-contract QA evidence pack.

## Non-goals

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- Fork tests must not be required for CI if they need external RPC credentials.
- Fork tests should be safe and read-only or deploy only into local fork state.

## Acceptance criteria

- `forge test` passes without external network access.
- Optional fork command is documented and either passes or is explicitly marked blocked by missing RPC credential.
- Test coverage includes all M2 Definition of Done items.
- Smart-contract README or docs explain local testing commands and expected outcomes.

## Required QA and test plan

- Run `cd smartcontract && forge test`.
- Run `cd smartcontract && forge test -vvv`.
- If available, run `cd smartcontract && POLYGON_RPC_URL=... forge test --fork-url "$POLYGON_RPC_URL" --match-path "test/*Fork*.t.sol" -vvv`.
- Record gas estimate data relevant to the 3x gasFee loserFee minimum.

## Required evidence to version and attach to the PR

- evidence/M2-T10/forge-test.log.
- evidence/M2-T10/forge-test-vvv.log.
- evidence/M2-T10/fork-test.log or fork-test-blocked.md.
- evidence/M2-T10/gas-estimates.md.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
