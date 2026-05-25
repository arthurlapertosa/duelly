# Gamma Discovery Pagination QA

## Scope

- Backend-only pagination fix for Gamma `/events` feeds.
- No betting close-time semantics changed.
- `/markets?search` fallback remains non-paginated.

## Automated QA

- `npm --workspace backend test` passed.
  - Log: `npm-workspace-backend-test.log`
- `npm --workspace backend run qa` passed.
  - Log: `npm-workspace-backend-qa.log`
- `npm run test` passed.
  - Log: `npm-run-test.log`
- `npm run qa` passed.
  - Log: `npm-run-qa.log`
- `npm run validate` passed.
  - Log: `npm-run-validate.log`

## Local Live Gamma QA

Both probes used a local backend with live discovery enabled, no database, no chain writes, no workers, and `POLYMARKET_ALLOW_NEG_RISK=true`.

### Before (`origin/main`)

- Source: detached `origin/main` throwaway worktree.
- Summary: `local-before-origin-main-summary.json`
- Tennis totals:
  - candidates: 564
  - accepted: 41
  - rejected: 523
- Search results:
  - `q=sinner`: 0
  - `q=tabur`: 0
  - `q=garin`: 0
  - `q=tien`: 0

### After (this branch)

- Source: this worktree.
- Summary: `local-after-summary.json`
- Tennis totals:
  - candidates: 1730
  - accepted: 109
  - rejected: 1621
- Search results:
  - `q=sinner`: 1, `Roland Garros ATP: Jannik Sinner vs Clement Tabur`
  - `q=tabur`: 1, `Roland Garros ATP: Jannik Sinner vs Clement Tabur`
  - `q=garin`: 1, `Roland Garros ATP: Cristian Garin vs Learner Tien`
  - `q=tien`: 1, `Roland Garros ATP: Cristian Garin vs Learner Tien`

## Evidence Files

- Raw local endpoint responses: `local-after-tennis-q-*.raw.json`, `local-before-origin-main-tennis-q-*.raw.json`
- Query summaries: `local-after-tennis-q-*.summary.json`, `local-before-origin-main-tennis-q-*.summary.json`
- Local backend logs: `local-backend-after.log`, `local-backend-before-origin-main.log`
