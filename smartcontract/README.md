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

## M2 local stack

The M2 workspace is Foundry-based and intentionally self-contained:

- `contracts/BetEscrowBRL1.sol`: BRL1 escrow, EIP-712 consent, ERC-2612 funding, template registry, settlement, expiry, pause, and CTF resolution.
- `contracts/mocks/`: local BRL1, Polymarket CTF, and reentrancy test doubles.
- `contracts/libraries/`: local safety helpers used instead of external Solidity dependencies.
- `test/*.t.sol`: task-partitioned Foundry coverage for M2.

The contract uses raw BRL1 token units. `minLoserFee` is configured by the fee operator and should be set by backend/relayer operations to at least 3x estimated gas cost; the contract does not estimate gas.

Normal resolution only reads Conditional Tokens payout data. Strict binary full-denominator vectors resolve; ambiguous, partial, non-binary, missing, or malformed vectors void/refund. The configured CTF reader must expose outcome slot count; if slot count is unavailable, the contract treats the result shape as unverifiable and voids/refunds.

ERC-2612 permit fallback is limited to exact front-run tolerance: the escrow validates the permit signature, deadline, value, and expected nonce, and only falls back to existing allowance when the token nonce proves that exact permit nonce has already been consumed.

## QA

```bash
npm --workspace smartcontract test
cd smartcontract && forge test
```

Optional fork compatibility is read-only/local-fork only and must be gated by `POLYGON_RPC_URL`.
