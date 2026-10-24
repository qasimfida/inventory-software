# Product presentation refinement

## Impact map

| Layer                              | Change                                                                                                                           |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Domain, API, database, permissions | Unchanged. Existing permission-scoped base prices and checkout quotes remain authoritative.                                      |
| Shared settings                    | Existing simple/enhanced feedback preference label clarifies contextual actions. No new storage key or precedence.               |
| Web / Windows / macOS              | Shared React POS heading, cart row, content-width card grid, catalog/inventory and generic collection presentation.              |
| Android / iOS                      | Native heading/cart equivalents, single-column cards on narrow/text-scaled views, equivalent empty states and selection removal. |
| Offline / live prices              | Existing price subscriptions, quote validation, grants and outbox untouched. Shared web card sizing also applies to cached POS.  |
| Tests / docs                       | Component regression tests, actual feedback showcase, common component documentation.                                            |

## Behavior

- POS information sits beside the title. Quoted line price and selected unit precede the discount action.
- Web POS columns use available container width; catalog/inventory already use content-based columns. Native product grids use one column below 600 logical pixels or when text scaling exceeds 1.3.
- Catalog and inventory retain prices in list, grid and details, including explicit `Not priced` states. POS and cached POS retain price-bearing add buttons. Historical transaction prices are not replaced by current catalog prices.
- Catalog, inventory and generic customer/supplier collections no longer present checkboxes/counts that did not feed any bulk action. No bulk deletion endpoint was invented. Existing permission assignment and stock-count selection remain intact.
- Empty catalog, inventory and generic collection results use shared feedback. In Preferences, enhanced loading/empty states enable contextual actions; simple retains useful text. Catalog's action opens the existing creation drawer only for product writers; POS can clear search/filters. Essential toolbar actions remain available independently of this presentation preference.

## Verification

- Full Vitest run: **252 tests, 116 files passed**. Includes empty-cart rendering, preserved quantity/discount interactions, selection omission, details navigation and simple/enhanced empty-action behavior.
- Workspace type checks passed before the final cart layout adjustment; the final web production type check and native TypeScript check also passed.
- Full lint: **0 errors, 28 existing size warnings**; dependency boundaries passed (966 modules / 5210 dependencies). Final changed cart/test files also pass lint.
- Changed-file formatting and `git diff --check` passed. Foundation check passed: 91 documents / 1021 source files.
- Final web production build and macOS ARM64 `.app` bundle passed (12.27 MiB). App launch requested successfully; authenticated native macOS journeys were not rerun.
- Final Android/iOS/web Expo JavaScript exports passed. These are not signed native builds.
- Chrome against the real local API: owner POS/cart plus catalog/inventory navigation; 390/768/1000/1440 px; no horizontal overflow or uncaught page errors. Cards measured 358/360/312/366 px respectively. Price/unit precede discount, guidance is within the heading, and inert product checkboxes are absent. Screenshots and `browser.json` accompany this report.
- Android 16 Expo Go emulator (1080×2400): cashier sign-in/session restoration, title guidance, single-column product cards with prices, and one product added with a $18.50 quoted total. POS/cart screenshots saved. No sale submitted.
- No backend/schema changes; database migrations and integration suites were not rerun. No production data was changed.

## Limits

Windows native execution requires Windows/WebView2; iOS device execution requires unavailable Xcode/CocoaPods. macOS authenticated journeys, exhaustive every-page/theme checks, native screen readers and physical hardware were not verified in this pass. Existing essential empty/error messages remain visible in simple mode; only richer presentation and optional contextual shortcuts are disabled. No bulk product-delete workflow currently exists, so its checkboxes/count are intentionally absent rather than implying a supported action. Product availability/pricing still depend on server data and authorized warehouse scope; missing prices are shown explicitly, never invented.
