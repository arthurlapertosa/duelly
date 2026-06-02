# PolygonScan Bet Receipts Evidence

## Artifacts

- `screenshots/frontend-receipts-card-mobile.png`: mobile full-page screenshot of the bet detail page showing the `Public records` receipts card.

## How This Was Produced

Backend:

```bash
PORT=3300 HOST=127.0.0.1 CHAIN_EXPLORER_BASE_URL=https://polygonscan.com \
  node --import reflect-metadata --import tsx src/server.ts
```

Frontend:

```bash
VITE_DUELLY_API_MODE=fixture VITE_API_BASE_URL=http://127.0.0.1:3300 \
  npm --workspace frontend run dev -- --port 5174
```

Browser QA:

```text
Opened http://127.0.0.1:5174/bets/bet-evidence at 390x900.
Seeded deterministic fixture receipt metadata in browser localStorage.
Captured a full-page screenshot with Playwright CLI.
```

## Verified

- Backend health returned `{"status":"ok","service":"duelly-backend"}`.
- Frontend returned `HTTP/1.1 200 OK`.
- The bet detail page rendered the `Public records` card.
- Receipt links had these attributes:
  - `Open Activation`: `https://polygonscan.com/tx/0xabababababababababababababababababababababababababababababababab`, `target="_blank"`, `rel="noreferrer"`.
  - `Open Duelly record`: `https://polygonscan.com/address/0x0000000000000000000000000000000000001002`, `target="_blank"`, `rel="noreferrer"`.

## Prototype Parity

This is a human-requested feature addition, so strict `.prototype/` parity is intentionally waived for the new receipts card.
