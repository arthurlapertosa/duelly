# Backlog Status

The backlog status files make the milestone and task plan readable by agents and by the local backlog browser UI.

## status.json

`backlog/**/*.md` is the source of truth. Edit milestone and task markdown files when backlog scope, titles, status, progress, or acceptance details change.

`status.json` is generated from that markdown for the local backlog browser and other machine-readable tooling. Do not edit it by hand. It maps every milestone and task to its markdown source file and stores:

- `id`: stable machine-readable identifier.
- `title`: human-readable title.
- `description`: short summary.
- `status`: current delivery state.
- `progress`: integer from `0` to `100`.
- `markdown`: path to the source markdown file, relative to this `backlog/` directory.
- `tasks`: milestone-only list of task IDs.
- `milestone`: task-only parent milestone ID.

Agents should update the task markdown `**Status:**` field when work moves forward. Do not mark work as done unless the related implementation and QA evidence are complete and human review can verify it. Add an optional markdown `**Progress:** 0-100` field only when status alone is not precise enough; otherwise progress is derived deterministically from status.

Valid statuses:

- `todo`
- `in_progress`
- `blocked`
- `review`
- `done`

Markdown status aliases are normalized during generation. For example, `Planned` becomes `todo`, `In Progress` becomes `in_progress`, and `Done` becomes `done`.

Regenerate the committed manifest from the repository root with:

```bash
npm run backlog:status
```

Check for drift without writing files with:

```bash
npm run backlog:status:check
```

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

From the repository root, validate the backlog manifest structure and generated-output drift with:

```bash
node scripts/harness/validate-backlog-status.mjs
```

The root harness also checks that `status.json` matches the markdown-generated output:

```bash
npm run validate
```
