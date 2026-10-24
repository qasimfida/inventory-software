# Cart quantity and settings visibility fixes — 2026-10-23

## Changes and impact

| Layer                | Change                                                                                                                                                                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared cart behavior | `packages/api-client/src/cart-lines.ts` combines matching SKU, unit, stock location and manual-discount choices using exact six-place decimal arithmetic. Different choices remain separate. Adding to an older draft folds matching duplicate rows into one. |
| Online POS           | `PosModel.add` uses the shared rule, invalidates the quote and preserves existing busy/uncertain checkout locks. Existing items can increment at the 50-line limit; additional distinct lines cannot exceed that limit.                                       |
| Cached checkout      | `OfflineVault.append` uses the same rule inside its existing encrypted compare-and-swap update. Concurrent additions and restart retain the combined quantity. Already queued sale commands are not changed.                                                  |
| Navigation           | Shared route requirements hide Business and Company profile without `business.write`, and Stores & terminals without `locations.write`. Sidebar, search, settings tabs and direct-route guards consume these same requirements.                               |
| Extra shortcuts      | Web/desktop profile menus and native profile screens now use the permitted route list for Business settings. Personal preferences, security and profile remain accessible to cashiers.                                                                        |
| Platforms            | Web and Tauri share the web shell; Expo owns its native shell. Both online and cached cart models are shared across the platforms.                                                                                                                            |

No API, database, migration, backend permissions, submitted receipts, stock ledger or financial posting changes. Existing server price/stock validation remains authoritative; a merged draft gets a fresh quote. No dependency added.

## Verification

- `npx vitest run --maxWorkers=4`: **251 tests passed in 116 files**. New coverage includes repeated online adds/requoting, exact fractional quantities, legacy duplicate rows, different units/locations/discounts, invalid quantities, the line limit, uncertain-cart protection, concurrent encrypted cached additions/restart and permission-filtered settings.
- `npm run test:tooling`: **14 passed**.
- `npm run typecheck`, shared builds and final root TypeScript check: passed.
- `npm run lint`: passed with **0 errors and 28 file-size warnings**; dependency boundaries passed, 966 modules and 5,214 dependencies.
- Changed-file Prettier checks and `git diff --check`: passed. Existing unrelated working-tree changes were preserved.
- `npm run build -w @inventory/desktop -- --bundles app`: web production build and macOS ARM64 app bundle passed (12.27 MiB).
- `npm run build:mobile`: Android, iOS and web JavaScript exports passed.
- Foundation checks passed. No migrations or PostgreSQL integration suite were rerun because this change does not alter the backend.

## Runtime evidence

`tests/manual/cart-role-fixes.mjs` uses real local development accounts/API, not mock responses. [Browser results](browser.json): cashier added the same product three times; one cart line held quantity 3. Business/Company/Stores settings were absent from sidebar/tabs, the profile shortcut was absent, and direct Business settings access displayed the route guard. The owner retained the Business settings route and menu item. No browser runtime errors were recorded. Chrome viewport: 1440 × 1000.

[Android results](android.json): Android 16 ARM64 emulator, Expo Go, 1080 × 2400; cashier added the same product three times, producing one line, quantity 3 and the real $55.50 quote. Native profile no longer exposed Business settings. The test removed the draft afterward. See [cart](android-cart.png) and [profile](android-profile.png).

The actual macOS Tauri app was rebuilt and launched. Cashier sign-in reached POS and repeated product additions produced a single increasing-quantity row. See [macOS POS](macos-pos.png). Browser tests verify the shared desktop navigation implementation; this pass did not exercise every desktop setting.

No sale/payment was submitted. Cached race/restart behavior was tested against the encrypted vault implementation; a full offline device-sale/sync journey was not repeated. Windows execution and native iOS device/simulator execution remain unavailable on this host; exports do not qualify those native platforms.
