# Atomicity Outcomes

| Scenario | Expected result | Covered by |
|---|---|---|
| Valid maker/taker permits | Creates `betId`, escrow balance increases by `2 * (stake + loserFee)` | `test_FundingValidPermitsPullExactEscrowAndEmitBet` |
| Expired maker permit | Reverts, no bet, no escrow balance | `test_FundingExpiredPermitFailsWithoutBet` |
| Wrong spender permit | Reverts before transfer | `test_FundingWrongSpenderPermitFails` |
| Invalid permit with stale allowance | Reverts before transfer; stale allowance is not enough without a valid exact permit signature | `test_FundingInvalidPermitFailsEvenWithStaleAllowance` |
| Permit value below deposit | Reverts with `PermitValueTooLow` | `test_FundingPermitValueTooLowFails` |
| Taker insufficient balance after maker transfer attempt | Full transaction reverts; maker balance and escrow balance unchanged | `test_FundingInsufficientBalanceRevertsAtomically` |
| Permit front-run / consumed permit nonce | Continues only when the permit signature is valid, the expected nonce is exactly consumed, existing allowance is sufficient, and EIP-712 bet consent is valid | `test_FundingPermitFrontRunFallsBackToExistingAllowance` |

The contract creates the bet only after both exact balance-delta transfer checks pass.
