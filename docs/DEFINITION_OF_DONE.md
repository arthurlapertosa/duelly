# Definition of Done

A task is ready for human review only when:

- [ ] It was implemented in an independent worktree.
- [ ] The PR is open as draft.
- [ ] Commits are granular and descriptive.
- [ ] Changed behavior has tests or an explicit justification.
- [ ] `npm run validate` was executed.
- [ ] `npm test` was executed.
- [ ] `npm run qa` was executed.
- [ ] The PR contains evidence of the work.
- [ ] The PR contains risks and follow-ups.
- [ ] No secrets were committed.
- [ ] The agent did not merge.

## By area

### Frontend

- Loading, error, success, and empty states are handled.
- Primary UX avoids Web3 jargon.
- The PR documents parity with `.prototype/`, or includes an explicit human-approved deviation.
- Visual evidence is attached when applicable.

### Backend

- Endpoints, jobs, and adapters are tested.
- Logs and errors are handled.
- Secrets are provided by environment variables.

### Smartcontract

- Contract tests and edge cases are included.
- Reentrancy, states, and permissions are considered.
- Events are emitted and indexable.
- No resolution uses odds or probabilities.
