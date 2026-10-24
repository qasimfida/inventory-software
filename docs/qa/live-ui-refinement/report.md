# Live pricing and role-aware UI verification — 2026-10-23

## Delivered

- Permission-filtered navigation now hides cashier Overview in the sidebar, route search and native tabs. Cashier landing redirects to POS before checking the destination guard; backend authorization remains unchanged.
- Catalog and inventory list/grid/detail views show current base-unit prices. Single-store views include store overrides; multi-store views show business prices. Authorized product editors open existing metadata and pricing forms in drawers from either collection.
- Committed catalog/price changes publish PostgreSQL notifications to authenticated WebSockets. POS cards/search, open carts, catalog, inventory and pricing consumers reload authorized data. The transport handles reconnection and scheduled price boundaries; offline snapshots and financial mutation semantics are unchanged.
- Warehouse context is owned by the header on POS, inventory and cash/receipt screens. Duplicate POS warehouse and cash-shift/history controls were removed; existing navigation destinations remain.
- Notifications use the shared table, server-side search/read filters, cursor pagination and details drawers. Business audit events open details drawers instead of inline accordions; their search is explicitly limited to loaded events.
- Product details expose prices and editing actions; edit drawers reuse existing grouped fields and pricing controls. Cart discounts and totals share a row, with total aligned right. Shared table selection columns and product-title buttons use consistent cell alignment.
- Redundant pricing refresh controls were removed. Inventory, notification, audit, purchasing, storage and supplier-balance refresh actions sit with their collection controls. Existing transaction recovery actions remain available.
- Small selects open directly without a search input; larger dynamic lists retain command search. Invalid credentials display a specific instruction without a reference number. Structured diagnostic IDs remain available to restricted diagnostics.

Implementation, module ownership, price semantics and deployment details are in [the impact map](../../development/live-ui-refinement.md). Shared usage guidance is in [common components](../../development/common-components.md); the existing component showcase includes small and larger select examples.

## Automated results

| Check                                       | Actual result                                                                                                                                          |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Local migration                             | `npm run db:migrate -w @inventory/api`: applied `1794800000000_live_catalog.sql`, one migration successfully applied                                   |
| Full unit suite                             | `npx vitest run --maxWorkers=4`: 243 tests passed, 115 files                                                                                           |
| Tooling                                     | `npm run test:tooling`: 14 passed, including native text-node validation                                                                               |
| PostgreSQL integration                      | 133 tests passed, 66 files, against isolated test databases with real migrations; test databases retained                                              |
| Socket regression after final transport fix | 1 passed: committed change, native handshake, denied browser Origin, concurrent tickets, single-use ticket, tenant/store isolation and revoked session |
| Types                                       | `npm run typecheck`: passed across shared packages, API, web, mobile and root tests                                                                    |
| Lint / boundaries                           | `npm run lint`: no errors, 28 existing/file-size warnings; no dependency violations (964 modules, 5,204 dependencies)                                  |
| Foundation                                  | `npm run check:foundation`: passed; documented source-size exceptions retained                                                                         |
| Formatting                                  | Changed files formatted. Whole-repository check retains the pre-existing `AGENTS.md` formatting warning; that file was not modified                    |
| Diff whitespace                             | `git diff --check`: passed                                                                                                                             |
| API / web                                   | API production TypeScript build passed; Vite production build passed, including desktop's web build                                                    |
| Mobile                                      | `npm run build:mobile`: Android, iOS and web JavaScript exports passed                                                                                 |
| Desktop                                     | `npm run build -w @inventory/desktop -- --bundles app`: macOS ARM64 `.app` built, 12.27 MiB                                                            |

Initial checks found and corrected the cashier redirect order, stale test copy after generalized search messaging, native literal text nodes, and React Native's synthesized WebSocket Origin. The final native handshake explicitly identifies its runtime; it still requires the same short-lived ticket. Browser WebSocket cannot set that custom header and retains Origin validation. An additional regression prevents one tab's ticket issuance from invalidating another tab's pending ticket.

## Live UI evidence

`tests/manual/live-ui-refinement.mjs` uses the local development API and database, without mock responses. Optional `ANDROID_ADB` checks the same price change in an already signed-in emulator. [Browser results](browser.json) record the final run.

- Owner and cashier exercised real business/store context, POS search, cart quote and simultaneous inventory/catalog views. The test changed a store-specific price from **18.50 to 23.47**, observed the POS button update in **122 ms**, and verified cart/catalog/inventory updates. It then restored **18.50** through the authorized pricing API and verified restoration. These development price versions remain auditable; no sale/payment was submitted.
- Admin, superadmin, manager, inventory, accountant and viewer also signed in and had no disabled sidebar links. Together with owner/cashier this covers all eight development accounts. This is navigation coverage, not an exhaustive test of every workflow under each role.
- A separate real-admin browser check opened inventory product details → Edit product → Set / adjust price, then catalog details → Edit product. Both paths rendered the working drawers without changing a product. See [drawer evidence](product-edit.json), [screenshot](product-edit.png) and `tests/manual/live-product-edit.mjs`.
- Notifications search and read-status selection rendered without a redundant small-list search. Selecting an event opened its detail drawer.
- Invalid credentials produced the expected actionable message without `Reference:`. No browser runtime errors were recorded.
- Chrome viewport widths **390, 768 and 1440 px**, height 1000 px: no horizontal page overflow in the exercised notification views. POS/inventory screenshots use 1440 × 1000. This pass did not repeat the full theme/font/density matrix.
- **Android 16 ARM64 emulator, Expo Go, 1080 × 2400:** cashier login/POS, hidden Overview, header warehouse, live changed/restored prices, adding a cart item, authoritative $18.50 quote, and product-details drawer verified. No checkout was submitted.
- **macOS ARM64 Tauri app:** built and launched the actual `.app`, signed in as admin, opened Overview and navigated to POS with real prices and cart controls. Browser-based automated coverage does not substitute for every native desktop workflow.

Screenshots: [web POS](cashier-pos.png), [inventory](inventory.png), [notifications](notifications.png), [Android POS](android-cashier.png), [Android cart](android-cart.png), [Android details](android-product-details.png), [macOS Overview](macos-overview.png), [macOS POS](macos-admin.png).

## Deployment and remaining limits

- Apply the new migration on each deployment and forward WebSocket upgrades for `/api/v1/catalog-live`. HTTPS deployments require WSS, allowed browser Origins and appropriate proxy timeouts. These settings were verified locally, not on a production ingress.
- Scheduled price start/end boundaries are refreshed within 30 seconds. Committed edits trigger immediate hints. Reconnection rereads current data; no event is treated as proof of successful stock/payment posting.
- Catalog shows the primary SKU price; product variants and customer-specific prices remain in the existing pricing/quote workflow. Live invalidation resets additional collection pages to page one rather than preserving stale accumulated items.
- Windows execution/build was unavailable on this macOS host. iOS JavaScript export passed; an iOS simulator/device build was not verified because the full native Xcode/provisioning toolchain is unavailable. No Windows/iOS-native completion claim is made.
- Printing/scanners, production signing/installers, production sockets, all-role native journeys, exhaustive accessibility/theme combinations and new financial submissions were not requalified in this pass.
- Existing unrelated working-tree changes were preserved. This report covers this request's refinement and live-pricing changes, not an audit of every prior uncommitted change.
