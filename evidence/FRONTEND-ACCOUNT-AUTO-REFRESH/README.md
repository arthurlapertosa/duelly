# Frontend Account Auto-Refresh Evidence

## Summary

- Implemented app-level authenticated account refresh for balance, bets, and pending invites.
- Visual parity note: no persistent layout or copy changes were introduced; the only visual change is a same-footprint balance skeleton inside the existing wallet card before the first balance fetch. Prototype parity screenshots are included for Home and Bets.
- Standard frontend e2e command was attempted, but `127.0.0.1:5173` was already occupied by an unrelated `/home/arthur/lyth/infra-docs` Vite server, so Playwright reused the wrong app and failed before reaching Duelly.
- Corrected fixture e2e was run against a Duelly dev server on `127.0.0.1:5174` with a temporary Playwright config and passed.
- Real backend/frontend exploratory QA passed after copying local env files from the base checkout into this worktree:
  - `/home/arthur/lyth/duelly/.env` -> `.env`
  - `/home/arthur/lyth/duelly/backend/.env` -> `backend/.env`
- The copied env files are local only, gitignored, and not committed.

## Evidence files

- `prototype-home.png`
- `prototype-bets.png`
- `frontend-real-stack-home-after-focus.png`
- `frontend-real-stack-bets-after-focus.png`
- `real-stack-account-refresh.json`

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
set -a; source .env; source backend/.env; set +a; npm --workspace backend run dev
set -a; source .env; source backend/.env; set +a; VITE_DUELLY_API_MODE=http VITE_API_BASE_URL=http://127.0.0.1:3000 npm --workspace frontend run dev -- --port 5173
node .tmp-real-stack-account-refresh-qa.mjs
npx vite .prototype --host 127.0.0.1 --port 5175 --strictPort true
node .tmp-prototype-parity-screenshots.mjs
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
- Real backend startup with copied root and backend env files: passed; server listened on `http://127.0.0.1:3000`.
- Real frontend startup against the backend: passed on `http://127.0.0.1:5173`.
- Real backend/frontend account refresh QA: passed.
  - Balance before focus refresh: `0` raw BRL1; balance after focus refresh: `0` raw BRL1.
  - Bets list before backend-side account mutation: `0`; after focus refresh: `1`.
  - Pending invites before backend-side account mutation: `0`; after focus refresh: `1`.
  - Home updated without navigation after the focus-triggered refresh.
  - Bets showed the refreshed active invite data after navigating to the Bets screen.

## Risks

- Background refreshes preserve stale data on transient failures by design, so users will not see a visible stale-data notice.
- Real-stack QA used local copied secrets from the base checkout; those env files must remain uncommitted.
