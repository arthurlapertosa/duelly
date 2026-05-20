# Balance Delta Table

Let each player deposit:

```text
deposit = stake + loserFee
```

| Outcome | Player A delta after funding | Player B delta after funding | Treasury delta | Escrow balance |
|---|---:|---:|---:|---:|
| Player A wins | `+2 * stake + loserFee` | `0` | `+loserFee` | `0` |
| Player B wins | `0` | `+2 * stake + loserFee` | `+loserFee` | `0` |
| Void/refund | `+stake + loserFee` | `+stake + loserFee` | `0` | `0` |
| Expired/refund | `+stake + loserFee` | `+stake + loserFee` | `0` | `0` |

Terminal statuses are single-use. A second settlement attempt reverts because the bet is no longer `Funded`.
