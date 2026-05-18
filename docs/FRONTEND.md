# Frontend

Web/mobile-first interface for users unfamiliar with Web3.

## Principles

- Show balances in BRL.
- Avoid technical terms in the main flow.
- Make invite and acceptance simple.
- Confirm stake, fee, potential payout, and resolution rule.
- Show bet status clearly.

## Main flow

```text
login
balance / deposit
template selection
stake entry
invite
acceptance
bet funded
result
payout
```

## Terms to hide from the primary UX

- ERC-20
- ERC-2612
- EIP-712
- Polygon
- gas
- permit
- escrow

## Minimum QA

```bash
npm --workspace frontend test
npm run qa
```
