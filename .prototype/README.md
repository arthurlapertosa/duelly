# Duelly Prototype Reference

This folder is an imported snapshot of `C:\Users\carlos.fonseca\Documents\Firma\GIT\duelly-prototype`.

It is the frontend reference app for Duelly. Any future build inside `frontend/` must preserve strict 1:1 visual and structural parity with this snapshot unless a human explicitly approves a deviation in the task and PR.

## Scope

- `.prototype/` is a reference artifact, not a monorepo workspace.
- `frontend/` remains the product workspace that will eventually absorb this experience.
- Changes to `.prototype/` should be rare and intentional because they redefine the baseline the harness enforces.

## Run locally

```bash
npm --prefix .prototype ci
npm --prefix .prototype run dev
```

## Validate the snapshot

```bash
npm --prefix .prototype run build
```

## PR expectations

When a task touches frontend behavior, layout, copy, or interaction flow:

- compare the implementation directly against `.prototype/`
- capture screenshots for the touched screens and states
- document whether parity is preserved 1:1 or explicitly waived by a human
