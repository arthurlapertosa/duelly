# Staging Fork Prestart Restore Fix Evidence

## Commands

- `bash -n scripts/blockchain/staging-fork-prestart.sh` - passed.
- `node --test test/staging-fork-recovery.test.mjs` - passed, 8/8.
- `npm run qa` - passed.

## Staging

- Hot-patched `/opt/duelly/app/scripts/blockchain/staging-fork-prestart.sh` after the restore rehearsal exposed the prestart bug.
- Re-ran the stop/remove-state/start rehearsal.
- Verified `state-source=restored:/opt/duelly/anvil/backups/state.20260526T223349Z.json`.
- Verified Anvil chain ID `0x89`, escrow bytecode present, backup timer active, and backend/frontend PM2 processes online.
