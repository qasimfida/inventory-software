# Application routes

Web and Tauri use hash routes; native uses the same permission-aware route registry with a local navigation stack and Android back handling. Server authorization remains authoritative. Routes require a session; missing business membership opens Business onboarding. Feature panels stay mounted after visiting to preserve unfinished cart/form state until account/business changes.

| Path                      | Screen                    | Required business permissions                           |
| ------------------------- | ------------------------- | ------------------------------------------------------- |
| `/dashboard`              | Overview                  | Account session                                         |
| `/pos`                    | Point of sale             | sales.write                                             |
| `/sales`                  | Sales & receipts          | sales.read                                              |
| `/cash`                   | Cash shifts               | payments.read                                           |
| `/catalog`                | Catalog & pricing         | products.read                                           |
| `/inventory`              | Inventory                 | stock.read                                              |
| `/warehouse`              | Stock counts & scanning   | stock.read                                              |
| `/transfers`              | Transfers                 | stock.read                                              |
| `/storage`                | Storage locations         | stock.read                                              |
| `/warehouse-view`         | Warehouse hierarchy       | stock.read                                              |
| `/purchasing`             | Purchasing & suppliers    | purchases.read                                          |
| `/customers`              | Customers                 | customers.read                                          |
| `/payables`               | Supplier balances         | purchases.read, payments.read                           |
| `/accounting`             | Accounting                | reports.read, payments.read, sales.read, purchases.read |
| `/reports`                | Reports                   | reports.read                                            |
| `/notifications`          | Notifications & approvals | business.read                                           |
| `/trading`                | Business trading          | business.write                                          |
| `/integrations`           | Integrations & help       | business.read                                           |
| `/settings/profile`       | Profile                   | Account session                                         |
| `/settings/business`      | Business                  | business.write                                          |
| `/settings/preferences`   | Preferences               | Account session                                         |
| `/settings/security`      | Security                  | Account session                                         |
| `/settings/device`        | Device & Offline          | sales.write, stock.read                                 |
| `/settings/notifications` | Security notifications    | Account session                                         |
| `/team`                   | Team & permissions        | users.read                                              |
| `/settings/locations`     | Stores & terminals        | locations.write                                         |
| `/settings/audit`         | Audit history             | audit.read                                              |

Public isolated authentication routes: `/auth/login`, `/auth/invitation`, `/auth/forgot`, `/auth/reset`, `/auth/link`. Web `/offline` and native `inventory://offline` open only an already prepared encrypted register; setup remains inside Device & Offline. These paths never grant offline authority: existing leases, passphrases and revocation rules still apply. `/design-system` remains the existing non-business component showcase. No public business records are exposed.

Global search uses the existing paginated product/customer clients with bounded results and current permissions. Selection opens the existing catalog/customer search filter. Settings owns business switching/creation. Desktop chrome and native integrations remain separate.

`/logs` is the shared web/native activity-log view. Existing `audit.read` controls business visibility; platform administrators can enter from the platform overview without a selected business. Restricted diagnostics remain protected by the existing platform APIs. No raw server log or secret material is returned.

## Visual QA navigation refinement — 2026-10-24

The header renders the current route title; matching common screen headings are suppressed. Non-root destinations retain history-aware back actions. The sidebar brand is a home link, not a business switcher. Business switching and authorized location scope selection now live on `/settings/business` on web/Tauri and native mobile; the operational warehouse picker remains available for work that needs it. The profile menu opens upward on desktop. Native tabs/More retain their existing stack and permission rules.

Cashiers are redirected from `/dashboard` to `/pos`; platform administrators go to `/admin`. `/admin/businesses` is the platform-authorized business directory. `/staff` requires `users.write`, `/settings/company` requires `business.write`, and `/logs` uses the existing business/platform audit authority. Legacy `/settings/users` and `/settings/staff` redirects remain intact. Layout changes do not authorize any server operation.
