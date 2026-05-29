# Frontend Account Auto-Refresh Evidence

## Summary

- Implemented app-level authenticated account refresh for balance, bets, and pending invites.
- Visual parity note: no persistent layout or copy changes were introduced; the only visual change is a same-footprint balance skeleton inside the existing wallet card before the first balance fetch.
- Standard frontend e2e command was attempted, but `127.0.0.1:5173` was already occupied by an unrelated `/home/arthur/lyth/infra-docs` Vite server, so Playwright reused the wrong app and failed before reaching Duelly.
- Corrected fixture e2e was run against a Duelly dev server on `127.0.0.1:5174` with a temporary Playwright config and passed.
- Real backend/frontend exploratory QA was blocked because backend startup requires database env (`DATABASE_URL` or `DB_HOST/DB_USERNAME/DB_DATABASE`) that is not configured in this worktree.

## Commands

```bash
git pull --ff-only
scripts/harness/new-task-worktree.sh --task "frontend account auto refresh"
npm ci
npm --workspace frontend run typecheck
npm --workspace frontend test
npm --workspace frontend run qa
npm --workspace frontend run test:e2e
npm --workspace frontend run dev -- --port 5174
NODE_PATH=/home/arthur/lyth/worktrees/duelly-frontend-account-auto-refresh/node_modules npx playwright test --config /tmp/duelly-account-refresh-playwright.config.ts m4-flow.spec.ts
npm run validate
npm test
npm run qa
npm --workspace backend run dev
```

## Results

- `npm --workspace frontend run typecheck`: passed.
- `npm --workspace frontend test`: passed, 28 tests.
- `npm --workspace frontend run qa`: passed; Vite reported the existing large chunk warning.
- `npm --workspace frontend run test:e2e`: failed because Playwright reused the unrelated server already on port `5173`.
- Corrected fixture e2e on port `5174`: passed, 3 tests including the new no-navigation account refresh check.
- `npm run validate`: passed.
- `npm test`: passed, including root, frontend, backend, and forge tests.
- `npm run qa`: passed.
- `npm --workspace backend run dev`: blocked by missing DB configuration before backend startup.

## Risks

- Background refreshes preserve stale data on transient failures by design, so users will not see a visible stale-data notice.
- Real-stack exploratory QA still needs a configured local DB environment or a running approved stack before human review.
