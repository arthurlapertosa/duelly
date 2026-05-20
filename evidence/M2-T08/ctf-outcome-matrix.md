# CTF Outcome Matrix

The contract never reads odds, prices, API text, or backend-selected winners.

| CTF payout state | Contract result |
|---|---|
| `denominator == 0` | Revert unresolved; bet remains funded |
| `[denominator, 0]` over registered indexes | Outcome 0/player on outcome 0 wins |
| `[0, denominator]` over registered indexes | Outcome 1/player on outcome 1 wins |
| `[denominator, denominator]` or equal values | Void/refund |
| Partial values such as `[2, 1]` with denominator `3` | Void/refund |
| Slot count exists and is not `2` | Void/refund |
| Slot count call is unavailable | Void/refund because binary shape is not verifiable on-chain |

The read-only inspector now mirrors this strict binary interpretation instead of using a largest-numerator winner.
