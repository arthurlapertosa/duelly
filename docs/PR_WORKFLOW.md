# PR Workflow

## Rules

- Every PR starts as draft.
- Every PR must come from an independent worktree.
- Every PR must have granular and descriptive commits.
- Every PR must contain evidence of the work.
- A human closes the task.

## Open PR

```bash
node scripts/harness/render-pr-body.mjs \
  --task "task" \
  --summary "summary of work" \
  --qa "npm run qa"

scripts/harness/open-draft-pr.sh --title "feat: task"
```

## Minimum evidence

- Changed files.
- Why they changed.
- Tests executed.
- QA result.
- Screenshots or logs when applicable.
- Definition of Done status.
- Risks and follow-ups.

## Leaving draft

Only after QA/HITL. The agent can prepare the PR, but must not finalize approval or merge.
