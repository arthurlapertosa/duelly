# M0.T02 GitHub Settings

Repository: `arthurlapertosa/duelly`  
Default branch: `main`  
Configured with: `gh api`

## Branch protection

`main` is protected through the GitHub branch protection API.

- Required status checks enabled.
- Strict status checks enabled, so branches must be up to date before merge.
- Required check: `monorepo-qa`.
- Required pull request reviews enabled.
- Required approvals: 1.
- Stale reviews are dismissed after new commits.
- Admin enforcement is enabled.
- Force pushes are disabled.
- Branch deletion is disabled.
- Push restrictions are unset.

## Evidence

- `gh-cli-output.txt`: `gh` auth, repository context, recent workflow runs, protection write, and protection readback.
- `branch-protection.json`: raw branch protection readback from GitHub.

## Notes

The latest default-branch workflow runs recorded before this PR were failing because executable script modes were missing. This PR restores those modes and must pass `monorepo-qa` before a human can merge it.
