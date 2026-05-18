# Validation

This bootstrap was validated locally without external dependencies and without network calls.

## Commands executed in the bootstrap directory

```bash
npm test
npm run validate
npm run qa
```

Result: all passed.

## Validated coverage

- Harness root.
- Monorepo workspaces: `frontend`, `backend`, `smartcontract`.
- Codex and Claude Code subagents.
- PR template with Definition of Done, evidence, QA, and HITL.
- Blockchain scripts in self-test mode.
- Worktree creation, PR body rendering, draft PR dry-run, granular commit, and worktree close scripts.

## Blockchain scripts

Validated in self-test mode:

```bash
node scripts/blockchain/erc20-inspect.mjs --self-test
node scripts/blockchain/polymarket-condition-inspect.mjs --self-test
```

These tests do not use RPC endpoints, private keys, signatures, or transactions.

## Worktree / PR scripts

Validated in a temporary Git repository:

```bash
git init -b main
git add .
git commit -m "chore(repo): bootstrap duelly monorepo"

scripts/harness/new-task-worktree.sh --task "bootstrap smoke" --root /tmp/duelly-worktrees --dry-run
scripts/harness/new-task-worktree.sh --task "bootstrap smoke" --root /tmp/duelly-worktrees

cd /tmp/duelly-worktrees/duelly-git-smoke-bootstrap-smoke
node scripts/harness/render-pr-body.mjs --task "bootstrap smoke" --summary "validate draft PR generation" --qa "npm run qa"
echo "smoke" > .smoke
git add .smoke
scripts/harness/commit-granular.sh --message "test(harness): add smoke evidence"
scripts/harness/open-draft-pr.sh --title "test: smoke draft pr" --dry-run

cd /tmp/duelly-git-smoke
scripts/harness/close-worktree.sh --path /tmp/duelly-worktrees/duelly-git-smoke-bootstrap-smoke
```

Result: all passed. The PR script was validated with `--dry-run` so it does not require GitHub authentication or the `gh` CLI.
