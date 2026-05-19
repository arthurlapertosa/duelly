# M0.T01 — Create and validate the first monorepo commit

**Milestone:** M0 — Repository & Harness Foundation  
**Priority:** P0  
**Type:** Repository / Harness  
**Status:** Done

## Dependencies

- None

## Recommended specialist subagents

- harness-lead
- qa-specialist

## Execution requirements

- Execute the task in an independent git worktree created from the intended base branch.
- Open the implementation PR as a Draft PR and keep it in draft until QA evidence is complete.
- Use granular, descriptive commits. Avoid large mixed commits.
- Use specialist subagents whenever the task touches their domain; critical development or QA decisions must use the best available model with reasoning xhigh.
- Do not mark the task complete by the agent. Human-in-the-loop approval closes the task after PR review and QA approval.

## Scope

- Apply the approved Duelly bootstrap into the empty GitHub repository.
- Keep base folders: frontend/, backend/, smartcontract/.
- Keep root-level harness files, agent files, scripts, and QA config in English.
- Confirm docs/FINAL_ARCHITECTURE.md is present and in English.

## Non-goals

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- Use the existing bootstrap zip as the source of truth for the first commit.
- Commit message should be `chore(repo): bootstrap duelly monorepo` or equivalent.
- Do not introduce product code beyond the bootstrap structure.

## Acceptance criteria

- Repository contains frontend/, backend/, smartcontract/, docs/, scripts/, .github/, .codex/, and .claude/.
- AGENTS.md, CLAUDE.md, and all harness/agent files are in English.
- The repository root package.json contains scripts for validate, test, and qa.
- No generated temporary files, local secrets, or machine-specific files are committed.

## Required QA and test plan

- Run `npm run validate` from the repository root.
- Run `npm test` from the repository root.
- Run `npm run qa` from the repository root.
- Run `git status --short` and confirm only intended files are tracked before commit.

## Required evidence to version and attach to the PR

- evidence/M0-T01/root-qa.log containing validate/test/qa command outputs.
- evidence/M0-T01/repository-tree.txt containing a trimmed `find` or `tree` output.
- PR evidence section linking the first commit hash and QA logs.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
