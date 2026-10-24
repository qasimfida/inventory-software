# Release and recovery operations

Stage 6 is a locally validated foundation, not a production-readiness certification. Production infrastructure, load, devices, certificate management, privileged MFA and operational staffing require separate qualification. See [Stage 6 results](stage-6.md) and [platform coverage](../architecture/platforms.md).

## Release sequence

1. Preserve a verified backup and pending offline operations. Build an immutable release with `npm ci`, `npm run validate`, `npm run build:mobile`, and the relevant native desktop build. Do not ship development servers.
2. Package the backend independently: `npm run package:api -- artifacts/api-release-UNIQUE`. Use a fresh destination. In the artifact run `npm ci --omit=dev`. The package excludes development seed code and all client workspaces.
3. Inject production secrets from the deployment secret store. Set `NODE_ENV=production`, `APP_VERSION` to the release identifier, verified PostgreSQL TLS, and explicit HTTPS CORS origins. Configure a trusted CA when needed. Do not copy development env files or seed accounts. The production startup guard rejects databases carrying the immutable development fixture marker; seed execution already requires an approved local development database. Use separate migration-owner and least-privilege runtime DB roles.
4. Run the artifact's `npm run db:migrate` once under the release job. Migration 23 adds trading and accounting structures without rewriting stock, cash, or historical source transactions. Do not use down migrations against production financial data. Review database locks/timeouts on a restored copy at production scale.
5. Start the artifact with `npm start`. Check `/api/v1/health/live` and `/api/v1/health/ready`, schema migration count, login/logout and a permission-restricted business workflow. Readiness is connection health, not proof of correct schema or feature behavior.
6. Serve the built web application behind HTTPS with reviewed security/cache headers. Match the public API origin at build time. Retain previous hashed assets long enough for installed service workers. Do not clear offline vaults/outboxes during rollout. Reconcile uncertain commands before retrying after reload.
7. Monitor restricted diagnostics, migration failures, queue attempts and terminal failures, login denials, database capacity and offline conflict age. Set actual retention/archive, alert ownership, backup retention and recovery objectives before go-live. Restart workers to test leases; never delete failed financial operations to make dashboards look healthy.

API credentials and recovery secrets must not appear in CLI arguments, shell history, logs or frontend bundles. Operator password recovery uses the existing stdin-based CLI. Privileged MFA is not implemented; an external access control layer is not evidence of application MFA.

## Backup and restore drill

Use a PostgreSQL client matching the supported server version and a secure `PGSERVICE`/passfile configuration supplied by operations; file permissions must restrict access. The placeholders below are service names, not credentials. Run against an isolated restore target. A backup contains sensitive customer, credential-hash, session and financial data: encrypt storage, restrict access and test retention/deletion policies.

```sh
# Secure operator environment supplies PGSERVICE, PGPASSFILE and TLS settings.
# Restrict new backup files before writing them.
umask 077
pg_dump --format=custom --no-owner --no-acl --file=inventory-backup.dump
# PGSERVICE must now refer to a newly provisioned, isolated restore database.
pg_restore --exit-on-error --single-transaction --no-owner --no-acl --dbname=inventory_restore inventory-backup.dump
```

Never restore over the live database as a drill. Reapply reviewed least-privilege grants because the portable backup omits ownership/ACLs. The full archive restores data before its constraints/triggers are installed; do not manually disable integrity triggers for ongoing application writes. Verify migration versions, row counts and source IDs, trial-balance equality, inventory projection/ledger equality for all four quantities, source posting completeness, API startup and authorized workflows. A successful dump alone is not a successful restore.

`apps/api/src/database/restore.integration.test.ts` performs an automated populated dump/restore on disposable databases using `pg_dump`/`pg_restore` from PATH. It verifies a real sale, source journals, balances, all stock quantities and immutable journal triggers. Run it through `TEST_DATABASE_URL=<disposable-db-url> npm run test:integration`. Test fixtures contain no production data. This does not verify production backup encryption, offsite availability, point-in-time recovery, RPO/RTO or restoration of native device vaults.

For production, select managed backups or base backups plus WAL archiving when point-in-time recovery is required. Document restore authority, target time, application shutdown/cutover, session invalidation, offline device reconciliation and post-restore duplicate receipt handling. Restoring an earlier server state while devices retain later acknowledgements requires operator reconciliation; it must not silently replay settled transactions. PostgreSQL's [backup methods](https://www.postgresql.org/docs/current/backup.html) describe the operational options; the journal checks use [deferred constraint triggers](https://www.postgresql.org/docs/current/trigger-definition.html).

## External integration setup

Cash and in-app delivery are local capabilities, not configured external providers. Card payments, email/SMS/push and external accounting exports remain unsupported. Choose an approved provider and data-processing boundary before implementing an adapter. The integration status endpoint intentionally returns no credential values, model identifiers, private URLs or hidden global settings.

AI remains `AI_PROVIDER=disabled`. An API key alone cannot enable it: there is no installed provider adapter and unsupported provider selection fails startup. A future reviewed `AiProvider` adapter must validate unknown provider responses, use server-only credentials, honor AbortSignal through response reading, enforce output-token budgets, classify rate limits safely and avoid automatic retries. The current public navigation endpoint applies durable account/business quotas, runtime input/output validation and permission checks before and after the provider boundary. It receives only allowed section labels and user text; it has no database tool or mutation callback. Set the existing `AI_MODEL`, `AI_API_KEY`, `AI_TIMEOUT_MS`, and `AI_MAX_OUTPUT_TOKENS` only after that adapter is implemented and tested. Never put these secrets in `VITE_` or `EXPO_PUBLIC_` variables.

## Operator backup commands

`npm run db:backup -- backup /secure/path/unique.dump` uses `PGSERVICE`/`PGPASSFILE` (or standard PG environment variables), custom-format PostgreSQL backups and exclusive mode-0600 file creation. Existing files are never overwritten. `npm run db:backup -- restore /secure/path/unique.dump inventory_restore_unique` creates a new database and restores in one transaction; an existing target is refused. A failed new target remains available for inspection. Only restore trusted operator backups. This is a server-operator capability, not a tenant-wide database download endpoint. Managed/offsite encryption, retention and scheduled backups still require deployment configuration.

Device settings now expose encrypted local-register backup and restore on web/Tauri and native mobile. Restore validates the passphrase and vault schema, requires an unused name, and retains original operation IDs/permission expiry. Local backups do not include the server database. Do not run competing restored copies of the same unsynchronized register.

## Desktop download profiles

Build separate downloads with:

```sh
DESKTOP_API_ORIGIN=https://api.example.com npm run package:desktop:remote
DESKTOP_API_ORIGIN=https://pos.internal.example.com npm run package:desktop:local
```

Use actual configured origins. Both profiles pin their HTTPS API origin and CSP, and use distinct application identifiers/storage. The remote profile uses the hosted API and encrypted cached cash checkout during interruptions. The local-network profile uses one independently deployed NestJS/PostgreSQL server on the shop network; all terminals share that authoritative server. A single computer can host both API and desktop client. Install the API artifact (`npm run package:api`), verified PostgreSQL TLS and an HTTPS reverse proxy/certificate trusted by every device. Do not ship seed accounts, expose PostgreSQL to terminals, use a development server as a deployment, or create independent writable databases on each terminal. LAN operation does not require internet while the local API is reachable. A LAN server is not automatically synchronized to a separate remote server; cross-server replication is not implemented. Native installer signing, Windows qualification and server provisioning remain deployment prerequisites.
