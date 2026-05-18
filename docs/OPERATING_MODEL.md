# Operating Model

Duelly is developed with an agent harness, draft PRs, granular commits, local QA, and human task closure.

## Standard cycle

```text
1. Human defines task and criteria.
2. Agent creates an independent worktree.
3. Agent selects required subagents.
4. Agent implements with granular commits.
5. Agent runs tests and QA.
6. Agent opens a draft PR with evidence.
7. QA/human validates locally.
8. Human decides merge, changes, or close.
9. Worktree is removed only after approval or explicit human decision.
```

## Required worktree

No task should be implemented directly on the base branch.

```bash
scripts/harness/new-task-worktree.sh --task "short description"
```

## Required draft PR

```bash
node scripts/harness/render-pr-body.mjs \
  --task "description" \
  --summary "summary" \
  --qa "npm run qa"

scripts/harness/open-draft-pr.sh --title "feat: description"
```

## HITL

Agents must never:

- Merge PRs.
- Mark final approval.
- Close tasks as completed without a human.
- Ignore QA or evidence.

## Models and subagents

For development and critical tasks, use the best available model with reasoning/effort `xhigh`. Use specialist subagents when work involves blockchain, backend, frontend, design, QA, security, or PR coordination.
