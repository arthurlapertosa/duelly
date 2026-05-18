# QA

## Required root QA

```bash
npm run validate
npm test
npm run qa
```

## Workspace QA

```bash
npm --workspace frontend test
npm --workspace backend test
npm --workspace smartcontract test
```

## PR evidence

The PR must list commands executed and their results. When UI changes, attach screenshots. When blockchain behavior changes, attach transactions, logs, calldata, or output from read-only scripts when applicable.

## Failures

If a test cannot be executed, record:

- command attempted;
- observed error;
- likely reason;
- risk;
- suggested next step.
