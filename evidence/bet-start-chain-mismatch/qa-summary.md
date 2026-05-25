# Bet Start Chain Mismatch QA

## Root Cause

MetaMask rejects EIP-712 signing when the typed-data domain `chainId` differs from the active wallet network. The bet-start flow created Polygon chain `137` payloads but did not switch the injected wallet before calling `eth_signTypedData_v4`, so accounts active on Ethereum chain `1` failed before the signature prompt.

## Commands

```bash
npm --workspace frontend test
npm --workspace frontend run typecheck
npm --workspace frontend run qa
npm run validate
npm test
npm run qa
```

## Results

- `npm --workspace frontend test`: passed, 23 tests.
- `npm --workspace frontend run typecheck`: passed.
- `npm --workspace frontend run qa`: passed. Vite emitted the existing large chunk warning.
- `npm run validate`: passed.
- `npm test`: passed root, frontend, backend, and smartcontract tests. Backend PostgreSQL integration tests were skipped by their configured guards. Forge passed with one existing Solidity mutability warning.
- `npm run qa`: passed.

## Frontend Parity

No visual UI layout changed. `.prototype` parity screenshots are not applicable for this wallet signing behavior fix.
