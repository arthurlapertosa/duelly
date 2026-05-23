# Soccer Match Results QA Evidence

Task branch: `task/soccer-match-results-qa-rules`

## Automated QA

- `npm --workspace backend run qa`: passed; backend typecheck passed, backend tests passed with 58 passing and 3 skipped integration tests.
- `npm run validate`: passed; harness validator returned `"ok": true`.
- `npm test`: passed; root tests, frontend tests, backend tests, smartcontract node tests, and Forge tests passed.
- `npm run qa`: passed; harness self-tests, root tests, workspace tests, and Forge tests passed.

## Fork selection

- Staging Anvil check:
  `curl -X POST http://10.0.1.220:8545 ... eth_chainId`
- Result: `0x89`.
- This task did not touch contracts and did not require conditionId resolution/mirroring writes, so staging Anvil was used for real-stack QA.

## Real backend/frontend exploratory QA

- Backend started directly from `backend/` with:
  `CHAIN_RPC_URL=http://10.0.1.220:8545 POLYMARKET_DISCOVERY_MODE=live POLYMARKET_LIVE_DISCOVERY_ENABLED=true POLYMARKET_ALLOW_NEG_RISK=true POLYMARKET_MIN_BETTING_CLOSE_BUFFER_SECONDS=0 node --import reflect-metadata --import tsx src/server.ts`
- Frontend started from `frontend/` with:
  `VITE_DUELLY_API_MODE=http VITE_API_BASE_URL=http://127.0.0.1:3000 VITE_DUELLY_TEMPLATE_MODE=live npm run dev -- --host 127.0.0.1 --port 5173`
- Browser flow: created a QA account, opened Explore, selected `FOOTBALL`, searched `cruzeiro`.
- Result: displayed direct full-time result markets for `Will Cruzeiro EC win on 2026-05-24?` and `Will Cruzeiro EC vs. Associação Chapecoense de Futebol end in a draw?` above the season-winner market.
- Derivative props such as exact score, halftime, and spreads were absent from the accepted Explore list.
- Local screenshot captured at `output/playwright/soccer-cruzeiro-football-live-search.png` and not committed per screenshot artifact guidance.
- Expected console note: `GET /wallets/me/brl1` returned `404` because the QA account had no linked wallet; not related to template discovery.

## Files

- `backend-live-football-summary.json`: accepted live football summary for the Cruzeiro search case.
- `backend-rejected-cruzeiro-summary.json`: rejected live Cruzeiro derivative market examples.
