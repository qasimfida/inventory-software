# Cart image layout

Live POS cart rows on web/Tauri and native mobile now place the product thumbnail at the start, title/SKU beside it, removal at the top right, and quantity controls followed by quoted price/selected unit on the second row. Authorized discounts remain available beneath the row. Real catalog images are used; missing/failed images use a neutral placeholder.

Impact: `CatalogSearch` adds existing product images to the scoped POS query; the optional validated response field flows through `PosItem` into display-only `DraftLine` metadata and platform-specific `CartThumbnail` components. Quote/checkout schemas strip display metadata as before. No pricing, quantity, permissions, migrations or outbox behavior changes. Old API responses without images remain compatible. Cached offline grant snapshots do not include images; their separate register remains unchanged.

Validation:

- 254 unit/component tests across 117 files passed, including image failure/missing-image fallback and preserved quantity/discount controls.
- 3 real PostgreSQL catalog-search integration tests passed, including scoped access, images and unpriced checkout rejection.
- Workspace type checks passed. Web production/macOS ARM64 app build and Android/iOS/web JS exports passed.
- Lint: zero errors, 28 existing file-size warnings; dependency boundaries passed.
- Chrome with local API: owner cart layout plus 390/768/1000/1440 px responsive checks, no page errors; image placeholder, quantity/price positions and discount access verified.
- Android 16 Expo Go: cashier cart displays thumbnail fallback, quantity controls and $18.50 quote/unit. Draft removed after checking; no sale submitted.
- Windows/native iOS runtime and authenticated macOS interaction not rerun. Exports/builds are not native runtime certification. Real external image loading is covered by component tests; the fixture product has no image.

Screenshots and browser results are alongside this report. Full image caching for offline grants is outside this presentation update.
