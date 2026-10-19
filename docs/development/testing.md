# Validation and acceptance

## Available today

[README commands](../../README.md) are the canonical command reference. `validate` runs formatting, documentation/source review thresholds, ESLint/import boundaries, strict type checks including test/tooling code, tooling regression tests, Vitest, and shared/API/web builds. Set a valid `VITE_API_BASE_URL` or copy the example environment before validation. `build:mobile` separately exports Android/iOS JS bundles. `build:desktop` requires native toolchains. Do not interpret JS export as a native release build.

`npm test` first runs Node tooling regression tests (forbidden import probes and JavaScript lint enforcement), then Vitest. Vitest includes `.test.ts` and `.test.tsx`, resolves the web `@/` alias, and covers server-rendered UI state semantics, environment rejection/redaction, typed transport responses, versioned HTTP health, CORS, headers, error envelopes and request validation. Nest test compilation uses TypeScript's legacy decorators/metadata through a small pre-transform; it does not weaken application types. `test:integration` requires `TEST_DATABASE_URL` and fails explicitly without it; it queries real PostgreSQL and closes the pool. No UI E2E runner is installed because this shell has no business flow; add one with the first user workflow.

The foundation checker validates local Markdown file targets, required documents and source-size review warnings. It does not validate heading anchors or external links. Generated native/build directories are excluded. Dependency-cruiser enforces cycles, resolution and app/shared/runtime boundaries; strict shared-package configs omit DOM/Node globals. Review runtime behavior in addition to these structural checks.

Keep tests adjacent to implementations (`.test.ts`/`.test.tsx`); PostgreSQL tests use `.integration.test.ts`. Native tests need the corresponding OS/device. A future CI service should run the same commands but is not introduced under this task's scope. Record current check evidence in the [foundation audit](foundation-audit.md); the [Command 1 record](validation-status.md) is historical. never use success-only stubs for unavailable runners.

| Change             | Minimum evidence                                                                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pure domain rule   | Unit examples and boundaries; rounding, quantities and invariants where relevant                                                                                                |
| API/schema         | Runtime contract validation, authorization negatives, PostgreSQL integration; clean and upgrade migration paths                                                                 |
| Inventory/finance  | Concurrent commands, rollback, duplicate/replayed operations, allocations, reversals and oversell policy                                                                        |
| Local storage/sync | Adapter conformance: atomic data+outbox, process interruption, lost response, retry, duplicate, stale revision, reconnect, checkpoint recovery, schema upgrade, quota/full disk |
| Tenant scope       | Other-business IDs, branch/warehouse scopes, revoked membership, socket/feed authorization and RLS runtime role if enabled                                                      |
| UI workflow        | User-visible acceptance, keyboard/focus/labels, loading/empty/error/offline states; E2E for critical checkout paths                                                             |
| Native integration | Actual target OS build plus device/emulator or hardware evidence relevant to printing/scanning/storage                                                                          |

Use real PostgreSQL for SQL transaction, isolation and RLS checks; an in-memory mock cannot prove them. Contract tests run against every supported persistence adapter. Exercise persisted state across restarts, not only a network toggle. Never silently discard unsent work during test cleanup of recovery scenarios.

Feature acceptance records behavior, tenant permissions, confirmed/provisional semantics, applicable platform evidence and missing foundation blockers. Run focused checks first, then required package/production checks; repeat only when changes or failures justify it. Report skipped checks and why.
