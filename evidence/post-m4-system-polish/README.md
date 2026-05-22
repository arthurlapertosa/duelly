# Evidence — Post-M4 system polish + real-chain E2E

Branch: `task/post-m4-system-polish-and-realchain-e2e`

## What this task did

After M4 (frontend MVP) merged, a full Playwright-driven review found the app
worked but was raw: a 1128-line single-file UI, no design system, near-zero
animation, several bugs, and no way to drive http mode end-to-end. This task:

1. **Wired real-chain E2E** — a QA private-key wallet adapter so http mode can
   be exercised against the live backend + anvil fork without a browser
   extension; a one-command dev-stack script; an env-gated real-chain spec.
2. **Overhauled the frontend** — split the monolith into screens/components,
   built a design-system + UI primitives, added a Framer Motion layer, polished
   every flow, and fixed the P0 bugs.

## Changed files (63 files, +3925 / -1164 vs `main`)

- `frontend/src/app/`, `screens/`, `components/`, `components/ui/` — the old
  `App.tsx` monolith split into modular screens, domain components, and 10
  reusable UI primitives.
- `frontend/src/lib/wallet.ts` — new QA private-key wallet adapter
  (`VITE_QA_WALLET`), signing real EIP-712 + ERC-2612 payloads.
- `frontend/src/lib/motion.ts`, `useMotion.ts` — shared motion variants,
  `prefers-reduced-motion` aware.
- `frontend/src/index.css` — extended design tokens (color/elevation/radius).
- `frontend/public/favicon.svg`, `manifest.webmanifest` — fix favicon 404, add
  PWA manifest.
- `scripts/dev/start-stack.sh`, `package.json` — one-command local stack.
- `frontend/.env.example` — documents the API + QA-wallet env vars.
- `frontend/test/e2e/m4-realchain.spec.ts` — env-gated real-chain smoke test.

## Why

The M4 review (see `docs`/PR description) found the UI too raw to ship-feel and
no automated path to validate on-chain settlement from the browser.

## Tests executed

| Command | Result |
|---|---|
| `npm run validate` (root harness) | ok |
| `npm test` (root: frontend 13, backend 19, smartcontract 48, root 1) | all pass |
| `npm run qa` (root) | `[qa] ok` |
| `frontend` typecheck / unit / build | pass / 13 pass / built ok |
| `frontend` `npm run test:e2e` (fixture) | 2 passed, 2 env-gated skipped |
| `frontend` real-chain e2e (`DUELLY_E2E_MODE=realchain`) | 1 passed |

## Real-chain settlement — validated on the anvil fork (chain 137)

The full path was driven through the redesigned UI against the live backend:

- On-chain BRL1 balance read into the UI (QA maker R$10,050.00, QA taker R$9,894.00).
- Invite created with a real EIP-712 offer + ERC-2612 permit signature.
- Taker accepted with real signatures; relayer funded on-chain
  (`acceptBetWithPermits`, e.g. tx `0x978fc74b…`, invite → `funded`).
- Resolution read the CTF payout and settled on-chain (tx `0x27b471bd…`):
  bet `Resolved`, winner correct, payout 103 BRL1, treasury fee 3 BRL1.

See `real-chain/` screenshots.

## Screenshots

- `before/` — the raw post-M4 UI (onboarding, home, templates, template
  detail, the duplicate pending-invite bug, the pt-BR header collision).
- `after/` — the redesigned UI (home, templates, template detail, logout
  confirm dialog, funded bet with fenced QA controls, win celebration, pt-BR).
- `real-chain/` — funded + resolved bet driven in http mode.

## `.prototype/` parity

Parity with `.prototype/` is **explicitly waived**. The user (human) directed a
full UI/UX overhaul of the post-M4 app; this divergence is the intended outcome
of that instruction, not an accident.

## Definition of Done

- [x] Implemented in an independent worktree.
- [x] PR opened as draft.
- [x] Granular, descriptive commits (13).
- [x] Changed behavior covered by tests (unit + fixture e2e + real-chain e2e).
- [x] `npm run validate` executed.
- [x] `npm test` executed.
- [x] `npm run qa` executed.
- [x] Evidence included (this folder).
- [x] Risks and follow-ups documented (below).
- [x] No secrets committed (`.env` is gitignored; only `.env.example` with
      empty placeholders is committed).
- [x] Agent did not merge.
- Frontend states (loading/error/success/empty) handled; primary UX avoids
  Web3 jargon.

## Risks & follow-ups

- **Template content i18n**: template titles/rules still render in English in
  pt-BR because they come from backend (Polymarket) data. Generic outcome
  labels (Yes/No → Sim/Não) are localized at render time; full content i18n is
  a backend follow-up (noted in code).
- **M3.5 funding gap**: a user with 0 BRL1 still has no in-app funding path —
  this is the unimplemented M3.5 (Pix on-ramp). The empty-wallet state is now
  honest but still a dead-end until M3.5 lands.
- **`getBet` before indexing**: the bet-detail screen can call `GET /bets/:id`
  before the indexer has the bet (404, swallowed); it relies on the summary in
  the meantime. A retry/poll would be cleaner — backend/indexer follow-up.
- **QA wallet adapter** is local/QA only; it must never be enabled in a
  production build (keys would be bundled). Gated by `VITE_QA_WALLET`, off by
  default in `.env.example`.
- The real-chain e2e spec assumes the `LOCAL_FORK_QA` users exist with wallets
  linked; it is env-gated and skipped by default.
