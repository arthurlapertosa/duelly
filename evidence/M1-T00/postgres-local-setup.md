# PostgreSQL Local Setup

The validation used the already-created local PostgreSQL database provided through an untracked `.env` file. A reproducible local PostgreSQL service is also available through `compose.yaml`.

Loaded variable names:

- `DB_HOST`
- `DB_USERNAME`
- `DB_PASSWORD`
- `DB_DATABASE`
- optional `DB_PORT`

No database credentials or connection strings are committed in this evidence. The backend also supports `DATABASE_URL` as an override.

Reproducible local workflow:

```bash
docker compose up -d postgres
export DB_HOST=127.0.0.1
export DB_PORT=5432
export DB_USERNAME=duelly
export DB_PASSWORD=duelly_local
export DB_DATABASE=duelly
npm --workspace @duelly/backend run db:migration:run
npm --workspace @duelly/backend run test:integration
```
