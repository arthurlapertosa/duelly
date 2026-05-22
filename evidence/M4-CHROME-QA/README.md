# M4 Chrome MetaMask QA Evidence

Date: 2026-05-21
Environment: WSL Ubuntu 24.04, Node 22.21.0, Chrome extension backend with profile `typewith.ai`.

## Service Checks

- Backend started from WSL with `npm --workspace @duelly/backend run dev` and `backend/.env` plus the local fork deployment cache loaded.
- Frontend started from WSL with `VITE_DUELLY_API_MODE=http` and `VITE_API_BASE_URL=http://127.0.0.1:3000`.
- Backend `/health`: `{"status":"ok","service":"duelly-backend"}`.
- Backend `/ready`: `{"status":"ok","service":"duelly-backend","database":"connected"}`.
- Fixture templates: `/templates?mode=fixture` returned 8 templates.
- Local fork: `cast chain-id --rpc-url http://127.0.0.1:8545` returned `137`.
- Frontend: `http://127.0.0.1:5173` served the Vite app after restart.

## Chrome And MetaMask

- The Chrome extension backend reported selected profile `typewith.ai`.
- Maker login with `local-maker@example.test` and `password-123` succeeded.
- Maker wallet readiness loaded in Chrome with address `0xd843...06cA` and BRL1 balance of `BRL 10,000.00`.
- Maker invite creation reached the real MetaMask notification flow.
- The Chrome automation backend refused direct navigation/control of the MetaMask extension URL because of its URL policy. This blocked automated clicking inside the MetaMask notification page, but it also confirms the app entered the real extension-backed wallet path rather than a Playwright stub.
- Chrome screenshot capture for the app tab timed out on `Page.captureScreenshot`; DOM snapshots and API responses were used as browser evidence instead.

## Reproduced Failures

### Stale local fork deployment cache

The first Chrome login reached the app, but `/wallets/me/brl1` returned HTTP 500. Direct contract calls showed no bytecode at the configured `BRL1_TOKEN_ADDRESS`.

Fix applied to the local environment:

- Redeployed BRL1, CTF, and DuellyEscrow on the running local fork.
- Wrote the deployment cache to both local cache locations.
- Restarted the backend with the deployment cache overriding stale `.env` addresses.

### Relayer and contract loser-fee mismatch

The API E2E flow reproduced `LOSER_FEE_MISMATCH` during taker authorization. The backend quoted the gas-anchored minimum loser fee of `3000000000000000000`, while the freshly deployed escrow still had `minLoserFee()` set to `0`.

Fix applied:

- Set the current local fork escrow `minLoserFee` to `3000000000000000000`.
- Updated `.env.example` with the fee variables used by the backend.
- Updated `docs/LOCAL_FORK_QA.md` so local fork deployment configures the same default contract minimum loser fee.

### Local QA password documentation mismatch

Runtime login and automated tests use `password-123`, while `docs/LOCAL_FORK_QA.md` still referenced `local-password-123`.

Fix applied:

- Updated the documented QA password and sample auth commands to `password-123`.

## Successful API End-to-End Flow

- Invite created: `invite-d0ce2364-6275-4133-9a21-3cd92214a33e`.
- Funded bet id: `1`.
- Funding transaction: `0x36feb73a3a35d69f269e2a1dffb42763c5c5847a55020d00078cabc478a9fe19`.
- Bet before resolution: `Funded`.
- Resolution before mock payout: pending with `ConditionUnresolved`.
- Mock payout set to maker wins.
- Resolution transaction: `0x8d4b3d46f37c83cf80a0532f1ef57e18a0e3b14e79c17efb9c08a428dd6340be`.
- Bet after reindex: `Resolved`, winner maker, winner payout `103000000000000000000`, treasury payout `3000000000000000000`.

## Chrome UI Verification

- Maker `/bets/1` resolved view in English showed `Result confirmed`, maker pick `Yes`, `You won`, amount received `R$103.00`, platform fee `R$3.00`.
- Maker `/bets/1` resolved view in Portuguese showed `Resultado confirmado`, `Voce ganhou`, amount received `R$ 103,00`, platform fee `R$ 3,00`.
- Taker `/bets/1` resolved view in English showed `Result confirmed`, taker pick `No`, `You lost`, amount received `R$0.00`, platform fee `R$3.00`.
- The pre-identified `/bets/:betId` direct-rendering risk was not reproduced: direct navigation to `/bets/1` rendered remote bet data for both maker and taker.

## QA Commands

- `npm --workspace @duelly/backend test`: passed.
- `npm --workspace frontend test`: passed.
- `npm --workspace frontend run test:e2e`: passed, 2 passed and 1 local-fork HTTP spec skipped.
- `npm run validate`: passed.
- `npm test`: passed.
- `npm run qa`: passed.

## Remaining Risks

- Full automated MetaMask button clicking was blocked by the Chrome extension backend URL policy for `chrome-extension://nkbihfbeogaeaoehlefnkodbefgpgknn/...`.
- Screenshot artifacts could not be captured from Chrome because `Page.captureScreenshot` timed out.
- Pix, deposit, and withdrawal flows were not treated as defects because they are outside M4 frontend scope.
