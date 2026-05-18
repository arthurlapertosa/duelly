# M2 — Smart Contract Settlement Core

## Goal

Implement the BRL1-only escrow contract with ERC-2612 funding, EIP-712 bet consent, loserFee settlement, and automatic Polymarket CTF-based resolution.

## External dependencies

- None. All M2 work must be testable locally with mocks and optional Polygon fork QA.

## Delivery principles

- Deliver in small Draft PRs using independent worktrees.
- Every task must include tests and versioned evidence artifacts.
- Agent work is not final until human-in-the-loop review approves QA and closes the task.
- Keep implementation decisions flexible, but keep acceptance criteria and QA gates strict.

## In scope

- Foundry-based local smart-contract test environment.
- MockBRL1 implementing ERC-20 and ERC-2612 permit.
- MockPolymarketCTF supporting deterministic payout vectors.
- BetEscrowBRL1 contract with template registry, funding, settlement, void, expiry, pause, and events.
- LoserFee formula with percentage fee and gas-anchored minimum.

## Out of scope

- No public network deployment required.
- No ERC-1996 or holdable-token support.
- No multi-token support.
- No manual admin result override for MVP unless explicitly added later.

## Task plan, priorities, and dependencies

| Task | Priority | Title | Dependencies |
|---|---:|---|---|
| M2.T01 | P0 | Set up Foundry smart-contract test environment and mocks | None |
| M2.T02 | P0 | Implement BetEscrowBRL1 contract skeleton and configuration | M2.T01 |
| M2.T03 | P0 | Implement EIP-712 BetOffer and BetAcceptance validation | M2.T02 |
| M2.T04 | P0 | Implement ERC-2612 permit-based atomic funding | M2.T03 |
| M2.T05 | P0 | Implement loserFee formula with gas-anchored minimum | M2.T02, M2.T04 |
| M2.T06 | P0 | Implement on-chain template registry enforcement | M2.T02, M1.T04 approved schema or compatible local placeholder |
| M2.T07 | P0 | Implement escrow settlement and payout math | M2.T04, M2.T05, M2.T06 |
| M2.T08 | P0 | Implement automatic Polymarket CTF resolution logic | M2.T06, M2.T07 |
| M2.T09 | P0 | Implement expiry, pause, and security controls | M2.T07, M2.T08 |
| M2.T10 | P1 | Complete smart-contract QA suite and optional Polygon fork compatibility | M2.T01, M2.T02, M2.T03, M2.T04, M2.T05, M2.T06, M2.T07, M2.T08, M2.T09 |

## Milestone-level quality gates

- `cd smartcontract && forge test` passes locally.
- Funding is atomic: if either side fails, no user loses funds.
- Settlement math matches the approved loserFee model.
- CTF resolution does not read odds or probabilities.
- All critical signatures, nonces, deadlines, replay protection, and invalid states are tested.

## Milestone Definition of Done

- Contract compiles and tests pass locally.
- Unit tests cover funding, EIP-712, ERC-2612, template enforcement, settlement, void, expiry, pause, and reentrancy paths.
- Optional fork compatibility test is documented and can be run with POLYGON_RPC_URL.
- PR includes smart-contract outcome evidence and local test logs.

## Evidence requirements

- Each task stores versioned evidence under evidence/<task-id>/ and links it from the PR.
- Frontend evidence includes Playwright reports and screenshots when UI is touched.
- Backend evidence includes curl command outputs for end-to-end API validation when backend is touched.
- Smart-contract evidence includes local test outputs and state/outcome summaries when contracts are touched.
- End-to-end evidence includes combined frontend, backend, and smart-contract validation whenever all three systems are involved.
