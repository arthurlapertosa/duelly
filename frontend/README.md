# Duelly Frontend

Vite + React + TypeScript implementation of the M4 wallet-first MVP experience.

`.prototype/` remains the visual and structural reference. This workspace ports the in-scope screens only: login, private wallet verification, BRL1 readiness, template selection, invite creation, invite acceptance, bet status, and result display.

## Scope Guard

M4 does not include Pix, deposits, withdrawals, platform-created wallets, brokerage flows, or Stripe flows. The UI is built for users who already have BRL1 in their own private wallet.

## Runtime

```bash
npm --workspace frontend run dev
```

Environment:

- `VITE_API_BASE_URL`, default `http://127.0.0.1:3000`
- `VITE_DUELLY_API_MODE`, `fixture` by default or `http` for the M3 backend

## QA

```bash
npm --workspace frontend test
npm --workspace frontend run test:e2e
npm --workspace frontend run qa
```

The fixture Playwright flow covers two users, one invite, acceptance, funded state, fixture resolution, and both `pt-BR` and `en-US`.
