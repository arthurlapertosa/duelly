# M4 Local-Fork Backend Transcript

Secrets are redacted. The root `.env` was copied into the task worktree before running backend and frontend QA.

## Service Readiness

```bash
curl -sS http://127.0.0.1:3000/health | jq -c '.'
```

```json
{"status":"ok","service":"duelly-backend","uptimeSeconds":800}
```

```bash
curl -sS http://127.0.0.1:3000/ready | jq -c '.'
```

```json
{"status":"ok","service":"duelly-backend","database":"connected"}
```

## Local-Fork Flow

Executed through Playwright with `RUN_LOCAL_FORK_E2E=1`:

```bash
VITE_API_BASE_URL=http://127.0.0.1:3000 \
RUN_LOCAL_FORK_E2E=1 \
npx playwright test test/e2e/local-fork.spec.ts --config frontend/playwright.config.ts --project chromium-mobile
```

Result:

```text
1 passed
```

## Transaction Evidence

Relayer funding attempt:

```text
request_id=relayer-d78df733-24f2-478e-837f-2f08ab408312
invite_id=invite-992159d2-685e-47f3-84c9-a59361931a96
status=succeeded
transaction_hash=0x8440a67e2fe973d0c7bf98411c1e31582b43145a139f92915551e353cb39897d
bet_id=17
```

Resolution attempt:

```text
bet_id=17
status=resolved
transaction_hash=0xfc4f8207e456261cca122bd59b704c6403c059f489d0a6a026ea96410c8cad60
block_number=87177798
```

Final API result is stored in `final-bet.json` and shows `status: "Resolved"`.
