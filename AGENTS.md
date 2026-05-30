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
- Sync the base branch first: run `git pull --ff-only` on `main` before deriving the worktree.
- Worktrees do not carry local secrets. When real-stack QA needs environment data, look for source env files in the base repository checkout first, for example `/home/arthur/lyth/duelly/.env` and `/home/arthur/lyth/duelly/backend/.env`, copy them into the task worktree locally, and never commit `.env` or secrets.
- Open every PR as draft.
- After opening a PR, check merge eligibility; if it is outdated or has conflicts, sync with `main` and resolve before handing off.
- Use granular and descriptive commits.
- Add tests for behavior changes, or include an explicit justification.
- Include QA commands, evidence, and Definition of Done status in the PR.
- When `frontend/` and/or `backend/` is touched, start the real backend and real frontend for exploratory QA and record the flow evidence.
- Fork-backed QA may use staging Anvil at `http://10.0.1.220:8545` when reachable and no contract changes or conditionId resolution/mirroring are needed; use a local Anvil fork when contracts change, conditionId resolution/mirroring is needed, staging is unavailable, or fork safety is ambiguous.
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
