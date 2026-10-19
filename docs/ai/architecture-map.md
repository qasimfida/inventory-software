# Module and directory map

The paths in this table exist. Business modules in the next table remain proposals.

| Actual path                        | Responsibility / consumers                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------------------ |
| `apps/web/src/app`                 | Hash router, lazy foundation page and route error handling; desktop reuses this build      |
| `apps/web/src/components/ui`       | shadcn Button primitive                                                                    |
| `apps/web/src/components/common`   | Loading, empty, error and retry states                                                     |
| `apps/web/src/features/foundation` | Non-business API connection check                                                          |
| `apps/api/src/config`              | Environment parsing and production policy                                                  |
| `apps/api/src/http`                | Request validation, safe errors, headers/CORS and structured request logging               |
| `apps/api/src/database`            | PostgreSQL pool lifecycle and readiness query                                              |
| `apps/api/src/health`              | Versioned live/ready endpoints                                                             |
| `apps/api/migrations`              | Migration directory; currently no business migrations                                      |
| `apps/mobile/src`                  | Native shell, theme and API connection check                                               |
| `apps/desktop/src-tauri`           | Rust/Tauri host, packaging and CSP; no native plugins                                      |
| `packages/contracts/src`           | API prefix, health/error runtime schemas and inferred wire types                           |
| `packages/api-client/src`          | Injected transport, health response validation and structured errors                       |
| Root configuration / `scripts`     | Shared TS strictness, ESLint, Prettier, Vitest, import boundaries and documentation checks |

Actual graph: API → contracts; web/mobile → api-client → contracts; desktop → web build artifact. Shared packages build to ESM `dist` with declarations and explicit exports; application build hooks compile shared dependencies automatically. No cross-app source imports. Domain, client-core, platform adapters and feature modules will be created only when needed; their planned dependency rules follow below.

Future frontend features use `features/<feature>/{components,hooks,services,types}` as applicable. Future backend business modules use `apps/api/src/modules/<module>` with public application interfaces and private persistence. Pure rules will live in `packages/domain`; device implementations in dedicated platform packages when a real interface exists.

## Proposed domain ownership

| Module                 | Authoritative responsibility / public operations                       | Allowed collaborators                |
| ---------------------- | ---------------------------------------------------------------------- | ------------------------------------ |
| Identity/access        | Memberships, roles, permission evaluation                              | Organization scopes                  |
| Organizations          | Businesses, branches, stores, warehouses and ownership                 | None                                 |
| Catalog                | Products, variants, units, barcodes, versioned prices                  | Organization scope                   |
| Locations              | Zones, shelves, racks and bins within warehouses                       | Organizations                        |
| Inventory              | Stock movements, balances, reservations, count adjustments             | Catalog references, locations        |
| Parties                | Customer/supplier identities and terms                                 | Organizations                        |
| Finance                | Payments, allocations, receivables/payables, credit and reversals      | Parties                              |
| Sales/POS              | Sale/return documents, checkout orchestration, cash sessions           | Catalog, inventory, parties, finance |
| Purchasing             | Purchase/receipt documents and supplier obligations                    | Catalog, inventory, parties, finance |
| Transfers/trading      | Dispatch/receipt workflow; separate commercial documents across owners | Inventory, sales, purchasing         |
| Reporting              | Rebuildable authorized read projections, analytics                     | Read interfaces/change records only  |
| Notifications/realtime | Delivery and invalidation hints                                        | Committed change records only        |
| Synchronization        | Operation receipts, checkpoints, authorized command routing/feed       | Public business interfaces only      |
| Platform integrations  | Device/storage implementations                                         | Shared ports/contracts only          |

## Dependency rules

Dependencies follow the table, never reverse it. Identity/tenant enforcement is applied at application boundaries, not by coupling every domain package to an authentication framework. Finance records source document IDs without importing sales/purchasing implementations. Inventory similarly references source IDs without importing its callers.

UI → client-core/domain/contracts; platform adapters implement client-core ports; composition roots inject adapters. API → domain/contracts plus owning persistence implementations. Domain imports no NestJS, React, browser, native, or database APIs. Apps never import another app's internals; the desktop host may consume the web build artifact.

Cross-module calls use explicit public application interfaces; never import another module's repository or write its tables. A top-level workflow owns transactions across participants. Public DTOs expose no ORM entities. Avoid barrel chains, side-effectful index files, cycles and `forwardRef` as an architectural escape. Dependency-cruiser checks these boundaries against source imports, and negative probes verify enforcement. When a cycle appears, move orchestration upward or extract a genuinely shared pure concept.

PostgreSQL is authoritative for confirmed facts. Local databases own unsent operations and provisional projections; caches and sockets are never independent business authorities. Update this map whenever ownership, public interfaces, dependencies or actual paths change.
