# Package QA Setup

## Workspace Script

`smartcontract/package.json` now runs both:

```bash
npm run test:node
npm run test:forge
```

The Forge command prepends `$HOME/.foundry/bin` to `PATH` so local Foundry installs are picked up.

## CI

`.github/workflows/qa.yml` now installs Foundry with:

```yaml
uses: foundry-rs/foundry-toolchain@v1
with:
  version: v1.7.1
```

Root `npm test` and `npm run qa` therefore fail if Solidity tests fail.

## Fork QA

Fork tests remain optional and are gated by `POLYGON_RPC_URL`. No private keys are required for the documented fork path.
