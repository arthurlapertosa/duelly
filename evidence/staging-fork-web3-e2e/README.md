# Staging Fork Web3 E2E Evidence

Generated on 2026-05-22 from branch `codex/staging-fork-web3-e2e`.

## Artifacts

- `deploy-staging-fork.log`: production-like Anvil fork deploy against real Polygon BRL1 and real Polymarket CTF.
- `fork-deployment-seed.json`: fake BRL1 seed evidence for QA maker/taker wallets on the fork.
- `stack-wrapper.log`, `backend.log`, `frontend.log`: local stack evidence for the staging-fork run.
- `playwright-staging-fork.log`: Playwright E2E result for the funded live-template bet flow.
- `staging-fork-funded-pending.png`: mobile screenshot showing the fork-funded bet waiting for result.
- `mirror-payout-mutation.json`: CTF payout mirror proof from latest Polygon source state into an older fork block.
- `mirror-payout-after.json`: fork-local CTF payout state after mirroring.
- `mirror-anvil.log`: Anvil log for the mirror mutation proof. The upstream Polygon RPC URL is redacted.

## Commands

```bash
nvm use 22.21.0
TMPDIR=/tmp npm --workspace backend run typecheck
TMPDIR=/tmp npm --workspace backend run test:unit
TMPDIR=/tmp npm --workspace frontend run test
TMPDIR=/tmp bash -n scripts/blockchain/deploy-staging-fork.sh scripts/dev/start-stack.sh scripts/dev/write-staging-frontend-env.sh
TMPDIR=/tmp npm run validate
TMPDIR=/tmp npm test
TMPDIR=/tmp npm run qa
TMPDIR=/tmp npm run blockchain:polymarket-mirror:self-test
git diff --check
```

## E2E Result

The Playwright staging-fork spec passed:

```text
1 [chromium-mobile] staging fork real-data flow > funds a live-template bet with fake fork BRL1 and leaves unresolved market pending
```

The live market used during this run was scheduled for 2026-05-23 20:00 UTC, so it did not resolve during the run. The funded-pending path was validated end to end in the frontend and backend, and the resolved CTF mutation path was validated separately by mirroring a known resolved ATP condition into an older fork block.

## Redaction

Evidence was scanned against the local root `.env` values for QA private keys, relayer private key, and Polygon RPC URL. No matching secret values remain in this folder.
