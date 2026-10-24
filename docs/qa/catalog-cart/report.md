# Catalog, inventory and compact cart refinement

## Impact map and implementation plan

- Cart: `PosModel` drafts and authoritative quotes → web/native CartLines and
  product-detail drawers. Preserve quantity/unit/discount requests, stock locations,
  quote invalidation, checkout locks and server totals. Move location editing off cards.
- Catalog: existing cancellable product queries → horizontal filters, shared list/grid
  selectors, compact selectable cards, detail/edit/pricing drawers. Preserve pagination.
- Pricing: existing product creation → explicit variant/unit/price setup; existing
  edit flow → pricing action. No invented default price or new pricing calculation.
  Product metadata and publishing a price remain separate server commands.
- Inventory: existing overview projections → POS-style cards and adjustment drawer.
  Ledger commands and permissions remain authoritative.
- Warehouse selection: shared web/native presentation for existing page selectors;
  preserve each page's allowed locations, default, change/reset behavior and locks.
- Desktop consumes web components. Native uses its existing controls/SidePanel.
- No schema, migration, authentication, offline protocol or new dependency planned.
- Validate cart behavior, catalog selection/filtering, pricing access, layouts, types,
  lint, builds, browser and available native runtimes. Record exact limits below.

## Implemented

- Web/Tauri and native carts have a compact two-column layout. Delete is above
  quantity controls; units sit with SKU information. Product names open details.
  Stock-location editing remains available inside details rather than on every card.
  Manual discounts have a labelled editor and retain the existing basis-point rules.
  Quotes, totals, permission checks and uncertain-checkout locks remain authoritative.
- Cart status sits beside the cart heading. Payment guidance begins the POS toolbar.
- Catalog uses a top search/filter toolbar, list/grid tabs, shared selection controls,
  smaller responsive cards, details drawers, and guarded product edit drawers.
  Failed saves retain the product draft; duplicate submissions are blocked.
- New products offer **Save and set price**. The backend's existing default SKU and
  Each unit are reused; successful creation opens the existing pricing workflow.
  Existing products offer **Set / adjust price** from the edit drawer. Prices still
  require explicit publication with currency/unit/scope/effective dates. No arbitrary
  zero price or financial calculation was introduced.
- Inventory grid cards follow the POS layout, placing availability beside quantity.
  Adjust stock opens a drawer with the selected variant/unit and the existing
  auditable movement command. Existing stock-operation forms remain available.
- Shared WarehouseSelect replaces page context selectors across POS, inventory,
  purchasing/payables, transfers, storage, reporting, warehouse views/scanning and
  cash/receipt history. Caller-owned scopes, defaults and transaction locks remain.
- Native uses its own SidePanel/Choice controls, never DOM components. Web/Tauri
  share the existing drawer, popover, searchable-select and token infrastructure.

## Code organization

Primary changes are in both apps' `catalog`, `inventory`, `pricing`, and `pos`
features. New cohesive components include ProductEditor, CatalogDetails (web),
CartLineDetails, CartDiscount (web), StockAdjustment and WarehouseSelect. Shared
web styles are in `apps/web/src/theme/catalog-cart.css`. WarehouseSelect usage and
native compact QuantityControl are documented in
[`common-components.md`](../../development/common-components.md); the existing
workspace-controls showcase includes a safe warehouse example.

## Data and scope

No API contracts, permissions, database schema, migrations, domain calculations or
external dependencies changed. Product metadata and price publication remain
separate existing server commands: saving a product does not claim a published
price until the price command succeeds. Location editing remains available to
preserve existing stock allocation behavior.

The live pricing walkthrough retained one explicitly created local test product,
`UI-PRICE-1792687997159`, with published USD prices 12.50 followed by 14.75, in the
isolated development audit database. No production environment was used.

## Validation (2026-10-22)

| Check                                       | Actual result                                                                                                                                                                                                                                                                      |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`                         | Passed; affected web/native application and native-test TypeScript checks repeated after final edits also passed.                                                                                                                                                                  |
| `npm test`                                  | 109 files, 229 tests passed; all 14 tooling tests passed.                                                                                                                                                                                                                          |
| Focused final regression run                | Four files / six tests passed: cart edits/locks, failed product saves, delayed warehouse loading, native product form. Earlier catalog/inventory selection tests also passed.                                                                                                      |
| `npm run lint`                              | Passed with 0 errors and 23 source-length warnings; dependency checks passed for 906 modules / 4,820 dependencies.                                                                                                                                                                 |
| `npm run check:foundation`                  | Passed: 84 documents and 951 source files.                                                                                                                                                                                                                                         |
| `npm run build`                             | API/shared packages and web production build passed.                                                                                                                                                                                                                               |
| `npm run build:mobile`                      | Android, iOS and Expo web JavaScript exports passed. Final native presentation edits were exported again successfully.                                                                                                                                                             |
| `npm run build:desktop -- -- --bundles app` | macOS ARM64 app bundle passed; rebuilt after final accessibility fix, launched and captured at 1100 × 760.                                                                                                                                                                         |
| Browser suite                               | Initial run: 20 passed, 4 failed on a new warehouse trigger's accessible name omitting its visible value. Fixed with a shared context/value label. All 5 design-system tests then passed, including those 4 light/dark 320/1440px axe checks. No unresolved browser-suite failure. |
| Feature browser walkthrough                 | Passed at 1440, 768 and 390px: catalog grid/list selection, filters/details, inventory warehouse/adjustment drawers, cart quantity/details/discount; no page overflow or runtime errors. Screenshots visually reviewed.                                                            |
| Live API pricing                            | New product → default variant/unit → publish USD 12.50 → edit → publish USD 14.75 passed against local PostgreSQL. Both price responses confirmed, no browser errors.                                                                                                              |
| Live API checkout                           | Cashier cart retained across navigation; one sale confirmed with total USD 13.75, tender USD 15 and change USD 1.25; receipt fetched and matched. Superadmin cart navigation also passed.                                                                                          |
| Live role walkthrough                       | Seven fixture roles; 147 allowed-page visits plus denied-route checks, zero reported runtime/API/overflow issues. Includes desktop, tablet and phone browser widths.                                                                                                               |
| Formatting                                  | Task files formatted. Repository `format:check` reports only pre-existing user-maintained `AGENTS.md`; left untouched.                                                                                                                                                             |
| Diff                                        | `git diff --check` passed. Reviewed task edits for preserved handlers, permissions, quote/ledger commands and single-attempt writes. Unrelated existing workspace changes retained.                                                                                                |

The confirmed local checkout is retained as sale
`38a614d0-1775-4ab2-b1c9-92054e877c8a`; see `checkout.json`. Evidence and repeatable
walkthroughs are in this folder and `tests/manual/catalog-*.mjs` / `catalog-cart-native.py`.
During one checkout attempt, concurrent development-server dependency rebuilding
reloaded the page and cleared its in-memory draft; rerunning after builds completed
passed. This is separate from production checkout behavior.

## Limits

- macOS verification in this change is a rebuilt native launch/sign-in-screen smoke
  check; authenticated business workflows were exercised in Chrome using the shared
  frontend, not requalified inside the native macOS WebView.
- Windows cannot be built/run on this macOS host. iOS export passed, but no iOS
  simulator/device is available because full Xcode/CocoaPods are absent.
- Android testing uses Expo Go on an emulator; signed mobile packages, physical
  scanner/printer hardware and installed-device offline recovery are not qualified.
- The seven-role walkthrough checks navigation/visibility and API outcomes, not
  every possible business mutation. No comprehensive database integration suite or
  migrations were run for this UI-only change; real pricing/checkout used the
  existing migrated local database.
- Screenshots use explicit local demo fixtures where labelled; prices and receipts
  in the live walkthrough are server-confirmed. Missing product images retain the
  existing honest placeholder. Catalog cards do not invent a universal price when
  prices depend on SKU/unit/currency/scope; the pricing drawer exposes those records.

Android 16 ARM64 / Expo Go runtime checks passed for the compact cart, quantity
placement and increments, name → details drawer, retained stock-location/unit
controls, manual discount, visible Checkout footer, catalog grid/list/filter views,
and edit → pricing drawer. The native cart displays unit beside SKU; unit editing
is in details to keep the card compact. See `android-results.json` and screenshots.
The native automation needed selector-case and off-screen scrolling corrections;
these were test-driver issues, not suppressed application failures.

A further Android interaction check selected a real demo product card, opened its
catalog details drawer, and confirmed selection persisted after switching to list
view. `android-catalog-cards.png` and `android-catalog-details.png` record the actual
scrolled content rather than only the toolbar.

Final native card review shortened visible pricing/edit actions while retaining product-specific accessible names. Native typecheck, targeted lint and Android/iOS/web exports were repeated for that presentation adjustment.
