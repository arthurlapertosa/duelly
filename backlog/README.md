# Backlog Status

The backlog status files make the milestone and task plan readable by agents and by the local backlog browser UI.

## status.json

`status.json` is the source of truth for machine-readable backlog status. It maps every milestone and task to its markdown source file and stores:

- `id`: stable machine-readable identifier.
- `title`: human-readable title.
- `description`: short summary.
- `status`: current delivery state.
- `progress`: integer from `0` to `100`.
- `markdown`: path to the source markdown file, relative to this `backlog/` directory.
- `tasks`: milestone-only list of task IDs.
- `milestone`: task-only parent milestone ID.

Agents should update `status` and `progress` when work moves forward. Do not mark work as done unless the related implementation and QA evidence are complete and human review can verify it. If a markdown checklist is partially complete, use it to estimate progress. If progress cannot be inferred, keep `progress = 0`.

Valid statuses:

- `todo`
- `in_progress`
- `blocked`
- `review`
- `done`

## Backlog server

The backlog UI is served by `server.mjs`. The server reads `status.json` and markdown files from the repository, renders the HTML page, and exposes a safe markdown endpoint for mapped files.

Run it with Node:

```bash
cd backlog
node server.mjs
```

Then open:

```text
http://localhost:8000/index.html
```

You can also choose a port:

```bash
cd backlog
node server.mjs 8080
```

Opening local HTML with `file://` is not supported for this viewer. Use the Node server so file reads happen server-side.

## Validation

From the repository root, validate the backlog manifest with:

```bash
node scripts/harness/validate-backlog-status.mjs
```

The root harness also runs this validation through:

```bash
npm run validate
```
