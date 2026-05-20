# CI Backlog Sync Foundry Evidence

## Summary

The `backlog-sync` workflow failed on `main` because `validate-backlog-sync`
ran root `npm test` without installing Foundry. Root workspace tests include
`@duelly/smartcontract` and therefore execute `forge test`.

The fix adds the same `foundry-rs/foundry-toolchain@v1` setup used by the
main `qa` workflow before `npm ci` and `npm test`.

## Commands

- `npm run validate` -> `validate.log`
- `npm test` -> `test.log`
- `npm run qa` -> `qa.log`

## Results

- `npm run validate`: passed.
- `npm test`: passed, including `forge test` with 48 Solidity tests.
- `npm run qa`: passed, including harness self-tests and workspace tests.

