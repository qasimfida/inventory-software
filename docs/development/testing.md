# Validation and acceptance

## Available today

| Command                    | Meaning                                                                         |
| -------------------------- | ------------------------------------------------------------------------------- |
| `npm ci`                   | Install locked documentation tooling                                            |
| `npm run format`           | Apply Prettier                                                                  |
| `npm run format:check`     | Check deterministic formatting                                                  |
| `npm run check:foundation` | Required docs, local Markdown file links, source line limits/exception register |
| `npm run validate`         | Run both foundation checks                                                      |

The checker validates file targets, not heading anchors or external websites. It is not an application test, Markdown semantic parser, security scanner, or import-cycle checker.

## Required when executable code is introduced

Add real `lint`, `typecheck`, `test`, `test:integration`, `test:e2e` and `build` scripts as their runners exist; document applicability and platform-specific commands. No no-op/success-only replacements. `validate` must include all mandatory non-device checks appropriate to the scaffold. Add CI using the lockfile and the same commands; native jobs require their OS/toolchain.

Choose test runners with the relevant framework, not in advance. Tests should assert externally meaningful behavior, not mirror implementation. Co-locate unit tests; place cross-module integration and full workflow tests in clearly named app test directories.

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
