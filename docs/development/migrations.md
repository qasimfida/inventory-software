# PostgreSQL and migration workflow

The API uses `pg` with a bounded pool, connection/query timeouts and graceful pool shutdown. `node-pg-migrate` manages ordered SQL migrations under `apps/api/migrations`. No ORM, business tables or startup auto-migrations exist. Readiness executes `SELECT 1`; it does not prove future schema-version compatibility.

1. Provision a development database and role. Copy `apps/api/.env.example`, then set `DATABASE_URL`. Do not place credentials in shell history, documentation or committed files.
2. `npm run db:create -w @inventory/api -- meaningful-name` creates an SQL migration template. Fill forward SQL and a safe reversal where possible; remove placeholder statements before review.
3. Review locks, data backfill, indexes, tenant constraints and compatibility with deployed clients. Prefer expand/migrate/contract changes. Run against a disposable database first.
4. `npm run db:migrate -w @inventory/api` applies pending migrations under the migration runner's lock and a transaction. Running it again must make no changes. With no migrations, only runner metadata may be initialized.
5. `npm run db:migrate -w @inventory/api -- down` rolls back one migration in non-production only. Production repairs use a reviewed forward migration with backup/recovery planning.

Production environment requires `DATABASE_SSL=verify-full`; certificate verification is never disabled. The URL must not contain TLS query overrides; use an appropriate trusted CA through Node's supported trust configuration when needed. Run migration commands under a separate schema-owner role, and the API under a least-privilege runtime role. No automatic schema sync or superuser runtime connection.

The migration script loads `.env` relative to the API workspace through Node's environment-file option. Configuration validation uses the same parser as the server. Errors omit credentials and SQL contents. For investigating failures, inspect local reviewed migration files and controlled database logs; never dump the entire environment.

Every schema task must test clean installation, upgrade from the preceding schema, repeat migration runs, constraints and rollback/forward recovery against real PostgreSQL. Local IndexedDB/SQLite schemas need separate versioned migration adapters that preserve unsent operations; central SQL migrations cannot substitute for them.
