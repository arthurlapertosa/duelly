# Fee Calculation Table

Formula:

```text
loserFee = max(stake * loserFeeBps / 10_000, minLoserFee)
```

All values are raw BRL1 units.

| Stake | loserFeeBps | minLoserFee | Result | Path |
|---:|---:|---:|---:|---|
| `100e18` | `250` | `1e18` | `2.5e18` | percentage |
| `10e18` | `250` | `3e18` | `3e18` | minimum |
| `100e18` | `250` | `0` | `2.5e18` | default test bet |

The contract rejects any signed/provided loser fee that does not exactly match the current on-chain calculation.
