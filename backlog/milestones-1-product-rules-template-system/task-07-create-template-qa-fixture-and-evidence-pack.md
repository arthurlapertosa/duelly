# M1.T07 — Create template QA fixture and evidence pack

**Milestone:** M1 — Product Rules & Template System  
**Priority:** P1  
**Type:** QA / Product Rules  
**Status:** Planned

## Dependencies

- M1.T02
- M1.T03
- M1.T04
- M1.T05

## Recommended specialist subagents

- qa-specialist
- backend-specialist
- product-architect

## Execution requirements

- Execute the task in an independent git worktree created from the intended base branch.
- Open the implementation PR as a Draft PR and keep it in draft until QA evidence is complete.
- Use granular, descriptive commits. Avoid large mixed commits.
- Use specialist subagents whenever the task touches their domain; critical development or QA decisions must use the best available model with reasoning xhigh.
- Do not mark the task complete by the agent. Human-in-the-loop approval closes the task after PR review and QA approval.

## Scope

- Create a stable fixture pack for accepted and rejected template scenarios.
- Document expected outputs for discovery, normalization, filtering, and hashing.
- Create a repeatable QA script or checklist for template system validation.

## Non-goals

- Do not expand scope beyond the acceptance criteria without explicit human approval.

## Implementation guidance

- Fixture coverage matters more than live API coverage for deterministic CI.
- Live API checks should be optional and sanitized.

## Acceptance criteria

- Fixture pack includes accepted, rejected, and edge-case templates.
- Expected outputs are committed and compared in tests or snapshot tests.
- QA checklist can be followed by a human without relying on hidden agent context.
- All evidence files avoid secrets and personal data.

## Required QA and test plan

- Run full backend template test suite.
- Run curl discovery, accepted, rejected, and publish endpoints in fixture mode.
- If available, run live API discovery and compare category availability without accepting live templates automatically.

## Required evidence to version and attach to the PR

- evidence/M1-T07/template-fixture-qa.log.
- evidence/M1-T07/curl-fixture-discovery.json.
- evidence/M1-T07/fixture-coverage.md.

## PR completion requirements

- PR description lists the Definition of Done items and links every evidence artifact.
- PR contains the exact commands executed and their outputs or summarized logs.
- PR includes screenshots for frontend flows, curl responses for backend flows, and local smart-contract outcomes for smart-contract flows.
- PR remains Draft until QA validates locally. The human reviewer decides when to mark Ready for Review and merge.
