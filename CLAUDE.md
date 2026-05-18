# CLAUDE.md

Operational entry point for Claude Code in the Duelly monorepo.

Read first:

- `AGENTS.md`
- `docs/OPERATING_MODEL.md`
- `docs/MONOREPO.md`
- `docs/FINAL_ARCHITECTURE.md`
- `docs/PR_WORKFLOW.md`
- `docs/DEFINITION_OF_DONE.md`

Claude Code subagents live in `.claude/agents/*.md`. Use them when a task requires specialization, parallel work, critical review, or isolation.

Non-negotiable rules:

- Work from an independent worktree.
- Open PRs as draft.
- Make granular commits.
- Include tests and QA commands.
- Do not merge.
- For development and critical tasks, use the highest-capability available model with `effort: xhigh`.
- Humans close tasks.

Monorepo:

- `frontend/`: product and user experience.
- `backend/`: open-source services, APIs, wallet abstraction, and integrations.
- `smartcontract/`: EVM contracts, BRL1, ERC-2612, EIP-712, and Polymarket CTF resolution.
