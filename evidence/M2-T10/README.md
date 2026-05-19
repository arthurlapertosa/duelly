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
- `polygon-rpc-block-number.log`: Polygon RPC connectivity check.
- `polygon-erc20-inspect.log`: sanitized BRL1 live-read output.
- `polymarket-condition-inspect.log`: sanitized Polymarket CTF live-read output.
- `fork-test.log`: optional Polygon fork compatibility smoke test.
- `git-diff-check.log`: whitespace diff check.
- `git-status-short.log`: working tree state at evidence capture time.
- `secret-scan.log`: exact RPC URL and Alchemy URL redaction scan.
- `package-qa-setup.md`: package and CI setup summary.
- `definition-of-done-status.md`: M2 DoD status.

## Result

Pass locally. Optional Polygon live-read and fork QA passed with sanitized RPC output.
