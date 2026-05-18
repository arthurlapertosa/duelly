# Backend

The backend should be open-source and operate as the product, account, integration, and automation layer. It must not be the final result arbiter.

## Responsibilities

- Auth and sessions.
- Wallet abstraction.
- Pix/on-ramp integration.
- BRL1 purchase and transfer to user wallets.
- Polymarket template discovery.
- Allowed template normalization and publishing.
- Invite and offer management.
- Relayer/gas sponsor.
- On-chain event indexing.
- Automatic `resolveFromPolymarket` trigger.
- Notifications.

## Rules

- Do not resolve bets from odds or probabilities.
- Do not decide the winner outside the contract.
- Do not store secrets in code.
- Always include tests for endpoints, jobs, and adapters.
- Record evidence in the PR.

## Minimum QA

```bash
npm --workspace backend test
npm run qa
```
