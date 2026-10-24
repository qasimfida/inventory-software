# Stage 6 — implementation and release audit

Status: implemented and locally validated on 2026-10-20. Scope exclusions and unverified deployment/device requirements below remain release blockers. No production-readiness certification is made.

## Impact map and plan

| Layer               | Existing foundation                                              | Stage 6 change                                                                                                      |
| ------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Authority           | OrganizationScope, domain-owned stock and cash commands          | Explicit bilateral trading agreements/orders; separate accounting service; no cross-tenant domain access            |
| Transactions/schema | PostgreSQL migrations, immutable ledger, idempotent commands     | Migration 23: shared consent records, shared order snapshots, accounting periods, immutable balanced journals       |
| Contracts/transport | Zod, OrganizationTransport, RetryableCommands                    | Validated trading/accounting/status contracts; same-key protected mutations                                         |
| Offline             | Encrypted cash outbox and bounded grants                         | New financial/trading/admin operations online only; existing pending operations untouched                           |
| UI                  | Lazy web panels, native panels, shared command forms             | Trading, accounting and integration/navigation help panels on web/Tauri and Expo                                    |
| Providers           | Disabled navigation AI port, in-app delivery, cash-only payments | Honest configuration/status and unavailable behavior; no unapproved external payment or AI vendor                   |
| Validation          | Vitest, real PostgreSQL/API, browser, platform builds            | Consent/tenant/state/duplicate/rollback/balancing/reversal/period tests; existing regressions and release artifacts |

Implementation sequence: contracts and persistence; authorized trading; accounting posting and reconciliation; optional assistant/status; platform consumers; regression/security/recovery checks and documentation.

## Delivered behavior

### Command 31: explicit bilateral order coordination

An authorized business owner/delegate (`business.write`, inherently unscoped) can invite another active business by an identifier obtained from that business's owner. There is no business directory lookup, name disclosure or implicit supplier/customer/catalog access. Only the invited party can accept; either party can revoke. One relationship exists per unordered business pair, and revocation is terminal in this foundation. Both parties must agree to a new design before re-establishing a revoked relationship; there is no hidden automatic reactivation.

An active relationship permits either business to act as buyer and submit immutable explicit item descriptions, quantities, agreed units, unit prices and currency. The seller accepts and confirms dispatch; the buyer confirms receipt. Either may cancel before dispatch. Both see the same snapshots and append-only history, while outsiders see no records. Versions reject stale actions; request receipts and unique buyer references prevent duplicate order creation. Revoked relationships block new orders/acceptance/dispatch but allow cancellation or receipt of previously dispatched goods. Audit writes commit with commands.

This is **order coordination**, not automated cross-company stock or settlement. The parties use their own existing sale/purchase/receiving and cash commands for physical and financial posting. Shared terms are proposals accepted by the counterparty, not authorization to use private catalog prices. Shared catalogs, automatic SKU/unit matching, partial B2B shipments, B2B taxes/discounts/invoicing and cross-company ledger posting are not implemented. The UI submits a single-line order; the validated API supports up to 50 explicit lines. Private supplier/customer records remain tenant-owned and unlinked. Status notes are explicitly shared; users are told not to include private data.

### Command 33: limited double-entry foundation

Business-wide reads require the existing `reports.read`, `payments.read`, `sales.read`, and `purchases.read` permissions. Posting additionally requires `reports.write` and `payments.write`. Store/warehouse-scoped members cannot access a business-wide ledger. Existing custom roles and seed memberships are not escalated automatically.

Migration 23 adds non-overlapping accounting periods, immutable posted headers/lines, source uniqueness, tenant-composite references, positive single-sided lines and deferred balancing checks. Entry and line insertion triggers check the whole journal at commit; historical lines cannot be appended to in a later transaction. Headers/lines cannot be updated/deleted. All money is integer minor units in `numeric(24,0)` and strings/BigInt; currencies are never combined. The fixed starter chart has cash, customer settlement/AR control, AP control, sales tax, opening equity, revenue, returns and purchases. The UI offers a two-line manual entry; the API accepts 2–50 balanced lines. Manual journals never change stock, cash-shift records or AR/AP.

Source posting is explicit and idempotent on `(business, source kind, source ID)`, independent of the command retry key. It uses each source's confirmed amounts and UTC creation date, requiring an open period. No historical entries are posted automatically. The unposted-source list and all-date trial balance support reconciliation; a page with no rows alone is not proof that all sources are posted. Zero-value source transactions require no journal and are excluded from pending records.

| Source                           | Debit                                 | Credit                                |
| -------------------------------- | ------------------------------------- | ------------------------------------- |
| Sale                             | Customer settlement/AR control, gross | Revenue, net; sales tax, tax          |
| Customer cash payment            | Cash                                  | Customer settlement/AR control        |
| Sale return/exchange return/void | Sales returns, net; sales tax, tax    | Customer settlement/AR control, gross |
| Customer cash refund             | Customer settlement/AR control        | Cash                                  |
| Supplier invoice                 | Purchases expense                     | Supplier payable control              |
| Supplier credit                  | Supplier payable control              | Purchases expense                     |
| Supplier cash payment            | Supplier payable control              | Cash                                  |
| Supplier cash refund             | Cash                                  | Supplier payable control              |

A reversal copies the exact opposite lines into a later/equal-date open period, references the original, requires a reason, and is allowed once per original. Reversal entries cannot themselves be reversed. The original stays posted and immutable; reversing a source journal does not undo its source transaction or make it eligible for automatic reposting. Review and post an explicit correcting journal where necessary. Period closure is permanent, requires an elapsed UTC period, and rejects known unposted nonzero sources. Database schema-owner changes/imports still require operational controls.

This is **not a complete accounting system**. Purchases are expensed because historical valuation does not exist; there is no inventory asset/COGS valuation, full cash-shift opening/closing reconciliation, bank feed, exchange-rate conversion, accrual engine, tax filing, customizable chart or statutory financial statements. Cash movements outside the supported source types and opening balances require reviewed manual postings. Existing source tables are unchanged. A qualified accounting policy and migration of opening balances are prerequisites for operational use.

### Commands 32 and 34: honest integration and optional assistant boundary

`GET /businesses/:businessId/integrations` reports cash-only payments, local durable in-app notifications and unconfigured AI. It exposes no secret values or hidden provider configuration. Navigation labels are filtered by current backend permissions and remain useful without AI. Web/Tauri and native panels show disabled/unavailable behavior without blocking other sections.

`POST /businesses/:businessId/integrations/assistant` accepts only a bounded navigation question and reuses the existing provider-independent port. It applies durable PostgreSQL account (20) and business (100) quotas per 15 minutes, two in-flight calls per API instance, a bounded timeout/output-token budget, strict output validation, safe 429/503 errors, no automatic retry and authorization before/after any provider call. No stock/customer/financial records, SQL tools or mutation callbacks are available to the model. Output is plain escaped text. Consequential AI actions are unsupported, so no action can bypass normal services or confirmation.

There is **no installed or verified external provider**. AI configuration remains disabled and a provider name without an adapter fails startup. Cash-only authorization is preserved. External payments, email/SMS/push and accounting exports require provider selection, an adapter, credentials and operational verification; see [setup requirements](release-operations.md#external-integration-setup). No successful external verification is fabricated.

## Security findings and fixes

- Production seed commands already refused production, but startup did not detect a copied development fixture database. `security/production-guard.ts` now refuses production startup when the immutable development fixture marker is present. It does not import seed code; the deployment artifact still excludes fixtures. Existing session/auth/recovery/rate-limit tests remain required.
- Final permission review tightened accounting writes to require the same complete financial read grants as the ledger screen, plus write grants; a custom write-only role is denied in a real database regression.
- New journal validation initially attempted BigInt conversion on malformed strings. Guarded validation now returns a normal validation failure; regression cases cover fractional, negative, exponential, malformed and oversized inputs.
- Commit-time balance checks and transaction-ID line guards prevent empty/unbalanced journals and later appends. The restore drill verifies these triggers survive backup restoration. Tests cover permissions, tenant boundaries, duplicate requests and rollback.
- The actual 320px browser check detected accounting form overflow. Feature-owned wrapping/min-width fixes preserve accessible controls and do not change global component behavior.
- No new dependencies or permissions were added. Root `npm audit` still reports 22 dependency findings (15 high, 7 moderate) in the Expo/React Native tooling graph. Reviewed [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) and [node-forge](https://github.com/advisories/GHSA-86w9-cpqp-85rv) advisories list no patched version; [uuid](https://github.com/advisories/GHSA-w5hq-g745-h8pq) has fixed newer major versions. The installed older transitive requirements and audit's framework downgrade suggestions are not silently overridden. Keep development servers isolated and qualify compatible upstream fixes before release. This remains unresolved, separately from the pruned backend artifact audit.

## Performance and limits

No charts, 3D engine, provider SDK, queue framework or new dependency was added. Web panels evaluate lazily; the existing production service worker still precaches static assets for offline shell recovery. Native feature queries wait until their section opens. List queries return at most 50 rows per collection, with bounded offsets and indexed business/source identities. Trading histories are independently paginated. Shared form descriptions and exact validation are reused across platforms.

Source-pending queries and trial-balance aggregates span historical transactions. The result payload is bounded, but production-volume latency and serialized business-row lock contention have not been load-tested. A validated incremental posting worker/period snapshots may be needed at scale; this stage uses explicit posting. No blind financial retry or last-write-wins synchronization was introduced. New operations are online only, and existing encrypted pending offline sales remain untouched.

## Files changed for this stage

- New migration: `apps/api/migrations/1794600000000_trading_accounting.sql`.
- New backend modules: `apps/api/src/trading/*`, `accounting/*`, `integrations/*`; new `security/production-guard*` and `database/restore.integration.test.ts`; module registration in `app.module.ts` and `security/security.module.ts`.
- Existing AI boundary: `ai/{templates,context,ai.service}.ts` and authorization expectation tests.
- Shared schemas: `packages/contracts/src/{trading,accounting,integrations,stage6.test,index}.ts`.
- Shared clients/forms: `packages/api-client/src/{stage6,stage6.test,trading-forms,accounting-forms,index}.ts`.
- Web feature directories `trading`, `accounting`, `integrations`; native matching directories; both workflow registries plus the web limited-access message.
- Browser workflow: `tests/manual/{stage6,organization}.mjs`; representative native accounting and web integration-status tests.
- README, AGENTS, migration README, architecture/module map, AI boundary, authorization/domain/testing guides, this audit and `release-operations.md`. `stage-5.md` received formatting only to satisfy the existing format check.

Prior-stage uncommitted files were preserved. A whole-tree diff includes that earlier work; this list identifies the Stage 6 contribution.

## Exact validation results

Environment: macOS ARM64, Node 24/npm 11, PostgreSQL 18, Chrome. Tests used disposable databases and synthetic records. Existing local data was neither reset nor reseeded. Failed intermediate checks (schema composition typing, money parsing, trigger record selection, updated navigation expectations and narrow form layout) were corrected and rerun; no security check was disabled.

| Check actually run                                                                            | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run validate`                                                                            | **PASS, exit 0**: formatting, foundation, ESLint, boundaries, strict TypeScript, 13 tooling tests, **137 unit/component tests in 68 files**, API and web builds. Six existing max-lines warnings remain; no new size exceptions. Boundary scan: 624 modules/2930 dependencies, zero violations.                                                                                                                                                            |
| `python3 /tmp/inventory-stage6-db.py`                                                         | **PASS, exit 0**: invokes API build and `npm run test:integration` with disposable PostgreSQL; **112 tests in 56 files**. Includes tenant/auth/session/recovery/rate/seed/notification/offline regressions, new consent/accounting/status tests, source reconciliation and populated `pg_dump`/`pg_restore`. Fresh 23, repeat 0, all 23 down/up migrations; compiled live/ready 200, SIGTERM within 8 seconds, redacted invalid-startup failure.           |
| `python3 /tmp/inventory-org-browser.py` → `node tests/manual/organization.mjs`                | **PASS, exit 0**: real PostgreSQL/API/Chrome workflows across organization, settings/security, catalog/prices, stock, purchasing/partial receipts/returns, transfers, customers, POS/credit/cash/refunds, AP, Stage 5 and Stage 6. New accounting exact large values/reversal, 320px layout and axe checks, lazy sections and honest disabled integration behavior. Desktop bearer/reload check is a browser simulation, not native WebView certification. |
| `python3 /tmp/inventory-offline-browser.py` → `node tests/manual/offline.mjs`                 | **PASS, exit 0**: production service-worker shell airplane-mode reload, durable cart/sale across restart, reconnect, lost committed response, same-ID replay producing one sale, blind count/review/approval and accessibility. Expected disconnected-network errors remained visible.                                                                                                                                                                     |
| `PLAYWRIGHT_CHANNEL=chrome npm run test:web:browser`                                          | **PASS, exit 0**: 5 Playwright tests covering light/dark 320/1440px layouts, keyboard/dialog behavior, axe and OS appearance preference.                                                                                                                                                                                                                                                                                                                   |
| `npm run build:mobile`                                                                        | **PASS, exit 0**: Android Hermes ~3.1 MB, iOS Hermes ~3 MB and Expo web ~1.3 MB exports. This verifies bundles, not installed native applications.                                                                                                                                                                                                                                                                                                         |
| `cargo test --locked --manifest-path apps/desktop/src-tauri/Cargo.toml`                       | **PASS, exit 0**: 2 Rust tests, including atomic SQLite state surviving reopen.                                                                                                                                                                                                                                                                                                                                                                            |
| `npm run build -w @inventory/desktop -- --bundles app`                                        | **PASS, exit 0**: macOS ARM64 `Inventory Foundation.app`, 11.54 MiB. This also restores the web build to the normal configured origin after the temporary offline harness. Signing, notarization, installer and native hardware interaction are unverified.                                                                                                                                                                                                |
| `npm run package:api -- /tmp/inventory-stage6-reviewed-runtime`; artifact `npm ci --omit=dev` | **PASS, exit 0**: independently installable API-only artifact; 145 packages installed, 151 audited, **0 advisories**. Development seed directory and client workspaces absent. A direct helper invocation outside npm initially failed because it requires npm's environment; the documented npm command above succeeded with a fresh destination.                                                                                                         |
| `python3 /tmp/inventory-stage6-artifact.py`                                                   | **PASS, exit 0**: installed artifact starts in actual production mode against isolated PostgreSQL with verified TLS using a temporary trusted test certificate; fresh 23/repeat 0 migrations, live/ready 200, security/cache headers and graceful shutdown. Insecure DB TLS and a development fixture marker both refuse startup. This is local production-mode validation, not a hosted production deployment audit.                                      |
| `node --env-file-if-exists=.env dist/database/migrate-cli.js` from `apps/api`                 | **PASS, exit 0**: one pending migration (23) applied to the existing local database. No reset/reseed.                                                                                                                                                                                                                                                                                                                                                      |
| `npm audit --json`                                                                            | **Exit 1**: 22 unresolved root/mobile-tooling advisories (15 high, 7 moderate). No dependency changes were made. Distinct from the clean pruned API artifact above.                                                                                                                                                                                                                                                                                        |
| `npm run doctor`                                                                              | **Exit 1**: Node, configured origins and Rust pass; JDK, Android SDK/adb, full Xcode and CocoaPods are missing. Windows native verification is unavailable on this host.                                                                                                                                                                                                                                                                                   |

Final web entry is **520.92 kB minified / 158.58 kB gzip**; separate Stage 6 feature chunks are approximately **1.94–3.49 kB** before gzip. The existing >500 kB entry warning remains visible, along with Vite's future config-loader warning for the extensionless `offline-shell` import. No thresholds were raised. The mobile tooling emits existing color-environment warnings. Production-scale query latency, broad browser/hardware support, MFA, remote backup/PITR objectives and real provider behavior remain unverified.

Logs: `/tmp/stage6-validate-final.log`, `/tmp/stage6-db-final.log`, `/tmp/stage6-workflows.log`, `/tmp/stage6-offline.log`, `/tmp/stage6-browser.log`, `/tmp/stage6-mobile.log`, `/tmp/stage6-rust.log`, `/tmp/stage6-desktop.log`, `/tmp/stage6-package-final.log`, `/tmp/stage6-artifact-install.log`, `/tmp/stage6-artifact.log`, `/tmp/stage6-local-migration.log`, `/tmp/stage6-dependencies.json`, `/tmp/stage6-doctor.log`. Temporary harnesses/logs are machine-local evidence; repository tests and scripts are the repeatable checks.

## Running and testing

```sh
npm ci
npm run setup
npm run dev
# Individual applications, in separate terminals with the API/database running:
npm run dev:web
npm run dev:api
npm run dev:mobile
npm run dev:desktop

npm run db:migrate -w @inventory/api
npm run validate
# Supply TEST_DATABASE_URL through a secure environment, using a disposable DB role with CREATEDB.
npm run test:integration
PLAYWRIGHT_CHANNEL=chrome npm run test:web:browser
npm run build:mobile
cargo test --locked --manifest-path apps/desktop/src-tauri/Cargo.toml
npm run build -w @inventory/desktop -- --bundles app
npm run doctor
```

Use either the combined launcher or the individual commands; starting a second API/web process on an occupied port is rejected. On Expo, press `w` for its browser preview; native installation needs the missing platform tools. `npm run android` / `npm run ios` are documented entry points once prerequisites exist. Production packaging, secret injection, backup/restore and provider setup are in the [release runbook](release-operations.md). Development-only sample accounts remain in README; no production secret was added.
