# Duelly Smart Contract

EVM contract workspace.

## Responsibilities

- BRL1 escrow.
- ERC-2612 funding.
- EIP-712 offer/accept signatures.
- Template allowlist.
- Polymarket CTF resolution.
- Financial settlement with `loserFee`.

## Initial structure

```text
contracts/   Solidity contracts
interfaces/  external interfaces
scripts/     future deploy/inspection scripts
test/        tests
```

## QA

```bash
npm --workspace smartcontract test
```

When the Solidity stack is added, include `forge test` or an equivalent command in workspace QA.
