# Inventory presentation and list preferences

## Impact map

| Layer                  | Changes and boundaries                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authoritative settings | `packages/contracts/src/settings.ts` adds `pagination: pages/scroll` and `radius: rounded/circle`; existing per-account JSON storage, version concurrency and enforced policy precedence remain authoritative. Defaults preserve page navigation and slightly rounded controls for older records. Deploy the updated API validators before clients offer the new values. No database migration is needed. |
| Read APIs              | Existing bounded offset/cursor endpoints are reused. No new stock, financial or authentication endpoint, permission or posting rule.                                                                                                                                                                                                                                                                      |
| Presentation cache     | Portable `mergePageCollections` merges only explicitly named row collections. Metadata/totals come from the latest server response, never from adding pages. Host `usePageCollection` retains visited pages in memory and clears on scope/filter changes; switching loading mode restarts list positions without remounting the cart or forms.                                                            |
| Web and Tauri          | Existing DOM components implement permanent search bars, soft table rows, profile identity/menu, control shape tokens, pagination/scroll sentinel, inventory list/grid and a right-edge details dialog. Windows consumes this code but still needs host verification.                                                                                                                                     |
| Native                 | React Native equivalents use native fields, actions, scroll events and Modal/SidePanel. No DOM UI is imported into native code. Android runtime and iOS JS export are separate evidence.                                                                                                                                                                                                                  |
| Persistence/offline    | Both new preferences use the existing account settings service and policy locks. No second store, outbox changes or permission relaxation.                                                                                                                                                                                                                                                                |

## Interaction contract

Search is always visible, with a leading search symbol and a clear control only when text is present. Existing bounded suggestions and 250–300 ms cancellation/debounce stay in place. Barcode submission semantics are unchanged.

Page mode hides controls for a single page. Scroll mode removes numbered controls, retains visited results, and loads the next bounded page as the sentinel is reached. A labeled Load more action remains for keyboard users, unsupported observers and retry/accessibility needs. The sentinel permits one pending request and waits for another scroll opportunity before automatically requesting again; a short selector must never drain an entire remote dataset merely because its bottom is visible. Financial totals are never calculated from accumulated rows.

Offset lists covered: inventory products/ledger collections, catalog, POS products/receipts/cash shifts, customers/statements, purchasing/suppliers, supplier invoices/history, storage, transfers, reports, accounting, trading/history, approvals and warehouse hierarchy/stock. Cursor histories use their existing server cursor and a preference-aware sentinel; already-accumulating audit/security models retain ownership of their rows. Dashboard previews remain bounded summaries with their existing navigation links.

Changing filters, warehouse, selected detail context or business clears the corresponding collection cache. Previously loaded pages are snapshots, not an offline replica or a live-update subscription. Refreshing or revisiting a filtered view retrieves server data through its existing loader. Search failure does not automatically retry or advance the page; the existing retry action remains available.

Circle shape means circular square controls/avatars and pill-shaped wide controls. Cards, tables, multiline text areas and drawers retain usable surface corners rather than clipping content into circles. Text scaling, focus rings, policy enforcement and reduced-motion preferences remain intact. No downloaded font or icon library was introduced.

The identity API currently supplies email, not a display name or avatar photo. Profile identity uses the email local part and initials, with the authenticated business role underneath. No name, photo or role is invented. The fixed menu width is constrained by the viewport.

Inventory list and grid show the same authorized stock projection. Details open in a fixed-width right-side panel, constrained to the available viewport; they show name, SKU, base unit, exact available quantity and stock status. Product photos/descriptions not provided by this projection are not fabricated. The drawer is read-only and states that quantities describe the selected warehouse at last refresh.

## Component ownership

See [common components](common-components.md) for `SearchControl`, `Pagination`, `CursorPagination`, `LoadMore`, `usePageCollection` and native `SidePanel`. `InventoryProducts` stays feature-local on both platforms. Profile identity stays with the shell. Canonical dimensions are in `packages/design-tokens/tokens.css`.

Exact test/build/device results are recorded in [enhancement QA](../qa/inventory-enhancements/report.md).
