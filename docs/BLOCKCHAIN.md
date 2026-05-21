# Blockchain

## MVP scope

- Initial network: Polygon.
- Only token: BRL1.
- Funding: ERC-2612 when supported by BRL1.
- Bet custody: escrow in the smart contract.
- Offer/acceptance: EIP-712.
- Resolution: on-chain read from the Polymarket Conditional Tokens Framework when possible.
- No ERC-1996 in the MVP.

## Rules

- Do not use odds or probability as the final result.
- Do not accept markets outside the template allowlist.
- Do not accept tokens other than BRL1.
- Use `SafeERC20`, reentrancy protection, and explicit states in the final contract.
- Treat ambiguous results as void/refund in the MVP.
- Include unit and integration tests whenever on-chain behavior changes.

## Read-only scripts

```bash
node scripts/blockchain/erc20-inspect.mjs --self-test
node scripts/blockchain/polymarket-condition-inspect.mjs --self-test
```

With RPC:

```bash
node scripts/blockchain/erc20-inspect.mjs \
  --rpc-url "$POLYGON_RPC_URL" \
  --token "$BRL1_ADDRESS_POLYGON" \
  --wallet "$WALLET_ADDRESS" \
  --spender "$SPENDER_ADDRESS"

node scripts/blockchain/polymarket-condition-inspect.mjs \
  --rpc-url "$POLYGON_RPC_URL" \
  --ctf "$POLYMARKET_CTF_ADDRESS" \
  --condition-id "$POLYMARKET_CONDITION_ID"
```

## Local fork QA

Use `docs/LOCAL_FORK_QA.md` for backend plus smart-contract end-to-end testing on a local Polygon fork. The fork uses chain ID `137`, mock BRL1, mock Polymarket CTF, real EIP-712 signatures, and real ERC-2612 permits without sending live transactions.

## Minimum QA

```bash
npm --workspace smartcontract test
npm run qa
```
