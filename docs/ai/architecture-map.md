# Module and directory map

The paths in this table exist. Organization management, catalog/pricing, inventory, purchasing, storage and transfers are implemented. Customers, sales and cash payment modules are also implemented. Offline cash/sync, stock counts and scanning are implemented. General-ledger accounting and external payment providers remain proposals.

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

| `apps/api/src/sync` | Offline policy/leases, snapshots, durable delta cursors, scoped revision hints, idempotent sales and owner reconciliation |
| `apps/api/src/counts` | Blind count capture, cutoff/recount policy, owner approval and exact scan lookup |
| `packages/api-client/src/offline-*`, `sync-*`, `invalidations.ts` | Encrypted document/schema, atomic store port, durable outbox, transport and view model |
| `apps/web/src/features/offline`, `warehouse` | Cash register and scanning/count controls reused by Tauri |
| `apps/mobile/src/offline`, `warehouse` | Equivalent native controls and existing camera adapter |
| `apps/web/src/platform/*vault*`, `desktop-storage.ts` | IndexedDB and lazy narrow Tauri IPC adapter |
| `apps/mobile/src/platform/vault-*` | SQLite/native random source; IndexedDB for Expo web |
| `apps/desktop/src-tauri/src/offline.rs` | SQLite migration and conditional envelope writes |
