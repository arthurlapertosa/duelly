# State Transition Table

| Current state | Action | Allowed result |
|---|---|---|
| `None` | Funding succeeds | `Funded` |
| `None` | Funding fails at validation/permit/transfer | `None` |
| `Funded` | Strict CTF winner | `Resolved` |
| `Funded` | Ambiguous/non-strict CTF result | `Voided` |
| `Funded` | Expire before deadline | Revert |
| `Funded` | Expire after deadline while CTF denominator is still zero | `Expired` |
| `Funded` | Expire after deadline when CTF denominator is nonzero | Revert; caller must resolve or void from CTF payout shape |
| `Resolved` / `Voided` / `Expired` | Resolve or expire again | Revert |

## Pause Policy

- `pause()` blocks new funding through `acceptBetWithPermits`.
- `resolveFromPolymarket` and `expireUnresolvedBet` remain available while paused.

## Reentrancy

- Funding, resolution, and expiry are guarded by `nonReentrant`.
- `MockReentrantBRL1` attempts to reenter during token transfer and is blocked.
