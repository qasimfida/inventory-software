# Inventory workspace refinement

The inventory workspace uses the existing semantic tokens, React controls on web/Tauri, and native controls on Expo. No new dependency, schema migration, payment provider, stock mutation, permission, or preference store is introduced.

## Impact map

| Layer                  | Implementation                                                                      | Boundary                                                                                                                                                                                                                         |
| ---------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inventory authority    | `apps/api/src/inventory/stock-overview.ts`, existing InventoryQueries/Controller    | `stock.read`, OrganizationScope and LedgerCore warehouse authorization precede a read-only aggregate query.                                                                                                                      |
| Contracts              | `packages/contracts/src/stock-overview.ts`                                          | Strict warehouse/status/search/limit/offset query; runtime-validated response.                                                                                                                                                   |
| Clients                | `inventory.ts`, `cancellation.ts`, `cancellable-resource.ts`, `read-retry.ts`       | Host-owned cancellation propagates through queued requests and body deadlines; explicit cancellations are not retried. Mutation retry rules remain unchanged.                                                                    |
| Stock UI               | Web/native `InventoryOverview` and `InventoryPanel`                                 | Cards link to `/inventory?stock=all`, `in-stock`, `low-stock`, `out-of-stock`; paginated related products, exact quantities and badges. Existing ledger commands and history remain available.                                   |
| Checkout               | `auto-quote.ts`, PosModel, both PosCheckout/CartLines/ProductPicker implementations | Debounced authoritative quotes; explicit Checkout opens the existing cash/credit confirmation. No automatic sale posting or uncertain-command retries. Exact decimal quantity stepping preserves editable fractional quantities. |
| Navigation/preferences | Both shell headers/profile menus, web ThemeToggle                                   | Shared account preference persistence and enforced policy remain authoritative. System theme remains in Preferences. Offline switch opens prepared-register unlock without changing server permissions or discarding the cart.   |
| Offline persistence    | Existing OfflinePanel/adapters                                                      | No persistence/outbox change. Unlock still requires an existing encrypted register and valid bounded grant. Locally saved is never represented as synchronized.                                                                  |
| Native hosts           | React/Tauri shared DOM UI; React Native geometry/controls                           | No DOM component imports into native screens. Windows/iOS require their own host qualification.                                                                                                                                  |
| Verification           | New unit/component tests, PostgreSQL overview suite, manual browser script          | Exact execution evidence lives in `docs/qa/inventory-refinement/report.md`.                                                                                                                                                      |

## Stock definitions

“Total products” means active, inventory-tracked SKUs (variants), not distinct product families. Quantities aggregate the selected warehouse's locations in each SKU's base unit. Available is on hand minus reserved minus damaged. In-transit is excluded.

The buckets are mutually exclusive: out of stock means available <= 0; low stock means available > 0 and <= the existing business industry threshold; in stock means available > threshold. The existing default threshold is **0**, so a business using defaults has no positive low-stock bucket. Configure the existing industry setting to enable a positive threshold. No stock quantity is overwritten.

Card counts cover the whole authorized warehouse, independent of the typed search. The row total covers the selected status and search. A single SQL statement produces the aggregate counts and bounded page from one snapshot. The client never fetches the entire catalog for a visual filter. No revenue percentages, brand shares, photos or historical chart series are fabricated.

## Interaction details

- Profile menu exists at the header and sidebar/bottom navigation. Preferences open a separate popup. Connection configuration is retained in device Settings and removed from authentication screens.
- Connectivity dots indicate successful recent server polling, not a guaranteed continuously live connection. Notification badges count unread notifications in the latest authorized page; `+` means additional pages exist.
- Header, inventory and POS search expand from an icon. Web suggestions support Arrow Up/Down, Enter and Escape; native suggestions use touch-accessible actions. Catalog filtering updates automatically while barcode Enter/scan behavior remains explicit.
- Search requests debounce 250–300 ms; a replaced request is cancelled and late data cannot overwrite current results. Generic transports never retry mutations.
- Numbered pagination shows first/current/adjacent/last pages when a total is known. Existing cursor-only workflows cannot truthfully expose a final page; they retain bounded forward navigation.
- Refresh/back actions use ghost icons with accessible names. Web icon buttons expose title hints; native icons expose accessibility hints and long-press labels. No animations override reduced-motion settings.
- Quantity +/- changes exactly one selected unit. Fractional manual entry and backend quantity validation remain intact. Decrement never silently removes a line.
- Quotes refresh after cart edits and inventory invalidation hints. An unsuccessful quote shows a retry control. Checkout stays disabled until a valid quote is available; the payment form and stable idempotency keys remain unchanged.

## Deliberate limits

This is not a literal furniture/shoe storefront: only existing business data is displayed. Historical inventory trend and brand-sale visualizations need an authoritative API and product requirement. Some older feature-local filters and cursor history controls retain their original layout; the new search component is the reusable migration target. Native platforms use native disclosure/list presentation instead of horizontally scrolling desktop tables.
