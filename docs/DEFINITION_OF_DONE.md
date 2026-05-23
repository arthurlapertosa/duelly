# Definition of Done

A task is ready for human review only when:

- [ ] It was implemented in an independent worktree.
- [ ] The PR is open as draft.
- [ ] Commits are granular and descriptive.
- [ ] Changed behavior has tests or an explicit justification.
- [ ] `npm run validate` was executed.
- [ ] `npm test` was executed.
- [ ] `npm run qa` was executed.
- [ ] Real backend plus real frontend exploratory QA was run when `frontend/` and/or `backend/` changed, or a blocker was documented.
- [ ] Fork-backed QA used staging Anvil only when allowed, otherwise a local Anvil fork was used.
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
- Real frontend exploratory QA is run against the real backend when frontend behavior changes.

### Backend

- Endpoints, jobs, and adapters are tested.
- Logs and errors are handled.
- Secrets are provided by environment variables.
- Real backend exploratory QA is run with the real frontend when backend behavior changes.

### Smartcontract

- Contract tests and edge cases are included.
- Reentrancy, states, and permissions are considered.
- Events are emitted and indexable.
- No resolution uses odds or probabilities.
- Use local Anvil when contracts change, conditionId resolution/mirroring is needed, staging Anvil is unavailable, or fork safety is ambiguous; staging Anvil `http://10.0.1.220:8545` is allowed only for reachable, read/write-safe non-contract QA that does not require condition resolution.
