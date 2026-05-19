# M2-T04 Evidence

## Artifacts

- `funding-tests.log`: `forge test --match-path "test/*Funding*.t.sol" -vvv`.
- `atomicity-outcomes.md`: funding and rollback matrix.

## Result

Pass. Valid permits fund exactly once, invalid permit paths fail, existing allowance fallback handles permit front-run DoS, and failed taker funding reverts maker debit and bet creation.
