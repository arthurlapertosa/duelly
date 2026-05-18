# Duelly

Duelly is a monorepo for a 1:1 betting MVP using BRL1, Polymarket-derived templates, ERC-2612 funding, EIP-712 consent signatures, and on-chain settlement.

This bootstrap does not implement the product yet. It defines the initial repository structure, agent harness, PR workflow, monorepo folders, blockchain query scripts, and local validation commands for the first commit.

## Repository layout

```text
frontend/       Web/mobile-first product interface that hides Web3 complexity.
backend/        APIs, auth, wallet abstraction, Pix/on-ramp, templates, relayer, and indexer.
smartcontract/  EVM contracts, tests, scripts, and on-chain interfaces.
docs/           Project record, architecture, operating model, QA, and workflow documentation.
scripts/        Harness automation, QA, worktree tools, and blockchain read-only scripts.
```

## Local validation

```bash
npm run validate
npm test
npm run qa
```

Without npm, key self-tests can also be executed directly:

```bash
node scripts/harness/validate-harness.mjs
node scripts/blockchain/erc20-inspect.mjs --self-test
node scripts/blockchain/polymarket-condition-inspect.mjs --self-test
node scripts/harness/render-pr-body.mjs --self-test
```

## Operating flow

```text
human defines the task
  ↓
agent creates an isolated worktree
  ↓
agent implements with granular commits
  ↓
agent opens a draft PR
  ↓
QA runs locally from the PR worktree
  ↓
HITL reviews evidence and approves or requests changes
  ↓
human decides merge/close
```

## Final repository

```text
https://github.com/arthurlapertosa/duelly
```

## Core rules

1. Every task runs in an independent worktree.
2. Every PR starts as a draft.
3. Every PR must include evidence, Definition of Done status, and QA commands.
4. Agents never merge PRs.
5. Code only moves forward after QA/HITL approval.
6. Development and critical tasks use the best available model with reasoning/effort `xhigh`.
7. Subagents must be used whenever work is specialized, parallel, critical, or noisy.

## Quick setup

```bash
cp .env.example .env
```

Fill RPC endpoints, addresses, and integration values locally. Never commit secrets.
