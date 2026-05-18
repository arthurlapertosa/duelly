# Monorepo

Duelly uses a monorepo with three base folders:

```text
frontend/
backend/
smartcontract/
```

## frontend/

Responsible for:

- Web/mobile-first UI.
- Simple login.
- 1:1 bet UX without exposing Web3.
- Invite flow.
- Balance display in BRL.
- Bet confirmation, status, and result.

Do not expose terms such as `gas`, `ERC-20`, `EIP-712`, `permit`, or `Polygon` to regular users unless the context is technical diagnostics or an advanced settings area.

## backend/

Responsible for:

- Authentication.
- Wallet abstraction.
- Pix/on-ramp.
- BRL1 purchase and transfer to user wallets.
- Polymarket template discovery and filtering.
- Allowed template registration.
- Relayer/gas sponsor.
- Contract event indexing.
- Automatic on-chain resolution trigger.

The backend does not decide the winner. It operates as the account, integration, proxy, indexing, and trigger layer.

## smartcontract/

Responsible for:

- BRL1 escrow.
- ERC-2612 funding.
- EIP-712 offer/acceptance.
- Template allowlist.
- Financial settlement.
- Polymarket CTF resolution reads.
- Auditable events.

The contract must reject markets outside the allowlist and must not use odds or probabilities as the final result.

## Workspace QA

Each workspace must maintain its own `test` script. Root QA runs:

```bash
npm test
npm run qa
```

Workspace changes must include workspace tests or an explicit justification in the PR.
