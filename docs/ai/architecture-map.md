# Module and directory map

Only root documentation/configuration, `docs/`, and `scripts/` exist today. Every app/package path below is a proposed convention; create it only when needed.

| Proposed path                     | Ownership                                                       |
| --------------------------------- | --------------------------------------------------------------- |
| `apps/web/src`                    | React web and reusable desktop UI shell                         |
| `apps/desktop`                    | Tauri host configuration/native integration; consumes web build |
| `apps/mobile/src`                 | Native mobile UI and platform bindings                          |
| `apps/api/src/modules/<module>`   | NestJS module controllers, application services, repositories   |
| `apps/api/migrations`             | Central database migrations                                     |
| `packages/domain/src/<module>`    | Framework-free deterministic business rules                     |
| `packages/contracts/src/<module>` | Versioned REST/event schemas, wire types and validation         |
| `packages/client-core/src`        | Shared client use cases, sync orchestration and adapter ports   |
| `packages/platform-*/src`         | Browser/desktop/mobile persistence and device adapters          |
| `apps/web/src/components/ui`      | Generated shadcn/ui primitives                                  |
| `apps/web/src/components/common`  | Reusable customized application components                      |
| `apps/*/src/features/<feature>`   | Feature components, hooks, services and optional types          |

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

Cross-module calls use explicit public application interfaces; never import another module's repository or write its tables. A top-level workflow owns transactions across participants. Public DTOs expose no ORM entities. Avoid barrel chains, side-effectful index files, cycles and `forwardRef` as an architectural escape. Add dependency checking with the first source scaffold. When a cycle appears, move orchestration upward or extract a genuinely shared pure concept.

PostgreSQL is authoritative for confirmed facts. Local databases own unsent operations and provisional projections; caches and sockets are never independent business authorities. Update this map whenever ownership, public interfaces, dependencies or actual paths change.
