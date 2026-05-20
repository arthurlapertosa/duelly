# Gas Estimates

Source: `evidence/M2-T10/gas-report.log`.

## Key Contract Figures

- `BetEscrowBRL1` deployment gas: `3,327,369`.
- `BetEscrowBRL1` deployment size: `14,964` bytes.
- `acceptBetWithPermits`: min `39,696`, avg `285,814`, max `470,216` gas across tests.
- `resolveFromPolymarket`: min `28,890`, avg `84,079`, max `102,973` gas across tests.
- `expireUnresolvedBet`: min `28,879`, avg `49,994`, max `67,361` gas across tests.
- `registerTemplate`: min `32,869`, avg `181,041`, max `198,138` gas across tests.

## minLoserFee Planning

The contract does not calculate gas or token conversion on-chain. Backend/relayer operations should set `minLoserFee` to at least 3x the current estimated BRL1-equivalent gas cost for the sponsored path, using the gas report as a local baseline and live Polygon fee data in later milestones.
