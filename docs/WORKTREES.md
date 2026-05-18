# Worktrees

Every task must run in an independent worktree.

## Create

```bash
scripts/harness/new-task-worktree.sh --task "implement flow x"
```

## Work

```bash
cd ../worktrees/duelly-implement-flow-x
npm run qa
```

## Close

After QA/HITL and a human decision:

```bash
scripts/harness/close-worktree.sh --path ../worktrees/duelly-implement-flow-x
```

## Rules

- Do not work directly on `main`.
- Do not reuse worktrees across tasks.
- Do not remove a worktree before human QA approval or an explicit human decision.
