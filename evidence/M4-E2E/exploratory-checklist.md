# M4 Exploratory E2E Checklist

Run date: 2026-05-21.

- [x] Start local fork and deploy mock BRL1, mock CTF, and escrow.
- [x] Start backend with the copied root `.env` and local-fork deployment cache.
- [x] Start frontend with `VITE_DUELLY_API_MODE=http`.
- [x] Register/login maker and taker in separate browser contexts.
- [x] Verify both private wallets.
- [x] Confirm both wallets have enough BRL1 readiness for the selected stake.
- [x] Maker creates invite and signs both required confirmations.
- [x] Taker opens invite, accepts, and signs both required confirmations.
- [x] Relayer funds the bet; indexer exposes `Funded` to both users.
- [x] Set mock payout `[1,0]`, run resolution, reindex.
- [x] Confirm both users see final `Resolved` state and correct winner/payout presentation.
- [x] Repeat final state screenshot in `pt-BR` and `en-US`.

Final bet: `17`, invite `invite-992159d2-685e-47f3-84c9-a59361931a96`.

Artifacts:

- `final-bet.json`
- `backend-transcript-redacted.md`
- `maker-resolved-pt-BR.png`
- `maker-resolved-en-US.png`
- `taker-resolved-pt-BR.png`
- `taker-resolved-en-US.png`
