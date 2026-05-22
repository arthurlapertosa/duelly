# M4 Frontend QA Runbook

## Fixture Frontend

```bash
npm --workspace frontend test
npm --workspace frontend run test:e2e
npm --workspace frontend run qa
```

Expected artifacts:

- `evidence/M4-T08/playwright-report/`
- `evidence/M4-T08/playwright-output/`

The fixture flow creates a maker, verifies the maker wallet, creates an invite, logs in as taker, verifies the taker wallet, accepts the invite, confirms funded state, resolves the fixture winner, and switches to English.

## HTTP / Local Fork Exploratory

Use `docs/LOCAL_FORK_QA.md` with `VITE_DUELLY_API_MODE=http` and `VITE_API_BASE_URL=http://127.0.0.1:3000`.

Evidence to attach under `evidence/M4-E2E/`:

- browser screenshots/traces for maker and taker
- backend curl transcript with secrets redacted
- funding and resolution transaction hashes
- final `GET /bets/:betId` JSON showing `Resolved`
- maker winner and taker non-winner views in both locales
