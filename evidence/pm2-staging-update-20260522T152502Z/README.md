# PM2 Staging Update Evidence

Generated on 2026-05-22 against staging host `10.0.1.220`.

## Result

- `duelly-backend` and `duelly-frontend` were moved from standalone systemd units to PM2.
- `pm2-root.service` is enabled and active for process resurrection after host reboot.
- Legacy `duelly-backend.service` and `duelly-frontend.service` are disabled and inactive.
- PostgreSQL and the persistent Anvil fork remain under systemd.
- Backend `/ready` returned `database=connected`.
- Fork RPC returned chain id `0x89`.
- PM2 process list was saved to `/root/.pm2/dump.pm2`.
- Playwright staging-fork E2E passed after sourcing the QA wallet env.

## Key Artifacts

- `pm2-status.txt`
- `pm2-status-after-playwright.txt`
- `systemctl-active.txt`
- `systemctl-enabled.txt`
- `backend-ready.json`
- `rpc-chain-id.json`
- `playwright-staging-fork-rerun.log`
- `playwright-output-rerun/staging-fork-staging-fork--c70d7-s-unresolved-market-pending-chromium-mobile/staging-fork-funded-pending.png`

## Note

The first Playwright invocation in `playwright-staging-fork.log` skipped because the launcher shell did not source the QA wallet environment. The rerun in `playwright-staging-fork-rerun.log` used the same PM2-managed services with the correct environment sourced and passed 1/1.

## Redaction

This folder was scanned locally against the root `.env` secret values for staging SSH, QA wallets, the relayer wallet, the Polygon provider URL, and the database. No matching secret values were found.
