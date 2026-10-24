# Inventory UI enhancements — 2026-10-21

## Scope and changes

The implementation follows [the impact map](../../development/inventory-enhancements.md). Shared web/Tauri tables now use separated, softly rounded rows and existing semantic status badges. Search remains visible with a leading icon, conditional clear action and bounded suggestions. Inventory supports list/grid presentation and a viewport-constrained 432 px product details drawer. Profile menus have a fixed 288 px width, initials avatar, account identity, business role and menu icons. Sidebar labels stay on one line; pagination and collapse icons use larger sizing. Quantity actions have filled backgrounds with a transparent, borderless quantity field.

Account preferences add **List loading: pages / scroll** and **Control shape: rounded / circle**. Existing settings persistence, policy precedence and version checks are retained. Older saved settings resolve to pages/rounded. Scroll mode retains visited rows, uses existing bounded endpoints, and provides an accessible Load more fallback. Numbered navigation is hidden for one-page results. Multiline fields and content surfaces retain practical corners.

The settings popup now opens its fields immediately. Compact table padding was corrected after the browser regression test detected a 35.5 px row instead of the existing 34 px target.

## Verification

| Check                                                | Result                                                                                                                                                                                                                                                              |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npx vitest run`                                     | 93 files, 191 tests passed. Includes settings visibility, page merging/scope reset, preference schemas, pagination and list/grid drawer tests.                                                                                                                      |
| `npm run test:tooling`                               | 14 passed.                                                                                                                                                                                                                                                          |
| Targeted PostgreSQL integration run                  | 2 files, 4 passed, 1 outside the selected test filter skipped. Settings persistence/account isolation and authorized stock projection checks passed; migrations ran through both integration fixtures. Test databases were retained.                                |
| `npm run typecheck`                                  | Passed shared packages, API, web, native application/test TypeScript and root checks.                                                                                                                                                                               |
| `npm run lint`                                       | Passed; 0 errors, 20 file-length warnings. Dependency boundaries passed: 784 modules, 4,029 dependencies.                                                                                                                                                           |
| `PLAYWRIGHT_CHANNEL=chrome npm run test:web:browser` | 24 passed. Includes compact tables, keyboard focus, menus/dialogs, large text, themes, motion preferences and responsive layouts.                                                                                                                                   |
| `node tests/manual/inventory-enhancements.mjs`       | Six light/dark walkthroughs at 390, 768 and 1440 px: permanent search/clear/suggestions, one-page pagination hidden, grid/details drawer, circle/scroll preferences, automatic append of 25 to 36 products, return to page navigation, no horizontal page overflow. |
| `npm run build`                                      | API and web production bundles passed.                                                                                                                                                                                                                              |
| `npm run build:mobile`                               | Android/iOS Hermes bundles and Expo web export passed. This is not a signed native binary or iOS runtime test.                                                                                                                                                      |

`npm run build:desktop -- -- --bundles app` passed and produced the 12.03 MiB macOS release application. The rebuilt process launched with a 1100 × 760 window, but the window capture remained blank while the macOS session was locked (`CGSSessionScreenIsLocked=true`). A separate WKWebView diagnostic loaded the production bundle and reached the existing hidden-view session-loading state without a reported JavaScript exception. This does **not** verify the native desktop UI: repeat the walkthrough on an unlocked desktop. Session visibility protection was preserved. The window capture is `macos-app.png`.

`npm run check:foundation` passed (65 documents, 804 source files). `git diff --check` passed. `npm run format:check` reports only the pre-existing, unrelated `AGENTS.md` formatting; changed implementation and documentation files are formatted. The full `validate` chain therefore remains blocked by that existing formatting issue.

The PostgreSQL selection was `vitest run --config vitest.integration.config.ts apps/api/src/settings/settings.integration.test.ts apps/api/src/inventory/stock-overview.integration.test.ts -t "isolates preferences|includes zero|uses the business|rejects unauthenticated"`, using the available local test database configuration and retained-fixture mode. Database names are recorded in `../retained-test-databases.json`; no credentials are included here.

Browser presentation walkthroughs use the existing mock transport and local demonstration identity/business. They do not post real inventory or financial transactions. PostgreSQL checks cover real database boundaries separately. Earlier screenshot retries interrupted by shared-package rebuild/HMR are not counted as passing tests.

Android 16 Expo Go was exercised on the running 1080 × 2400 emulator: sign-in, stock overview/status navigation, header and bottom preference access, native profile panel, circle/scroll choices, grid/product drawer with the selected SKU, and automatic scroll append through HP-036. See `android-results.json` and the Android screenshots in this directory. This is development-shell evidence, not release APK/device qualification.

## Boundaries and remaining qualification

- No stock/price/payment calculations, posting transactions, permissions, authentication protocol or database migrations were changed for this task. The settings request schema necessarily adds the two requested preference keys; deploy updated API validators before updated clients.
- Inventory details use the authorized stock overview projection: name, SKU, base unit, availability and stock status. Photos and catalog descriptions absent from that response are not fabricated.
- Previously loaded scroll pages are in-memory snapshots. Changing account/business/filter/detail scope clears them. Refreshing a current page does not establish a live subscription for previously loaded pages.
- Profile initials/name derive from the email supplied by the existing identity contract; no profile photograph or separate display-name field is available.
- Windows execution was not possible on this macOS host. iOS simulator/device testing requires full Xcode and the native toolchain; JavaScript export alone does not verify native iOS behavior.
- The workspace contained extensive earlier uncommitted work. It was preserved; this report does not certify unrelated historical changes or all business workflows.
