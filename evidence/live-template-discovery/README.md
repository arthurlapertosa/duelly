# Live Tennis/UFC Template Discovery Evidence

Date: 2026-05-22
Branch: `task/fix-live-tennis-ufc-discovery`

## QA

- `npm --workspace backend run test:unit` passed: 45 tests, 0 failed.
- `npm --workspace backend run qa` passed: typecheck plus backend unit/integration tests, 45 passed, 3 skipped integration DB tests.
- `npm run validate` passed: harness validator reported `ok: true`.
- `npm test` passed: root 41 tests, frontend 13 tests, backend 45 passed plus 3 skipped integration DB tests, smartcontract 48 Forge tests.
- `npm run qa` passed: harness checks, root tests, workspace tests, and Forge tests.

## Staging-Style Live API Check

Ran a local backend with:

```bash
PORT=3100 HOST=127.0.0.1 \
POLYMARKET_DISCOVERY_MODE=live \
POLYMARKET_LIVE_DISCOVERY_ENABLED=true \
POLYMARKET_MIN_BETTING_CLOSE_BUFFER_SECONDS=0 \
POLYMARKET_DISCOVERY_MAX_RESULTS=50 \
node --import reflect-metadata --import tsx src/server.ts
```

Results against live Gamma:

- `GET /templates?mode=live&sport=tennis`: `count=89`
  - Examples included `Geneva Open: Learner Tien vs Alexander Bublik` as `ATP_250 / MATCH / TENNIS_MATCH_WINNER`.
  - Examples included `Hamburg European Open: Alex de Minaur vs Tommy Paul` as `ATP_500 / MATCH / TENNIS_MATCH_WINNER`.
- `GET /templates?mode=live&sport=ufc`: `count=3`
  - Examples included `UFC Fight Night: Song Yadong vs. Deiveson Figueiredo` as `UFC / MAIN_EVENT / UFC_MAIN_EVENT_FIGHT_WINNER`.
- `GET /templates/rejected?mode=live&sport=tennis`: `count=1080`
  - Dominant reasons: `DISALLOWED_TENNIS_MARKET_TYPE=1069`, `ATP_250_PLUS_UNSUPPORTED=42`.
- `GET /templates/rejected?mode=live&sport=ufc`: `count=697`
  - Dominant reasons: `UNSUPPORTED_EVENT_TYPE=697`, `DISALLOWED_UFC_MARKET_TYPE=586`, `NEGATIVE_RISK_UNSUPPORTED=421`.

## Browser Evidence

Used local frontend at `http://127.0.0.1:5174` with:

```bash
VITE_DUELLY_API_MODE=http \
VITE_DUELLY_TEMPLATE_MODE=live \
VITE_API_BASE_URL=http://127.0.0.1:3100 \
npm --workspace frontend run dev -- --port 5174
```

Screenshots:

- `tennis-tab.png`: Explore Tennis tab shows live accepted tennis cards.
- `ufc-tab.png`: Explore UFC tab shows live accepted UFC cards.

Frontend code and `.prototype/` were not changed.
