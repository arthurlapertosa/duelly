# HML Host Config Evidence

Date: 2026-05-23

Worktree:

```text
/home/arthur/lyth/worktrees/duelly-configure-staging-hosts
branch=task/configure-staging-hosts
commit=ab0c335
```

## Local QA

```text
npm run validate -> passed
npm test -> passed
npm run qa -> passed
npm --workspace frontend run build -> passed
bash -n scripts/dev/write-staging-frontend-env.sh scripts/deploy/proxmox-staging-pm2.sh -> passed
```

Frontend env generator smoke:

```text
VITE_QA_WALLET=false API_HOST=api-duelly-hml.typewith.ai VITE_ALLOWED_HOSTS=duelly-hml.typewith.ai scripts/dev/write-staging-frontend-env.sh
VITE_API_BASE_URL=https://api-duelly-hml.typewith.ai
VITE_ALLOWED_HOSTS=duelly-hml.typewith.ai
VITE_QA_WALLET=false

VITE_QA_WALLET=true QA_MAKER_PRIVATE_KEY=<throwaway> QA_TAKER_PRIVATE_KEY=<throwaway> API_HOST=api-duelly-hml.typewith.ai scripts/dev/write-staging-frontend-env.sh
VITE_API_BASE_URL=https://api-duelly-hml.typewith.ai
VITE_ALLOWED_HOSTS=duelly-hml.typewith.ai
VITE_QA_WALLET=true
VITE_QA_MAKER_PRIVATE_KEY=<redacted>
VITE_QA_TAKER_PRIVATE_KEY=<redacted>
```

## Staging Deploy

Target:

```text
root@10.0.1.220
/opt/duelly/app
```

Updated host-local `.env` keys without printing secret values:

```text
CORS_ORIGINS=present
VITE_API_BASE_URL=present
VITE_ALLOWED_HOSTS=present
env_backup=.env.backup-20260523T055032Z
```

The VM had a local tracked edit in `scripts/dev/write-staging-frontend-env.sh` before deploy. That diff was preserved on the VM at:

```text
/opt/duelly/evidence/hml-host-config-20260523T055054Z/pre-deploy-local-script.diff
```

The pushed branch includes that opt-in QA wallet behavior, so the VM checkout was moved to:

```text
remote_branch=task/configure-staging-hosts
remote_commit=ab0c335
```

Deploy command:

```bash
APP_DIR=/opt/duelly/app BRANCH=task/configure-staging-hosts scripts/deploy/proxmox-staging-pm2.sh
```

Deploy result:

```text
npm ci -> passed
frontend/.env generated with VITE_QA_WALLET=false
backend build -> passed
backend migrations -> {"ok":true,"migrationsRun":[]}
duelly-backend -> online
duelly-frontend -> online
pm2 save -> passed
```

## Smoke Checks

Remote generated frontend env, redacted:

```text
VITE_API_BASE_URL=https://api-duelly-hml.typewith.ai
VITE_ALLOWED_HOSTS=duelly-hml.typewith.ai
VITE_QA_WALLET=false
```

Remote local checks:

```text
GET http://127.0.0.1:3000/ready -> {"status":"ok","service":"duelly-backend","database":"connected"}
GET http://127.0.0.1:5173/ with Host: duelly-hml.typewith.ai -> 200
OPTIONS http://127.0.0.1:3000/health with Origin: https://duelly-hml.typewith.ai -> 204
access-control-allow-origin: https://duelly-hml.typewith.ai
access-control-allow-credentials: true
access-control-allow-methods: DELETE,GET,POST,OPTIONS
```

Public HTTPS checks:

```text
GET https://duelly-hml.typewith.ai/ -> 200
GET https://api-duelly-hml.typewith.ai/health -> {"status":"ok","service":"duelly-backend"}
OPTIONS https://api-duelly-hml.typewith.ai/health with Origin: https://duelly-hml.typewith.ai -> 204
access-control-allow-origin: https://duelly-hml.typewith.ai
access-control-allow-credentials: true
access-control-allow-methods: DELETE,GET,POST,OPTIONS
```

Frontend parity note: no user-facing layout, copy, or flow was changed; this was runtime host/env configuration only. No `.prototype` screenshot comparison was required.
