# Compact cart controls

Web/Tauri and native POS cart controls use smaller icon geometry, a tighter title/SKU block aligned with removal, and an inline discount-icon / quoted price / selected-unit group. Web pointer controls use the existing small-control token; native controls retain full touch targets. Discount permissions, editing, quantity arithmetic, quote/checkout and image fallback are unchanged. Native compact quantity controls also use smaller icons in their showcase and existing compact usages.

Impact is presentation only: CartLines/CartDiscount, cart CSS, native IconAction/NativeIcon/QuantityControl. No API, database, or persisted preference changes. Icon-size preferences still scale the smaller geometry. Missing quotes are not replaced by invented prices.

Verification:

- 254 tests / 117 files passed; workspace type checks passed.
- Lint: 0 errors, 28 existing file-size warnings. Dependency boundaries passed (969 modules / 5221 dependencies). Changed-file formatting and diff checks passed.
- Web production / macOS ARM64 app bundle and Android/iOS/web JavaScript exports passed.
- Chrome: owner cart, quantity and inline discount/price/unit placement checked; 390/768/1000/1440 px layouts without page overflow or page errors. Screenshot and browser.json included.
- Android 16 Expo Go: cashier cart, tighter heading/SKU, smaller controls, inline price/unit and unchanged quoted total verified; draft removed, no checkout submitted. Cashier has no discount permission, so the native discount action was not exercised.
- Windows and iOS native runtime, authenticated macOS interactions and real device accessibility services were not tested. No backend or financial behavior changed; database integration checks were not rerun.
