# M2-T10 Evidence

## Artifacts

- `foundry-version.log`: local Foundry version.
- `forge-test.log`: full local Forge suite.
- `forge-test-vvv.log`: verbose full local Forge suite.
- `gas-report.log`: Forge gas report.
- `forge-fmt-check.log`: Solidity formatting check.
- `gas-estimates.md`: gas summary for relayer/minLoserFee planning.
- `smartcontract-workspace-test.log`: `npm --workspace @duelly/smartcontract test`.
- `smartcontract-workspace-qa.log`: `npm --workspace @duelly/smartcontract run qa`.
- `validate.log`: `npm run validate`.
- `npm-test.log`: `npm test`.
- `qa.log`: `npm run qa`.
- `qa-check-direct.log`: direct harness QA.
- `fork-test-blocked.md`: optional fork QA blocker.
- `git-diff-check.log`: whitespace diff check.
- `git-status-short.log`: working tree state at evidence capture time.
- `package-qa-setup.md`: package and CI setup summary.
- `definition-of-done-status.md`: M2 DoD status.

## Result

Pass locally. Optional Polygon fork QA was not run because `POLYGON_RPC_URL` was not set.
