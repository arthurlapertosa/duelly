# M2-T03 Evidence

## Artifacts

- `eip712-tests.log`: `forge test --match-path "test/*EIP712*.t.sol" -vvv`.
- `eip712-test-vectors.json`: backend-facing message schema and deterministic local test vector details.

## Result

Pass. Tests cover valid signatures, wrong signer, expired deadlines, reused nonce/offer, cancelled nonce, tampering, unauthorized taker, and same-outcome rejection.
