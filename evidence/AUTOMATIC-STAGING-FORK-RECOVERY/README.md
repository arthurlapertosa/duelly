# Automatic Staging Fork Recovery Evidence

## Commands

- `bash -n scripts/blockchain/deploy-staging-fork.sh scripts/blockchain/staging-fork-backup.sh scripts/blockchain/staging-fork-prestart.sh scripts/blockchain/staging-fork-poststart-recover.sh scripts/blockchain/staging-pm2-restart-current-env.sh` - passed.
- `node scripts/blockchain/lib/staging-fork-recovery.mjs --self-test` - passed.
- `node --test test/staging-fork-recovery.test.mjs` - passed, 8/8.
- `npm --workspace backend test` - passed, 92 passed / 3 skipped.
- `npm run validate` - passed.
- `npm test` - passed: root 50/50, frontend 23/23, backend 92 passed / 3 skipped, smartcontract 50/50.
- `npm run qa` - passed.

## Artifacts

- `local-anvil-state-validation.md`: local Anvil state-format rehearsal proving the helper can validate a real persisted Anvil JSON state after deploying `BetEscrowBRL1`.

## Staging Rehearsal

Not executed before opening the draft PR. The branch is ready for the requested staging rehearsal after human review because it installs and restarts staging Anvil systemd jobs and can redeploy the fork escrow.

## Notes

- No frontend code changed; `.prototype/` parity is not applicable.
- No secrets, private keys, or credentialed RPC URLs are committed in this evidence.
