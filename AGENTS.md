# AGENTS.md

Short map for agents working in the Duelly monorepo. The detailed source of truth lives in `docs/`.

## Read before acting

1. `docs/OPERATING_MODEL.md`
2. `docs/MONOREPO.md`
3. `docs/FINAL_ARCHITECTURE.md`
4. `docs/DEFINITION_OF_DONE.md`
5. For PRs: `docs/PR_WORKFLOW.md` and `.github/pull_request_template.md`
6. For blockchain: `docs/BLOCKCHAIN.md` and `scripts/blockchain/`
7. For UI: `docs/FRONTEND.md` and `docs/DESIGN.md`
8. For backend: `docs/BACKEND.md`

## Base folders

- `frontend/`: web/mobile-first user interface that hides Web3 complexity.
- `backend/`: APIs, auth, wallet abstraction, Pix/on-ramp, templates, relayer, and indexer.
- `smartcontract/`: EVM contracts, EIP-712, ERC-2612, BRL1, and Polymarket CTF resolution.
- `.prototype/`: imported frontend reference app; future frontend work must stay 1:1 with it unless a human approves a deviation.

## Mandatory operating model

- Start every task in an independent worktree.
- Open every PR as draft.
- Use granular and descriptive commits.
- Add tests for behavior changes, or include an explicit justification.
- Include QA commands, evidence, and Definition of Done status in the PR.
- For frontend work, treat `.prototype/` as the source of truth and attach parity screenshots in the PR evidence.
- Code only moves forward after QA/HITL.
- Agents never merge and never mark a task as finally approved.

## Subagents

Use subagents whenever the work is specialized, parallel, critical, or noisy. For development and critical tasks, use the best available model with reasoning/effort `xhigh`.

Available subagents:

- `harness_pr_coordinator`
- `backend_engineer`
- `frontend_engineer`
- `product_designer`
- `blockchain_engineer`
- `blockchain_query_operator`
- `qa_reviewer`
- `security_reviewer`
- `docs_maintainer`

## Expected task output

- Changed files and why they changed.
- Tests added or updated.
- QA commands executed.
- Evidence attached to the PR.
- Risks and follow-ups stated explicitly.
