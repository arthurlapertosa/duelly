# M4.T04 — Implement template browsing and selection UI

**Milestone:** M4 — Frontend MVP Experience  
**Priority:** P0  
**Type:** Frontend / Templates  
**Status:** Planned

## Dependencies

- M4.T01
- M3.T06

## Recommended specialist subagents

- frontend-specialist
- designer
- backend-specialist
- qa-specialist

## Execution requirements

- Execute the task in an independent git worktree created from the intended base branch.
- Open the implementation PR as a Draft PR and keep it in draft until QA evidence is complete.
- Use granular, descriptive commits. Avoid large mixed commits.
- Use specialist subagents whenever the task touches their domain; critical development or QA decisions must use the best available model with reasoning xhigh.
- Do not mark the task complete by the agent. Human-in-the-loop approval closes the task after PR review and QA approval.

## Scope

- Display available bet templates returned by backend.
- Show category, outcome labels, close time, rules summary, and fee estimate entry point.
- Clearly indicate collectibles-first or sports fallback source where relevant.
- Prevent selection of inactive or unavailable templates.

## Non-goals

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- Rules summary should be concise but include a link/modal to full rules.
- Do not display Polymarket odds/probabilities as the basis for resolution.

## Acceptance criteria

- Template list only displays backend-accepted templates.
- Template detail page shows deterministic outcome labels and rules source.
- Unavailable templates cannot be selected.
- UI copy does not imply odds/probabilities decide the winner.

## Required QA and test plan

- Run Playwright template list/detail tests.
- Run curl templates and template detail endpoints.
- Capture screenshots of template list and template detail.

## Required evidence to version and attach to the PR

- evidence/M4-T04/playwright-templates.log.
- evidence/M4-T04/curl-templates.json.
- evidence/M4-T04/curl-template-detail.json.
- evidence/M4-T04/screenshots/template-list.png.
- evidence/M4-T04/screenshots/template-detail.png.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
