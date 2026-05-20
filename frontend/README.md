# Duelly Frontend

Web/mobile-first product interface workspace.

This workspace remains a bootstrap shell in the current repository state.

The imported reference app lives in `.prototype/` and is the required 1:1 source of truth for future frontend implementation work unless a human explicitly approves divergence in the task and PR.

## Responsibilities

- Simple login.
- Bet creation and acceptance UX.
- Invite flow.
- BRL-denominated balance display.
- Bet status and result display.
- Maximum abstraction of Web3 concepts.

## QA

```bash
npm --workspace frontend test
```

## Reference app

Run the current frontend reference separately:

```bash
npm --prefix .prototype ci
npm --prefix .prototype run dev
```
