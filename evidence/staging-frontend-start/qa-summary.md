# Staging Frontend Start QA

## Root Cause

The staging deploy script started the public frontend with `npm run dev`. After the latest staging update, Vite's dev dependency optimizer served a broken React prebundle that called `require("scheduler")` in the browser, blanking the app before Duelly rendered.

## Fix

- Added a frontend `start` script that serves the built app with `vite preview`.
- Updated the Proxmox PM2 deploy script to build the frontend and run `npm run start -- --host 0.0.0.0 --port 5173`.
- Added a harness test so staging cannot regress to the dev server command.

## Commands

```bash
npm --workspace frontend run build
npm run test:root
npm --workspace frontend test
npm --workspace frontend run start -- --host 127.0.0.1 --port 5173
npm run validate
npm --workspace frontend run qa
npm run qa
```

## Results

- `npm --workspace frontend run build`: passed. Vite emitted the existing large chunk warning.
- `npm run test:root`: passed, 42 tests.
- `npm --workspace frontend test`: passed, 23 tests.
- Local `npm run start` smoke test: served built HTML with `/assets/...` and no `/@vite/client` or `/src/main.tsx`.
- `npm run validate`: passed.
- `npm --workspace frontend run qa`: passed. Vite emitted the existing large chunk warning.
- `npm run qa`: passed. Backend PostgreSQL integration tests were skipped by configured guards. Forge passed with one existing Solidity mutability warning.

## Staging Evidence

- Deployed branch `task/fix-staging-frontend-load` to `root@10.0.1.220`.
- Staging PM2 frontend args: `run start -- --host 0.0.0.0 --port 5173`.
- `https://duelly-hml.typewith.ai/` serves built `/assets/index-*.js` and `/assets/index-*.css`.
- Playwright loaded the public URL and rendered the sign-in screen.
- Browser console after deploy: zero errors, zero warnings.

## Frontend Parity

No UI layout, copy, or screen structure changed. `.prototype` parity screenshots are not applicable for this deployment/runtime fix.
