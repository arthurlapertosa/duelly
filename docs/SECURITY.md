# Security

## Principles

- Do not commit secrets.
- Use local `.env` files and a versioned `.env.example`.
- Prefer read-only scripts for blockchain inspection.
- Use least privilege.
- Require HITL for merge decisions.
- Record risks in the PR.

## Sensitive areas

- Wallet abstraction.
- Pix/on-ramp.
- Relayer/gas sponsor.
- EIP-712 signatures.
- ERC-2612 permits.
- Smart contract escrow.
- Treasury.

## Smart contracts

Review:

- reentrancy;
- double settlement;
- signature replay;
- nonces;
- deadlines;
- template validation;
- ambiguous-result payout;
- BRL1 transfer behavior;
- pause/refund paths.
