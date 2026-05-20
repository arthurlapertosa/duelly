# M2-T08 Evidence

## Artifacts

- `resolution-tests.log`: `forge test --match-path "test/*Resolution*.t.sol" -vvv`.
- `ctf-outcome-matrix.md`: strict binary payout policy.

## Result

Pass. Unresolved denominator, strict outcome 0/1 wins, equal/ambiguous, partial, extra-slot, and slot-count-unavailable scenarios are covered.
