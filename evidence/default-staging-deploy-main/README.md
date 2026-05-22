# Default staging deploy branch to main

## Change

- Updated `scripts/deploy/proxmox-staging-pm2.sh` so `BRANCH` defaults to `main` instead of the merged feature branch.

## QA

```bash
bash -n scripts/deploy/proxmox-staging-pm2.sh
grep -n 'BRANCH=' scripts/deploy/proxmox-staging-pm2.sh
```

Result:

```text
10:BRANCH="${BRANCH:-main}"
```

## Scope

- No frontend, backend runtime, database, or smart-contract behavior changed.
- No secrets were committed.
