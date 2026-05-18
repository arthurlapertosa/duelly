# M0 — Repository & Harness Foundation

## Goal

Prepare the Duelly monorepo for agentic development with independent worktrees, Draft PRs, granular commits, QA evidence, and specialist subagents.

## External dependencies

- None.

## Delivery principles

- Deliver in small Draft PRs using independent worktrees.
- Every task must include tests and versioned evidence artifacts.
- Agent work is not final until human-in-the-loop review approves QA and closes the task.
- Keep implementation decisions flexible, but keep acceptance criteria and QA gates strict.

## In scope

- Finalize the initial GitHub-ready monorepo bootstrap.
- Validate harness scripts, agent instructions, PR templates, and QA conventions.
- Establish repository settings required for a safe Draft PR workflow.
- Define the evidence folder conventions used by all later milestones.

## Out of scope

- No product feature implementation.
- No production deployment.
- No smart-contract business logic beyond repository scaffolding.

## Task plan, priorities, and dependencies

| Task | Priority | Title | Dependencies |
|---|---:|---|---|
| M0.T01 | P0 | Create and validate the first monorepo commit | None |
| M0.T02 | P0 | Configure GitHub repository safety controls | M0.T01 |
| M0.T03 | P0 | Validate worktree and Draft PR harness flow | M0.T01 |
| M0.T04 | P1 | Standardize evidence folder and QA artifact conventions | M0.T01 |
| M0.T05 | P1 | Prepare GitHub issue import metadata for milestones and tasks | M0.T01, Backlog package approved by human owner |

## Milestone-level quality gates

- `npm run validate` passes from the repository root.
- `npm test` passes from the repository root.
- `npm run qa` passes from the repository root.
- All harness scripts support dry-run where appropriate and have documented examples.
- All agent and harness files are written in English.

## Milestone Definition of Done

- The first repository commit is clean and reproducible.
- GitHub Actions run successfully on the default branch.
- Draft PR workflow is documented and tested in a temporary worktree.
- Evidence conventions are documented and available for future milestones.
- Human reviewer confirms repository readiness for feature work.

## Evidence requirements

- Each task stores versioned evidence under evidence/<task-id>/ and links it from the PR.
- Frontend evidence includes Playwright reports and screenshots when UI is touched.
- Backend evidence includes curl command outputs for end-to-end API validation when backend is touched.
- Smart-contract evidence includes local test outputs and state/outcome summaries when contracts are touched.
- End-to-end evidence includes combined frontend, backend, and smart-contract validation whenever all three systems are involved.
