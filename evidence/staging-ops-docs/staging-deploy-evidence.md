# Staging Deploy Evidence

Date: 2026-05-22

Target: `root@10.0.1.220`

Remote evidence directory:

```text
/opt/duelly/evidence/staging-update-20260522T224238Z
```

## Deploy Summary

- Updated `/opt/duelly/app` to `origin/main` at `d9d2a14`.
- Deployed new `BetEscrowBRL1` to the running Anvil fork.
- Updated `cache/staging-fork/deployment.env`.
- Restarted backend and frontend with `scripts/deploy/proxmox-staging-pm2.sh`.

Public fork deployment:

```text
DUELLY_ESCROW_ADDRESS=0x08392055A506846C462644cfAbF14e1A68C5C7e0
DUELLY_DEPLOYMENT_BLOCK=87257820
contract_code_bytes=14518
```

## Service Verification

```text
duelly-anvil=active
pm2-root=active
duelly-backend=online
duelly-frontend=online
```

Backend:

```text
GET /health -> {"status":"ok","service":"duelly-backend"}
GET /ready -> {"status":"ok","service":"duelly-backend","database":"connected"}
```

Frontend:

```text
GET http://10.0.1.220:5173 -> HTTP 200
```

Live templates:

```text
GET /templates?mode=live&sport=tennis -> count=44
GET /templates?mode=live&sport=ufc -> count=2
```

## Documentation QA

```text
npm run validate -> passed
```

No secrets, private keys, or credential-bearing RPC URLs are included in this evidence.
