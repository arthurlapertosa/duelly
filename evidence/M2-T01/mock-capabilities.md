# Mock Capabilities

## MockBRL1

- Mintable ERC-20 test token with 18 decimals.
- Supports `transfer`, `transferFrom`, `approve`, balances, allowances, and total supply.
- Supports ERC-2612-style `permit`, `nonces`, `PERMIT_TYPEHASH`, and `DOMAIN_SEPARATOR`.
- Used for successful funding, expired permit, wrong spender, low value, insufficient balance, and permit front-run fallback scenarios.

## MockPolymarketCTF

- Stores `payoutDenominator(conditionId)`.
- Stores `payoutNumerators(conditionId, outcomeIndex)`.
- Provides configurable `getOutcomeSlotCount(conditionId)` for strict binary-shape tests.
- Covers unresolved, outcome 0 win, outcome 1 win, equal/ambiguous, partial, extra-slot, and slot-count-unavailable scenarios.

## Reentrancy Harness

- `MockReentrantBRL1` attempts to reenter escrow during `transferFrom`.
- `test_SecurityReentrantTokenCannotEnterEscrow` confirms the escrow non-reentrancy guard blocks the callback.
