# Reference screen redesign

## Scope and impact map

| Layer                      | Change                                                                                                                                                                                         |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canonical design tokens    | Neutral cool surfaces and accessible blue primary shared by DOM and native; preserved dark/system themes, optional teal, density and text/motion preferences.                                  |
| Web and Tauri              | Compact centered authentication, Settings-only appearance controls, actual report dashboard, product/cart layout, inventory data table. Existing UI primitives and navigation handlers reused. |
| Native mobile              | Equivalent auth, dedicated Settings, responsive native cards and report/inventory presentation. No DOM imports.                                                                                |
| Shared API client          | Bounded permission-scoped dashboard loading through existing validated reports. No speculative metrics or unbounded downloads.                                                                 |
| Backend/contracts/database | No new endpoint, schema, migration, permission or transaction rule.                                                                                                                            |
| Offline/security           | Existing session/storage and offline authorization remain unchanged.                                                                                                                           |
| Validation                 | Unit, browser, real API workflows, exports and available native execution; results recorded below.                                                                                             |

Images guide hierarchy, spacing, blue accents and responsive layouts. Existing APIs do not provide product photos, catalog sale prices/stock to the POS picker, daily trend series or brand shares. No artificial photos, prices, growth percentages or chart series are shown. Final totals/availability remain server-quoted. Google sign-in and card providers are not configured; invitation/password and cash/authorized credit remain the existing supported flows. System fonts remain supported without downloading a proprietary reference font.

## Validation

- `npm run validate` passed formatting, foundation checks, lint/boundaries, all workspace TypeScript checks, 14 tooling tests, 160 unit tests across 78 files, and web/API builds. Final focused native TypeScript and unit reruns also passed after the native action-label refinement.
- Chrome: 16 browser tests passed, including light/dark/system, 320px/1440px layouts, Settings-only guest appearance, keyboard/focus, exact values and axe checks.
- Real API/browser suite: all 18 workflow groups passed against disposable PostgreSQL with 23 existing migrations. This includes preferences/policies, permissions, checkout/returns/credit, ledger reconciliation and the new dashboard/cart/menu layout checks. The new layout checks cover 320/390/1440px, real server quotes, preserved cart quantities across Settings, and POS accessibility. The disposable accounts/database were removed.
- macOS native WKWebView: the built frontend in an isolated Tauri host passed centered login, real authentication, protected dashboard/inventory, Settings, adding a cart item, retaining it across Settings, and light/dark surfaces. Temporary instrumentation is outside the repository and removed after validation; it is not part of the deliverable.
- Android 16 ARM64 emulator / Expo Go: session restoration, Settings preview and persisted light/dark selection, two-column product cards, add/remove cart, protected inventory quantities/units, logout and the new login screen were exercised. A literal-space child rejected by React Native was found and fixed; a TypeScript-AST tooling regression check now detects text outside native Text components. Initial emulator startup stalled; a clean headless boot succeeded.
- No new migrations are required. Existing six source-length warnings and approximately 522KB entry bundle warning remain.

`npm run build:mobile` passed final Android, iOS and web JavaScript exports. Final Chrome rerun: all 16 passed. Final native login returned to the authenticated workspace after logout. The normal macOS build (`npm run build -w @inventory/desktop -- --bundles app`) passed and produced an 11.56 MiB app bundle, which was launched successfully. The packaged binary was checked to confirm the temporary native test hooks are absent.

## Local review data and limitations

Reused the existing local `admin@example.test` account and **Design Review Store**. Added **Demo Store** and **Demo Warehouse**, and opening movements for the four existing `DEMO-*` products through authenticated APIs, only where no balance existed. Stock quantities were never overwritten. No production service or payment provider was configured.

The dashboard is a bounded snapshot from at most three authorized report queries, with explicit units and UTC reporting dates. Stock previews show up to six measures; Reports retains full server-side pagination. It does not invent historical trends, comparisons, brand shares, profit, or low-stock counts from a partial page. Existing source reports remain available.

POS uses real SKUs and units with a neutral image placeholder; its existing picker API has no image, current price or stock fields. Exact prices and availability remain part of the server quote. The catalog still owns its existing uploaded/HTTPS image support. Google sign-in, public registration and external card payments were not added from the reference artwork. The existing invitation/password, cash and authorized-credit flows remain intact.

Windows native execution is unavailable on this macOS host and was skipped. iOS JavaScript export does not qualify an iOS device build; full Xcode/Simulator is unavailable. Android Expo Go is not a signed standalone APK. Physical scanners/printers, release signing and full screen-reader qualification remain outside this visual change.

## Main files and review

- `packages/design-tokens/tokens.css`, generated native palette, `apps/web/src/theme/workspace.css`: shared visual direction and responsive composition.
- Web authentication/layout/settings, organization navigation/dashboard, POS picker/cart/summary and inventory table consumers; native equivalents remain in their existing feature folders.
- Web/native `MetricCard`, native `Surface`, action accessible labels and actual showcase examples; usage documented in `common-components.md`.
- `packages/api-client/src/dashboard.ts` and tests: bounded permission-aware reuse of existing reports. No contract, API, SQL, authorization, pricing or transaction mutation changes.
- Browser/native/unit regression checks, `tests/manual/reference-layout.mjs`, existing integration selectors updated for the actual Settings/menu/table UI, and `scripts/native-text.test.mjs`.

Visited management panels and cart state remain mounted while visiting Settings. Current error, offline, confirmation and uncertain-checkout behavior remains authoritative. Unrelated changes already present in the workspace were preserved.
