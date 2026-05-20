# Evidence

Every task stores reviewable evidence under a task-specific folder:

```text
evidence/<task-id>/
```

Use the backlog task id in uppercase, for example `evidence/M0-T04/`. For milestone-wide evidence, use the milestone task that owns the artifact. Do not mix evidence from unrelated tasks in one folder.

## Required contents

Each evidence folder should contain small, deterministic text artifacts whenever possible:

- `README.md`: short index of artifacts and how they were produced.
- `validate.log`: `npm run validate` output when relevant.
- `test.log`: `npm test` output when relevant.
- `qa.log`: `npm run qa` output when relevant.
- `github-settings.md`: GitHub settings summary for repository governance tasks.
- `worktree-flow.log`: worktree, PR body, Draft PR dry-run, and cleanup output for harness tasks.

## Artifact naming

Use names that identify the tool and scenario:

- Frontend screenshots: `frontend-<flow>-<viewport>.png`.
- Playwright reports: `playwright-report-<flow>.zip` or PR attachment link for large reports.
- Backend curl output: `backend-<endpoint>-curl.txt`.
- Smart-contract logs: `smartcontract-<scenario>-test.log`.
- End-to-end reports: `e2e-<scenario>-summary.md`.

## Commit versus attach

Commit small text logs and summaries that help reviewers reproduce the result. Attach large binaries, browser traces, videos, full Playwright reports, or screenshots that make the repository noisy to the PR instead. When an artifact is attached instead of committed, add a Markdown link or note in the task evidence `README.md` and the PR Evidence section.

Prototype reference and frontend parity tasks are the exception: committed screenshots under `evidence/<task-id>/screenshots/` are acceptable when they serve as the review baseline for `.prototype/`.

## Redaction

Evidence must not contain secrets, private keys, tokens, cookies, personal data, or unredacted production identifiers. Redact sensitive values before committing logs. If a command cannot be shown safely, include the command shape, the reason it was redacted, and the non-sensitive result.

## PR links

Every PR must list the evidence folder paths it uses and summarize the commands executed. If a task has no runnable QA, the evidence folder must include the attempted command, blocker, risk, and recommended next step.

If frontend is touched, the PR and evidence `README.md` should say whether the screenshots are:

- direct `.prototype/` baseline captures
- implementation-to-`.prototype/` parity captures
- human-approved deviations from `.prototype/`
