# Duelly Backend

Open-source backend workspace.

## Responsibilities

- Auth.
- Wallet abstraction.
- Pix/on-ramp integration.
- BRL1 balance management.
- Polymarket template discovery and normalization.
- Invite and offer management.
- Relayer/gas sponsor.
- On-chain event indexing.
- Automatic resolution trigger.

## Core rule

The backend does not decide the winner. It triggers resolution, while the smart contract reads final on-chain result data whenever possible.

## QA

```bash
npm --workspace backend test
```
