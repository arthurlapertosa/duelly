# Frontend

Web/mobile-first interface for users unfamiliar with Web3.

## Principles

- Show balances in BRL.
- Avoid technical terms in the main flow.
- Make invite and acceptance simple.
- Confirm stake, fee, potential payout, and resolution rule.
- Show bet status clearly.

## Reference app

`.prototype/` is the imported frontend reference app.

- It is not a workspace.
- Future implementation work in `frontend/` must preserve strict 1:1 visual and structural parity with `.prototype/` unless a human explicitly approves a deviation.
- Frontend PRs should state whether parity is preserved and list the supporting screenshots.

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

## Reference evidence

When frontend work is touched, capture screenshots for the relevant states against the `.prototype/` baseline. For full-flow evidence, use the canonical mobile-first flow:

```text
onboarding
home
deposit
template selection
template detail
create invite
accept invite
bet detail funded
bet detail resolved or void
bets list
withdraw
activity
```

## Minimum QA

```bash
npm --workspace frontend test
npm run qa
```
