# Module and directory map

The paths in this table exist. Organization management, catalog/pricing, inventory, purchasing, storage and transfers are implemented. Customers, sales and cash payment modules are also implemented. Offline cash/sync, stock counts and scanning are implemented. A limited double-entry/source-posting foundation is implemented in Stage 6; external payment providers remain unconfigured.

| Actual path                          | Responsibility / consumers                                                                                              |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/app`                   | Hash router, lazy foundation page and route error handling; desktop reuses this build                                   |
| `apps/web/src/components/ui`         | shadcn Button primitive                                                                                                 |
| `apps/web/src/components/common`     | Loading, empty, error and retry states                                                                                  |
| `apps/web/src/features/foundation`   | Non-business API connection check                                                                                       |
| `apps/api/src/auth`                  | Invitation onboarding, account status, session persistence, default-protected routes and abuse limits                   |
| `apps/api/src/development`           | Explicit local account seed CLI; never imported by API runtime modules; excluded from deployment artifacts              |
| `apps/api/src/catalog`               | Business-scoped product identity, category hierarchy, identifier uniqueness and paginated catalog queries               |
| `apps/web/src/features/catalog`      | Catalog/category forms and keyboard scanner lookup, reused by desktop                                                   |
| `apps/mobile/src/catalog`            | Native catalog/category controls and platform-isolated camera barcode scanner                                           |
| `apps/api/src/organization`          | Business ownership, scoped membership roles, stores/branches, warehouses, terminal registration and transactional audit |
| `apps/web/src/features/organization` | Online management screens, reused by desktop                                                                            |
| `apps/mobile/src/organization`       | Equivalent native management screens                                                                                    |
| `apps/api/src/config`                | Environment parsing and production policy                                                                               |
| `apps/api/src/http`                  | Request validation, safe errors, headers/CORS and structured request logging                                            |
| `apps/api/src/database`              | PostgreSQL pool, scoped transactions, compiled migration runner and readiness                                           |
| `apps/api/src/logging`               | JSON logging and defensive sensitive-data redaction                                                                     |
| `apps/api/src/health`                | Versioned live/ready endpoints                                                                                          |
| `apps/api/migrations`                | Migration directory; authentication and organization schema                                                             |
| `apps/mobile/src`                    | Native shell, theme and API connection check                                                                            |
| `apps/desktop/src-tauri`             | Rust/Tauri host, packaging, CSP and isolated SQLite vault IPC                                                           |
| `packages/domain/src`                | Platform-free exact decimal, currency and unit-conversion rules                                                         |
| `packages/contracts/src`             | Health, authentication and organization runtime schemas / wire types                                                    |
| `packages/api-client/src`            | Authenticated transport, organization client/view model, health response validation and safe errors                     |
| Root configuration / `scripts`       | Shared TS strictness, ESLint, Prettier, Vitest, import boundaries and documentation checks                              |

| `apps/api/src/inventory` | Public LedgerCore/ReservationCore, immutable movements, transactional balances, manual commands and reconciliation |
| `apps/api/src/purchasing` | Supplier profiles, purchase drafts/transitions, partial receiving/returns and invoice references |
| `apps/api/src/storage` | Ranked location hierarchy, capacity/notes/photo metadata and paired ledger moves |
| `apps/api/src/transfers` | Authorized drafts, reservations, dispatch, receipt/discrepancy and cancellation lifecycle |
| `apps/web/src/features/inventory`, `purchasing`, `storage`, `transfers` | Online DOM workflows reused by Tauri |
| `apps/mobile/src/inventory`, `purchasing`, `storage`, `transfers` | Equivalent native controls consuming shared application form metadata |

Actual graph: API → contracts/domain; web/mobile → api-client → contracts/domain; desktop → web build artifact. Shared packages build to ESM `dist` with declarations and explicit exports; application build hooks compile shared dependencies automatically. No cross-app source imports. Domain is implemented; additional client-core/platform packages will be created only when needed; their planned dependency rules follow below.

Future frontend features use `features/<feature>/{components,hooks,services,types}` as applicable. Future backend business modules use `apps/api/src/modules/<module>` with public application interfaces and private persistence. Pure rules live in `packages/domain`; device implementations in dedicated platform packages when a real interface exists.

## Proposed domain ownership

| Module                      | Authoritative responsibility / public operations                               | Allowed collaborators                |
| --------------------------- | ------------------------------------------------------------------------------ | ------------------------------------ |
| Identity/access             | Accounts, invitations and sessions; organization module owns memberships/roles | Organization scopes                  |
| Organizations (implemented) | Businesses, memberships, stores/branches, warehouses, terminals and audit      | None                                 |
| Catalog                     | Products, variants, units, barcodes, versioned prices                          | Organization scope                   |
| Locations                   | Zones, shelves, racks and bins within warehouses                               | Organizations                        |
| Inventory                   | Stock movements, balances, reservations, count adjustments                     | Catalog references, locations        |
| Parties                     | Customer/supplier identities and terms                                         | Organizations                        |
| Finance                     | Payments, allocations, receivables/payables, credit and reversals              | Parties                              |
| Sales/POS                   | Sale/return documents, checkout orchestration, cash sessions                   | Catalog, inventory, parties, finance |
| Purchasing                  | Purchase/receipt documents and supplier obligations                            | Catalog, inventory, parties, finance |
| Transfers/trading           | Dispatch/receipt workflow; separate commercial documents across owners         | Inventory, sales, purchasing         |
| Reporting                   | Rebuildable authorized read projections, analytics                             | Read interfaces/change records only  |
| Notifications/realtime      | Delivery and invalidation hints                                                | Committed change records only        |
| Synchronization             | Operation receipts, checkpoints, authorized command routing/feed               | Public business interfaces only      |
| Platform integrations       | Device/storage implementations                                                 | Shared ports/contracts only          |

## Dependency rules

Dependencies follow the table, never reverse it. Identity/tenant enforcement is applied at application boundaries, not by coupling every domain package to an authentication framework. Finance records source document IDs without importing sales/purchasing implementations. Inventory similarly references source IDs without importing its callers.

UI → client-core/domain/contracts; platform adapters implement client-core ports; composition roots inject adapters. API → domain/contracts plus owning persistence implementations. Domain imports no NestJS, React, browser, native, or database APIs. Apps never import another app's internals; the desktop host may consume the web build artifact.

Cross-module calls use explicit public application interfaces; never import another module's repository or write its tables. A top-level workflow owns transactions across participants. Public DTOs expose no ORM entities. Avoid barrel chains, side-effectful index files, cycles and `forwardRef` as an architectural escape. Dependency-cruiser checks these boundaries against source imports, and negative probes verify enforcement. When a cycle appears, move orchestration upward or extract a genuinely shared pure concept.

PostgreSQL is authoritative for confirmed facts. Local databases own unsent operations and provisional projections; caches and sockets are never independent business authorities. Update this map whenever ownership, public interfaces, dependencies or actual paths change.

Module calls use public application interfaces: OrganizationScope/LocationAccess → CatalogAccess/PricingService → LedgerCore/ReservationCore → purchasing/storage/transfers. Owning modules retain repository writes. All business operations reuse the authenticated organization transaction; no client business ID is sufficient authorization.

Commerce ownership: `apps/api/src/customers` owns scoped profiles, credit policy, immutable receivables/allocations/credits and retention. `CustomerAccess` and `ReceivableCore` are its public transaction interfaces. `apps/api/src/payments` owns cash payments, original-payment refund allocation, shifts and immutable cash entries (`CashCore`, `CashRefunds`, `ShiftCore`). `apps/api/src/sales` orchestrates authoritative pricing, ledger posting, credit/payment participants, returns and exchange links within one authorized transaction. Read projections join financial facts for receipts/reconciliation; only owning modules write their tables. Shared contracts/client models contain no platform APIs. Web/Tauri and mobile own separate POS controls and printer adapters.

Supplier payables belong to `apps/api/src/purchasing`: `PayableService` owns immutable supplier credits/settlements and derives invoice balances. It uses the public `ShiftCore` transaction interface for cash effects rather than editing drawer balances. `payable.controller.ts` validates scoped API requests; portable payable contracts/clients/forms feed web/Tauri and native `PayablePanel` controls. `PurchaseReturns` owns condition-specific stock returns through `LedgerCore`. See [Stage 3](../development/stage-3-workflows.md).

| `apps/api/src/sync` | Offline policy/leases, snapshots, durable delta cursors, scoped revision hints, idempotent sales and owner reconciliation |
| `apps/api/src/counts` | Blind count capture, cutoff/recount policy, owner approval and exact scan lookup |
| `packages/api-client/src/offline-*`, `sync-*`, `invalidations.ts` | Encrypted document/schema, atomic store port, durable outbox, transport and view model |
| `apps/web/src/features/offline`, `warehouse` | Cash register and scanning/count controls reused by Tauri |
| `apps/mobile/src/offline`, `warehouse` | Equivalent native controls and existing camera adapter |
| `apps/web/src/platform/*vault*`, `desktop-storage.ts` | IndexedDB and lazy narrow Tauri IPC adapter |
| `apps/mobile/src/platform/vault-*` | SQLite/native random source; IndexedDB for Expo web |
| `apps/desktop/src-tauri/src/offline.rs` | SQLite migration and conditional envelope writes |

## Stage 3.5 presentation and AI foundation

`packages/design-tokens/tokens.css` owns portable semantic colors and design metrics; generated native exports and web CSS share that source. UI adapters remain in web/mobile, outside domain/contracts/api-client and the independently deployable API. See [design-system guidance](../development/design-system.md) and [common component APIs](../development/common-components.md).

`apps/api/src/ai` owns a disabled, provider-independent internal navigation-help extension, strict schemas, permission-filtered static context, bounded provider execution and redacted metrics. Stage 6 exposes it through the guarded integrations controller; it has no action tools or installed provider. See [AI boundaries](provider-foundation.md). Provider-backed inference remains unconfigured; Command 25A settings/security ownership is recorded below. Stage 4 separately extends identity recovery, transport reliability and sync boundaries as described below.

## Stage 4 security and reliability

`auth/password-recovery.ts` owns operator issuance and atomic password/session recovery. It calls the sync-owned `revokeOfflineAccess(tx, accountId)` boundary; pending operations remain retained for review. The existing global guard rate-limits recovery completion. Web/Tauri and native `auth/PasswordRecovery` controls use the shared auth client without token persistence or automatic login.

`packages/api-client/src/read-retry.ts` supplies bounded safe-read retries; web/native transport adapters own fetch, timers and body deadlines. Client error metadata preserves the server-generated correlation ID. `outbox-claim.ts` owns atomic local batch eligibility and persistent attempts/backoff; SyncEngine preserves confirmed results under concurrent/late responses. Server cursors also bind currency. See [Stage 4 impact and evidence](../development/stage-4.md).

## Command 25A settings and security

`packages/contracts/src/settings.ts` owns pure settings validation, defaults and precedence; `packages/api-client/src/settings` owns transport/state models. `apps/api/src/settings` owns versioned account preferences and platform/business policies, reusing OrganizationScope. `apps/api/src/security` owns append-only security events, account-specific installation recognition, tenant-routed durable in-app delivery and access-controlled reads. Auth calls its transaction functions; existing role/inventory/financial audits remain in their owning modules. `logging/diagnostic.ts` and the global error filter own allowlisted diagnostics, with 30-day cleanup by the existing security worker. No provider SDK, font, visualization library, gateway or future business tables are introduced. Web/Tauri and native settings controls compose the shared models; native SecureStore/browser-cookie/desktop marker adapters stay platform-owned. See [settings/security architecture](../development/command-25a.md).

## Stage 5 reports and operational delivery

`apps/api/src/reports` owns read-only, permission-specific transaction/ledger aggregates; it joins owning-module facts without writing them. `notifications/route-event.ts` is the public transactional enqueue boundary called by organization audit; `notifications/deliver.ts` is the shared durable delivery routine called by the existing security worker. `notifications/approval-queue.ts` reads pending domain documents; approval mutations remain in purchasing/transfers/counts. `inventory/low-stock.ts` observes committed-in-transaction availability crossings and emits an audit event; it never edits balances. `visualization` reads scoped storage hierarchy and per-location stock. Optional industry configuration remains in the settings policy with schema/CAS versioning. Shared report/inbox/review/hierarchy clients contain no platform APIs. Web workflow registration uses lazy imports; Expo owns native controls. See [Stage 5 impact map and limits](../development/stage-5.md).

Stage 6: `apps/api/src/trading` owns bilateral relationships, explicit shared order snapshots and events; it has no catalog or cross-tenant financial repository access. `accounting` owns periods and append-only double-entry journals, reads immutable sources through its posting adapter, and never updates source stock/cash records. `integrations` exposes safe provider status and the navigation-only AI boundary; it reuses the existing AI provider port and durable rate limiter. Contracts live in `packages/contracts/src/{trading,accounting,integrations}.ts`; clients and platform-independent forms live in `packages/api-client/src/{stage6,trading-forms,accounting-forms}.ts`. Web feature panels are lazy; mobile has native equivalents; Tauri consumes the web UI. No new packages or third-party dependencies. See [Stage 6](../development/stage-6.md).

The overview read model lives in `reports/dashboard.service.ts` and `dashboard-queries.ts`, with portable contracts/client and feature-local web/native panels. The account currency preference uses the existing settings store. See [overview and currency semantics](../development/overview-currency.md).

Live catalog updates are owned by `apps/api/src/live` (ticket authentication, PostgreSQL LISTEN and WebSocket hints), with portable lifecycle code in `packages/api-client/src/catalog-live.ts` and web/native adapters in `platform/useCatalogLive.ts`. Read projections remain in catalog/inventory; authoritative pricing and checkout remain with their existing owners. See [live UI impact map](../development/live-ui-refinement.md).
