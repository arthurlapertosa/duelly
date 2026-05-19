# M0.T04 Evidence Convention Check

Evidence conventions are documented in `docs/EVIDENCE.md` and linked from:

- `docs/INDEX.md`
- `docs/QA.md`
- `docs/PR_WORKFLOW.md`
- `.github/pull_request_template.md`

The convention uses `evidence/<task-id>/` folders, keeps small deterministic text logs in git, and directs large binaries or browser traces to PR attachments. It also requires redaction of secrets, private keys, cookies, tokens, and personal data before committing evidence.

Validation command:

```bash
npm run validate
```

Result: see `validate.log`.
