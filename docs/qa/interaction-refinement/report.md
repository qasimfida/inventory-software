# Interaction refinement verification — 2026-10-21

Scope: the requested navigation, selection, POS, inventory, workspace, notification and
preference refinements. See [implementation and impact map](../../development/interaction-refinement.md)
and [component usage](../../development/common-components.md).

## Implemented

- One content back action; consistent Radix selection throughout web/Tauri, native selection panels;
  keyboard, disabled options, form validation and reset behavior retained.
- Unified name/SKU/barcode lookup with priced suggestions, category/availability filters and the
  selected account currency. Checkout still uses the existing authoritative quote.
- Inventory search/filter/view toolbar, zebra tables and permission-aware row actions.
- Authorized business/store workspace drawer and separate guarded platform administration overview.
  Active or uncertain carts prevent workspace changes.
- Sticky scrollable web/Tauri cart; persistent native cart action opening a scrollable panel.
- Aligned profile menu, labeled theme popup, grouped preferences, five accent palettes, bundled
  Karla/Lora and permission-based installed-font discovery in compatible browsers.
- Notification preview with View all; meaningful add/scan/actions icons and accessible hints.

## Exact checks

| Check                                                                   | Actual result                                                                                |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `npm test`                                                              | Passed: 14 tooling tests and 199 Vitest tests across 96 files                                |
| PostgreSQL targeted integration                                         | 4 tests passed across catalog-search/platform-admin and dashboard suites                     |
| `PLAYWRIGHT_CHANNEL=chrome npm run test:web:browser`                    | 24 passed; includes 1,080 resolved preference combinations                                   |
| `node tests/manual/interaction-refinement.mjs`                          | 6 light/dark responsive journeys passed, no page errors, inventory axe zero violations       |
| `python3 tests/manual/interaction-native.py`                            | Android demo walkthrough passed; Expo launch needed a retry after force-stop                 |
| `npm run typecheck`                                                     | Passed across workspace                                                                      |
| `npm run lint`                                                          | Passed: zero errors, 19 documented/existing source-length warnings; no dependency violations |
| `npm run check:foundation`                                              | Passed: 69 documents, 843 source files at execution                                          |
| `npm run format:check`                                                  | Only pre-existing user-edited `AGENTS.md` remains unformatted; task files pass               |
| `npm run build`                                                         | API and web production builds passed                                                         |
| `npm run build:mobile`                                                  | Android/iOS JavaScript and web exports passed; bundled fonts included                        |
| `npm run build -w @inventory/desktop -- --bundles app`                  | macOS ARM64 application built successfully                                                   |
| `cargo test --locked --manifest-path apps/desktop/src-tauri/Cargo.toml` | 2 passed                                                                                     |
| `git diff --check`                                                      | Passed                                                                                       |

The first full test attempt caught a native JSX whitespace node. It was corrected; the full
`npm test` rerun above passed. Checks do not conceal that initial failure.

Fresh isolated PostgreSQL databases ran existing migrations twice and were retained in the
[database registry](../retained-test-databases.json). No database migration, drop, rollback or
truncation was introduced. Integration checks cover barcode/name lookup, prices, currency/stock
filters, authentication, denied permissions, tenant boundaries, validated store reports and
platform-admin authority. They are real PostgreSQL tests, not HTTP mocks.

## Runtime evidence

- Chrome: integrated journeys at 390/768/1440 px in light/dark; automated components at
  320/768/1440 px, theme/motion/density/font/palette variants, keyboard menus/dialogs and 200% text.
  See [browser results](browser-results.json), [POS](pos-1440-light.png),
  [inventory](inventory-1440-dark.png), and [preferences](preferences-390-light.png).
- Android: real Android 16 ARM64 emulator, Expo Go 58, 1080×2400 px at density 420. Demo login,
  priced SKU suggestions, adding an item, quantity increment with automatic USD 50 quote,
  persistent/scrollable cart, blocked workspace switch with active cart, dark theme, violet accent,
  bundled Karla, notification preview and View all passed. See [results](android-results.json),
  [cart](android-cart-final.png), [workspace protection](android-workspace-locked-final.png),
  [preferences](android-preferences-final.png), and [notifications](android-notifications-final.png).
- macOS: the actual packaged Tauri app launched and its dark sign-in screen was visually checked
  at 1100×760 and 760×700 logical window sizes. See [launch](macos-launch.png) and
  [narrow window](macos-narrow.png). Authenticated native WebView journeys were not rerun in this
  task; the shared web UI has the Chrome coverage above.
- Windows: no Windows host. iOS: no full Xcode/iOS simulator. Their native runtime behavior is
  unverified; iOS JavaScript export is not a native application build or device qualification.

## Boundaries and remaining risks

UI journeys used clearly marked isolated development fixtures. No real sale, stock movement or
payment was submitted. Physical scanners, camera barcode capture, printers, assistive technologies,
production identity/payment providers, signing and distribution were not qualified.

Platform-admin queries and denial paths passed real API/database tests; an authenticated admin
screen walkthrough is still recommended. All catalog pages remain bounded; filter categories expose
up to 100 active categories. This is not an unlimited category browser. Indicative prices are public
base-unit prices; tax, customer pricing, discounts and conversions remain the quote's responsibility.

Installed-font enumeration requires explicit permission and a supporting secure browser.
Native mobile/WKWebView cannot enumerate device fonts; bundled/system fonts remain available.
Variable fonts use Expo SDK 58 support; older Android versions and iOS face selection still need
qualification against [Expo's platform font guidance](https://docs.expo.dev/develop/user-interface/fonts/).
The shared Select serves existing single-selection fields; multi-select needs a dedicated component.

`npm audit --omit=dev --json` reported 22 advisories (7 moderate, 15 high, zero critical) in the
Expo/React Native dependency graph, including braces, node-forge and uuid dependency chains.
Automatic fixes proposed incompatible Expo/React Native downgrades, so no forced dependency change
was applied. Dependency remediation is outstanding and this report is not a production-readiness claim.

Review preserved checkout submission/calculations, ledger posting, auth/session handling and
existing permission enforcement. Read-only lookup/report contracts and validated preference choices
were extended as described in the impact map. No changes were committed.
