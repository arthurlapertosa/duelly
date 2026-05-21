# Frontend API Contract

This document captures the backend flow the MVP frontend should call. The UI should hide Web3 terms, but the implementation must sign these backend-provided payloads.

## Auth And Wallet

1. `POST /auth/register` or `POST /auth/login`.
2. `POST /wallets/challenges` with the external wallet address.
3. Ask the wallet to sign the returned message.
4. `POST /wallets/link` with `challengeId` and `signature`.
5. `GET /wallets/me/brl1` or `POST /wallets/me/funding-readiness` for balance and readiness display.

## Maker Invite Flow

1. `GET /templates/:templateId` and `POST /fees/loser-fee`.
2. `POST /invites` with `templateId`, `stake`, quoted `loserFee`, and `makerOutcomeIndex`.
3. Sign `offerPayload`.
4. Sign `makerPermitPayload`.
5. `POST /invites/:inviteId/maker-authorizations` with:

```json
{
  "offerSignature": "0x...",
  "makerPermit": {
    "value": "103000000000000000000",
    "nonce": "0",
    "deadline": "1789257600",
    "v": 27,
    "r": "0x...",
    "s": "0x..."
  }
}
```

The invite is shareable only after this response succeeds.

## Taker Invite Flow

1. `GET /invites/:inviteId`.
2. `POST /invites/:inviteId/accept` with `takerOutcomeIndex`.
3. Sign `acceptancePayload`.
4. Sign `takerPermitPayload`.
5. `POST /invites/:inviteId/taker-authorizations` with `acceptanceSignature` and `takerPermit`.

The backend stores both taker authorizations and immediately attempts funding through the relayer.

## Bet State

- Use `GET /me/bets` for authenticated user bet lists; each item includes the invite, role, template, required funding, and indexed bet when available.
- Use `GET /invites/:inviteId/bet` after funding to find the indexed on-chain bet.
- Use `GET /bets/:betId` for funded/resolved/voided state.

## Response Rules

- Draft invites are not public; `GET /invites/:inviteId` returns `404` until maker authorization is stored.
- The frontend should not hold private keys or submit them to the backend.
- The backend stores signatures and permits only; it never stores wallet private keys.
