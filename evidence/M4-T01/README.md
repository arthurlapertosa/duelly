# M4-T01 Evidence

Frontend reference and harness hardening evidence for the imported `.prototype/` baseline.

## Artifact index

- `prototype-install.log`: `npm --prefix .prototype ci`
- `prototype-build.log`: `npm --prefix .prototype run build`
- `validate.log`: `npm run validate`
- `test.log`: `npm test`
- `qa.log`: `npm run qa`
- `worktree-flow.log`: worktree, PR body generation, Draft PR dry-run, push, and PR opening flow
- `prototype-preview.stdout.log`: local `.prototype` preview server stdout
- `prototype-preview.stderr.log`: local `.prototype` preview server stderr

## Screenshot baseline

These screenshots are direct `.prototype/` baseline captures from the local preview at `http://127.0.0.1:4173`.

- `screenshots/frontend-onboarding-mobile.png`
- `screenshots/frontend-home-mobile.png`
- `screenshots/frontend-deposit-amount-mobile.png`
- `screenshots/frontend-deposit-pix-mobile.png`
- `screenshots/frontend-deposit-confirmed-mobile.png`
- `screenshots/frontend-templates-list-mobile.png`
- `screenshots/frontend-template-detail-mobile.png`
- `screenshots/frontend-create-invite-review-mobile.png`
- `screenshots/frontend-create-invite-created-mobile.png`
- `screenshots/frontend-accept-invite-review-mobile.png`
- `screenshots/frontend-accept-invite-accepted-mobile.png`
- `screenshots/frontend-bet-detail-funded-mobile.png`
- `screenshots/frontend-bets-active-mobile.png`
- `screenshots/frontend-bet-detail-resolved-mobile.png`
- `screenshots/frontend-bets-finished-mobile.png`
- `screenshots/frontend-withdraw-amount-mobile.png`
- `screenshots/frontend-withdraw-confirm-mobile.png`
- `screenshots/frontend-withdraw-complete-mobile.png`
- `screenshots/frontend-activity-mobile.png`

## Notes

- Draft PR: `https://github.com/arthurlapertosa/duelly/pull/61`
- The `.prototype/` app is a reference artifact, not a monorepo workspace.
- The repository `npm test` and `npm run qa` suites passed in this worktree.
- Backend unit/API tests passed; the repository's PostgreSQL integration test remains skipped by design in the logged output.
