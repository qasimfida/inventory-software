# Backend foundation — Command 5

## Scope and responsibilities

The independently deployable NestJS modular monolith owns configuration, database, health and HTTP infrastructure. ConfigurationModule validates deployment input; DatabaseModule exports a bounded PostgreSQL service; HealthModule owns only `/api/v1/health/live` and `/api/v1/health/ready`. Shared contracts and client wire formats remain compatible, so web, mobile and desktop require no changes for this backend work. No business endpoints, authentication, entities or business migrations were introduced.

For a real feature, controllers translate validated HTTP DTOs and responses; application services orchestrate use cases and transactions; domain rules remain independent of NestJS and persistence; repositories own parameterized SQL; integration adapters implement external ports. Cross-module use goes through public application interfaces. Do not scaffold empty future modules or leak database entities into shared contracts. See the [module map](../ai/architecture-map.md) and [transaction conventions](migrations.md).

## Runtime behavior

Invalid configuration fails before listening with a safe structured startup event. A valid configuration with an unavailable database still permits liveness; readiness returns 503 until PostgreSQL responds. Readiness checks connectivity, not future schema compatibility. The app uses verified TLS in production, explicit CORS origins, Helmet, bounded JSON/form bodies, DTO validation with unknown fields rejected, stable safe error envelopes and server-generated request IDs. HTTP logs contain method, status, duration and request ID, never URL queries, request bodies, headers or raw exceptions.

JSON logging defensively redacts sensitive keys, connection URLs, bearer values and Error objects. Redaction supplements the allowlist at log sites; it is not permission to log arbitrary user data. Unexpected startup/database failures omit raw driver details. Diagnose them using controlled infrastructure logs and reviewed configuration, not environment dumps.

SIGTERM/SIGINT begins draining: readiness becomes false and new database operations are rejected, HTTP connections close, then the pool ends. Existing transaction callbacks retain their connection until completion. A configurable unreferenced shutdown deadline terminates a stuck process. HTTP request/header timeouts bound request reception, not arbitrary application computation. Statement and idle-transaction timeouts bound database work. Deployment termination grace must exceed `SHUTDOWN_TIMEOUT_MS`.

All API environment examples document resource limits. Development binds loopback and keeps PostgreSQL isolated; production secrets are injected and verified TLS is mandatory. Runtime and migration roles should have separate privileges. No secrets belong in logs, committed env files or deployment artifacts.

## Validation

Validation results are recorded below after executing the checks. Tests require a disposable database via `TEST_DATABASE_URL`; integration fixtures use unique schemas and clean them up. Checked-in migrations contain no business SQL. The production TLS configuration is validated, but a production database/certificate deployment is outside this local test environment.

Executed locally on 2026-10-19:

| Check                                                               | Result                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run validate`                                                  | Passed: formatting, 25 documentation/74 source foundation checks, lint, dependency rules (95 modules / 197 dependencies), all workspace and test TypeScript checks, 12 tooling tests, 29 Vitest tests across 11 files, API/shared/web builds |
| `npm run test:integration` with disposable PostgreSQL 18            | 2 tests passed: scoped transactions, rollback, parameter binding, timeout recovery, draining, ordered migrations, repeat run, rollback, atomic failure and production rollback rejection                                                     |
| Compiled migration CLI, twice against disposable PostgreSQL         | Both succeeded with 0 pending migrations; only migration metadata initialized                                                                                                                                                                |
| Compiled API with disposable PostgreSQL                             | Live and ready returned HTTP 200; SIGTERM exited within the 8-second check deadline; invalid configuration exited nonzero without disclosing the invalid value                                                                               |
| `npm run package:api -- /tmp/inventory-api-stage5-runtime`          | Passed; artifact created outside the repository                                                                                                                                                                                              |
| Artifact `npm ci --omit=dev --ignore-scripts --no-audit --no-fund`  | 144 runtime packages installed; compiled migration CLI succeeded twice against PostgreSQL without development dependencies; artifact API live/ready and SIGTERM checks passed                                                                |
| Artifact `npm run db:migrate -- down` with production configuration | Correctly rejected; production policy cannot be bypassed by a test NODE_ENV                                                                                                                                                                  |
| `git diff --check`                                                  | Passed                                                                                                                                                                                                                                       |

Both disposable PostgreSQL clusters were stopped and deleted. Existing local databases were not modified. Production certificate connectivity, production role provisioning, concurrent deployment orchestration and forced shutdown under sustained traffic were not exercised. Native app builds were not rerun for this backend-only change; shared/client type checks and web build passed. There are no local blockers for the backend foundation. Deployment-specific database access, trusted certificates, least-privilege roles and injected secrets remain required.
