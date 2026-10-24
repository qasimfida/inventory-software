# Overview and currency QA — 2026-10-21

Implementation, impact map and calculation semantics: [overview and currency](../../development/overview-currency.md).

## Results

| Check                                                  | Actual result                                                                                                                                                                                                 |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`                                    | Passed: shared packages, API, web, mobile and root tooling/test types                                                                                                                                         |
| `npm run lint`                                         | Passed: 0 errors; 20 existing source-size warnings. Dependency cruiser: 797 modules / 4,135 dependencies, no violations                                                                                       |
| `npm test`                                             | Passed: 14 tooling tests; 95 Vitest files / 195 tests                                                                                                                                                         |
| Focused PostgreSQL integration                         | 2 files, 3 passed, 1 deliberately excluded. Overview tests and the account-settings persistence/isolation test; no full integration-suite claim                                                               |
| Existing migrations                                    | Up migrations executed twice by each fresh integration fixture, including no-op re-execution; no new migrations. Databases retained, no down/drop cleanup                                                     |
| `PLAYWRIGHT_CHANNEL=chrome npm run test:web:browser`   | 24 passed on final run. An earlier run was interrupted by a concurrent shared build causing Vite navigation; no assertions were weakened                                                                      |
| `node tests/manual/overview-currency.mjs`              | 6 browser walkthroughs: 390/768/1440 CSS px × light/dark, no page overflow, no runtime exceptions, 0 axe WCAG A/AA violations in the overview                                                                 |
| Android Expo Go                                        | Android 16 ARM64 emulator, 1080×2400 (density 420): overview panels, 7-day period, expandable exact daily values, Settings currency selection to PKR and correctly empty PKR sales; passed with demo fixtures |
| `npm run build`                                        | API and production web build passed                                                                                                                                                                           |
| `npm run build:mobile`                                 | Android, iOS and Expo web JS exports passed; not native release binary qualification                                                                                                                          |
| `npm run build:desktop`                                | Rust release binary and macOS `.app` compiled. DMG packaging failed because this terminal cannot send Apple events to Finder                                                                                  |
| `npm run build -w @inventory/desktop -- --bundles app` | Passed: macOS ARM64 `.app` bundle, 12.03 MiB; launched, visual interaction remains unverified in locked session                                                                                               |
| `npm run check:foundation`                             | Passed; document links and source review thresholds checked                                                                                                                                                   |
| `npm run format:check`                                 | Only the pre-existing user-edited `AGENTS.md` is unformatted; left intact. All task-owned files formatted                                                                                                     |
| `git diff --check`                                     | Passed                                                                                                                                                                                                        |

Browser screenshots and machine-readable results are in this directory. `tests/manual/overview-currency.mjs` logs into the existing explicitly enabled demo workspace on port 5188, tests actual UI components, then changes currency via Settings. The native walkthrough is `tests/manual/overview-native.py`; it requires an already signed-in demo owner and the existing emulator/ADB path. These are development-only fixture checks, not production transaction claims.

The PostgreSQL tests use real API controllers, validation, authorization and migrations. They create an isolated business/account/catalog fixture, post a cash sale twice with the same idempotency key, verify one sale in the dashboard, reconcile trend/top-product totals, check exact stock, return an item, and verify gross sales remain explicitly gross while stock changes. They reject unauthenticated, cross-business, missing-permission and malformed query requests, and verify custom-role category restrictions and a different warehouse scope. Settings tests verify PKR persistence, account isolation, stale writes and invalid currency rejection. Isolated databases are recorded in [retained databases](../retained-test-databases.json); cleanup was not authorized.

Integration selection (with `TEST_DATABASE_URL` supplied from the local test environment and `TEST_RETAIN_DATABASES=true`):

```sh
npx vitest run --config vitest.integration.config.ts \
  apps/api/src/reports/dashboard.integration.test.ts \
  apps/api/src/settings/settings.integration.test.ts \
  -t "reconciles bounded|rejects unauthorized|isolates preferences"
```

## Limits

- macOS graphical session is locked (`CGSSessionScreenIsLocked=true`), so this turn does not verify desktop visual interaction. Tauri uses the tested web UI. Native integration behavior, printing and scanner hardware were not changed or re-qualified.
- No Windows host; Windows build/runtime not tested. Full Xcode/iOS simulator is absent; iOS has JS export evidence only.
- No signed release, production provider, load/throughput, screen-reader or physical-device certification. Existing Vite configuration deprecation, jsdom canvas and Node SQLite experimental warnings remain.
- Gross sales are before returns/void compensation, not net revenue/profit. Growth needs a nonzero prior-period baseline. Catalog images and historical product growth were not invented.
- Currency is an account-level overview filter, default USD; existing transaction currencies and prices are unchanged. No FX conversion or new checkout default policy was introduced.
- Existing preferences and workflow logic are preserved. New changes are limited to the reports read model, new currency option in existing settings, feature-local overview panels, targeted tests and documentation. Extensive pre-existing workspace changes were not reverted or committed.
