# Final MVP Architecture — Duelly

## Product scope

Duelly is a 1:1 betting MVP with deterministic outcomes, BRL1 funding, and Web3 abstraction for non-technical users.

The MVP is not a generic escrow product. It only supports predefined templates derived from Polymarket markets that can be resolved objectively. M1 uses a sports-first scope: football/soccer, ATP 250+ tennis, UFC main events, and Formula 1 races/sprints. Collectibles are outside the M1 target scope.

## Non-goals for the MVP

- No ERC-1996.
- No free-form bets.
- No disputes.
- No human intervention in normal resolution.
- No NFTs or transferable positions.
- No secondary market.
- No multi-chain support.
- No multiple stablecoins.
- No odds/probability as final result.
- No AI as final arbiter.
- No DAO/governance.

## Base monorepo

```text
frontend/       Web/mobile-first product UI.
backend/        Product APIs, accounts, wallets, Pix/on-ramp, templates, relayer, and indexing.
smartcontract/  EVM settlement, BRL1 escrow, EIP-712, ERC-2612, and Polymarket CTF resolution.
```

## User experience goal

The user should not need to understand blockchain, gas, networks, stablecoins, ERC-20, ERC-2612, EIP-712, or wallets.

Primary UX concepts:

- Login.
- Balance in BRL.
- Deposit by Pix.
- Choose a side.
- Invite opponent.
- Confirm bet.
- Wait for result.
- Receive payout.

Advanced users may use an external wallet with BRL1, but the default experience uses an embedded wallet.

## Token and funding

MVP token:

```text
BRL1 only
```

Funding model:

```text
ERC-2612 permit + transferFrom into smart contract escrow
```

The contract holds funds only after both players sign the required messages and the relayer submits a single atomic transaction. If either permit or transfer fails, the full transaction reverts.

ERC-1996 is intentionally excluded because BRL1 does not support native hold semantics in the MVP architecture and a wrapper would add unnecessary custody and delivery risk.

## Bet creation flow

A bet does not need to exist on-chain before it is fully funded.

```text
Player A chooses an allowed template.
Player A chooses stake.
System calculates loserFee.
Player A signs BetOffer with EIP-712.
Player A signs BRL1 permit with ERC-2612.
Player B opens invite link.
Player B signs BetAcceptance with EIP-712.
Player B signs BRL1 permit with ERC-2612.
Relayer submits acceptBetWithPermits(...).
Contract validates offer, acceptance, template, nonces, deadlines, and funding amounts.
Contract pulls BRL1 from both wallets.
Contract creates betId in Funded state.
```

This gives practical simultaneous funding: both deposits happen in one transaction or not at all.

## Financial model

Each participant deposits:

```text
stake + loserFee
```

Where:

```text
loserFee = stake * loserFeeBps / 10_000
```

If Player A wins:

```text
Player A receives: 2 * stake + Player A loserFee refund
Treasury receives: Player B loserFee
Player B receives: 0
```

If Player B wins:

```text
Player B receives: 2 * stake + Player B loserFee refund
Treasury receives: Player A loserFee
Player A receives: 0
```

If the market is voided, ambiguous, unresolved after timeout, or resolves into a non-binary/equal payout condition:

```text
Player A receives: stake + loserFee
Player B receives: stake + loserFee
Treasury receives: 0
```

## Templates

Templates are discovered and normalized by the backend, then registered on-chain as an allowlist entry.

A template should include:

```text
templateHash
Polymarket market id hash
conditionId
question id hash
outcome labels hash
rules hash
bettingCloseAt
resolutionDeadline
loserFeeBps
active flag
```

The contract must reject bets for templates that are not active and registered.

## Template filtering rules

Accept only:

- BRL1-denominated Duelly bets.
- Polymarket-derived templates.
- Binary markets.
- Objective and deterministic rules.
- Markets with a reliable `conditionId`.
- Markets whose final result can be checked without using price, odds, or implied probability.
- Templates frozen before users can bet.

Reject:

- Free-form bets.
- Multi-outcome markets for the MVP.
- Scalar markets.
- Negative-risk markets for the MVP.
- Markets with ambiguous rules.
- Markets based on opinion, sentiment, popularity, or subjective interpretation.
- Markets that require odds/probability as final result.
- Markets at or past the configured close cutoff.

## Polymarket usage

Polymarket is used in two different ways:

```text
Discovery: backend uses Polymarket APIs to find and normalize candidate templates.
Resolution: smart contract reads final deterministic on-chain data when possible.
```

The backend must never treat odds, outcome prices, or implied probabilities as the final result.
Funding must be blocked on-chain once the Polymarket CTF condition has a nonzero payout denominator.

Preferred resolution path:

```text
Polymarket Conditional Tokens Framework payout data
```

The backend only triggers resolution. It does not choose the winner.

## Smart contract responsibilities

The main contract is expected to be a single BRL1 escrow contract with many bets by `betId`.

Responsibilities:

- Register and deactivate templates.
- Validate EIP-712 BetOffer and BetAcceptance.
- Validate ERC-2612 permits.
- Pull BRL1 from both players atomically.
- Store funded bets.
- Resolve bets from Polymarket CTF payout data when possible.
- Pay the winner and treasury.
- Refund on void/ambiguous/expired cases.
- Emit indexable events.
- Enforce nonces, deadlines, pause, and state transitions.

Suggested states:

```text
None
Funded
Resolved
Voided
Expired
```

No partially funded state is needed in the MVP if the bet is created only after both transfers succeed.

## EIP-712 usage

EIP-712 is used for user consent and structured intent, not as the primary source of truth for final results.

Suggested signed messages:

```text
BetOffer
BetAcceptance
```

Each signed message must include enough replay protection:

- verifying contract.
- chain id.
- user nonce.
- deadline.
- template hash.
- condition id.
- stake.
- loserFee.
- outcome side.
- counterparty rules.

## Backend responsibilities

The backend is a product and automation layer. It is not the final arbiter.

Responsibilities:

- Authentication and sessions.
- Embedded wallet lifecycle.
- Pix/on-ramp integration.
- BRL1 purchase and transfer into user wallets.
- BRL1 balance display.
- Polymarket template discovery.
- Template normalization and publishing.
- Invite and offer management.
- Relayer/gas sponsor.
- Automatic resolution trigger.
- Contract event indexing.
- Notifications.
- Operational logs and audit trail.

The backend can proxy and normalize source data, but it must not resolve winners from odds or prices.

## Frontend responsibilities

The frontend should be web/mobile-first and avoid Web3 jargon in the main user flow.

Required screens/flows:

- Login.
- Deposit / balance.
- Template selection.
- Stake entry.
- Invite link.
- Opponent acceptance.
- Bet funded.
- Awaiting result.
- Result and payout.
- Error states and refund/void states.

## Resolution automation

Normal resolution should be automatic.

```text
Indexer sees funded bet.
Resolution trigger waits until the template is eligible for resolution.
Relayer calls resolveFromPolymarket(betId).
Contract checks CTF payout denominator/numerators.
Contract settles, voids, or rejects as unresolved.
Indexer updates UI state from events.
```

If on-chain data is not final yet, the function should fail or leave the bet unresolved without paying either side.

## Security requirements

Minimum MVP requirements:

- BRL1 immutable or strictly configured.
- Polymarket CTF address immutable or strictly configured.
- Template allowlist on-chain.
- Stake minimum and maximum.
- `loserFeeBps` maximum.
- Nonces per user.
- Used offer hashes.
- Funding deadline.
- Resolution deadline.
- Pause mechanism.
- Safe transfer handling.
- Reentrancy protection.
- Explicit settlement states.
- Void/refund path.
- No dependency on odds or price for final settlement.

## First-contract sketch

```solidity
enum BetStatus {
    None,
    Funded,
    Resolved,
    Voided,
    Expired
}

struct Template {
    bytes32 templateHash;
    bytes32 conditionId;
    bytes32 marketIdHash;
    bytes32 questionHash;
    bytes32 rulesHash;
    uint64 bettingCloseAt;
    uint64 resolutionDeadline;
    uint16 loserFeeBps;
    bool active;
}

struct Bet {
    address playerA;
    address playerB;
    bytes32 templateHash;
    bytes32 conditionId;
    uint8 playerAOutcomeIndex;
    uint8 playerBOutcomeIndex;
    uint256 stake;
    uint256 loserFee;
    uint64 fundedAt;
    uint64 resolutionDeadline;
    BetStatus status;
}
```

## Final architecture summary

```text
MVP: BRL1-only 1:1 bets.
Funding: ERC-2612 permits plus atomic escrow transfer.
Intent: EIP-712 BetOffer and BetAcceptance.
Templates: Polymarket-derived and allowlisted on-chain.
Resolution: automatic trigger, on-chain CTF final data when possible.
Finance: winner gets both stakes plus own loserFee refund; treasury gets loser's loserFee.
UX: embedded wallet and Pix/on-ramp by default; external BRL1 wallet supported.
Governance: no agent merge; PRs require draft flow, QA evidence, and HITL.
```
