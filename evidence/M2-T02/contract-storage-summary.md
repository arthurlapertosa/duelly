# Contract Storage Summary

## Immutable References

- `brl1`: immutable BRL1/ERC-2612 token address.
- `polymarketCtf`: immutable Polymarket Conditional Tokens read interface.

## Administrative State

- `owner`: can administer role assignments and ownership transfer.
- `treasury`: receives loser fee on resolved bets.
- Role mappings for template publisher, fee operator, pauser, and treasury manager.
- `paused`: blocks new funding only; recovery/settlement functions remain available.

## Configuration

- `minStake`: default `1`.
- `maxStake`: default `type(uint128).max`.
- `maxLoserFeeBps`: default `1000`.
- `minLoserFee`: default `0`.

## Escrow State

- `_templates[templateHash]`: registered template enforcement data, including condition id, deadlines, fee bps, active flag, and bound binary outcome indexes.
- `_bets[betId]`: funded bet terms and terminal state.
- `nonceUsed[user][nonce]`: unordered EIP-712 replay/cancel protection.
- `usedOfferHash[offerHash]`: global offer replay protection.
- `nextBetId`: sequential funded bet id, starting at `1`.
