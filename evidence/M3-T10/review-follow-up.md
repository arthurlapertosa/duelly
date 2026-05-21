# Review Follow-Up Evidence

## Addressed PR Threads

- Split orchestration TypeORM entities into one file per entity inside `backend/src/modules/templates/persistence/entities`.
- Reduced `backend/src/routes/orchestration.routes.ts` to route registration only and moved handler implementation into `backend/src/controllers/orchestration`.

## QA Commands

- `npm --workspace @duelly/backend run typecheck`
- `npm --workspace @duelly/backend test`
- `set -a; source /home/arthur/lyth/duelly/.env; set +a; npm --workspace @duelly/backend run test:integration`
- `npm run validate`
- `npm --workspace @duelly/smartcontract test`
- `npm test`
- `npm run qa`

## Evidence Files

- `evidence/M3-T10/review-follow-up-backend-typecheck.log`
- `evidence/M3-T10/review-follow-up-backend-test.log`
- `evidence/M3-T10/review-follow-up-backend-integration-postgres.log`
- `evidence/M3-T10/review-follow-up-validate.log`
- `evidence/M3-T10/review-follow-up-smartcontract-test.log`
- `evidence/M3-T10/review-follow-up-npm-test.log`
- `evidence/M3-T10/review-follow-up-qa.log`
- `evidence/M3-T10/review-follow-up-runtime-name-scan.log`
- `evidence/M3-T10/review-follow-up-secret-scan.log`

## Result

- All QA commands passed.
- PostgreSQL integration passed with no skipped tests when the root `.env` was loaded explicitly.
- Runtime name scan for `M3`/`m3_` in `backend/src` and `backend/test` produced no matches.
- Review follow-up evidence secret scan produced no matches.
