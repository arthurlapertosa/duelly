# Template Events

## `TemplateRegistered`

Indexed fields:

- `templateHash`
- `conditionId`
- `marketIdHash`

Data fields:

- `questionIdHash`
- `outcomeAProviderIndex`
- `outcomeBProviderIndex`
- `bettingCloseAt`
- `resolutionDeadline`
- `loserFeeBps`
- `active`

## `TemplateDeactivated`

Indexed fields:

- `templateHash`

## Enforcement

- Registration recomputes the M1 `SportsTemplateV1` canonical hash and rejects mismatches.
- Only registered and active templates can fund bets.
- Funding rejects templates after `bettingCloseAt`.
- Binary outcome indexes are stored on-chain and must be distinct `0/1` indexes for M2 strict CTF resolution.
