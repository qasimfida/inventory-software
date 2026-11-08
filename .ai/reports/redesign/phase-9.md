# Phase 9 — Responsive, accessibility and performance qualification

## Outcome and scope

Executed Phase 9 on `redesign/phase-9`. Available automated checks pass after the fixes below. **Release/device qualification remains incomplete**: Windows, native mobile, screen readers, peripherals and authenticated installed-desktop transactions were not verified. No claim of full WCAG conformance or universally unchanged performance.

Read AGENTS, global/Phase 9 prompts, canonical design/development/security guidance, Phase 1 baseline, live route registries/dispatchers, existing browser suites, shell retention, POS invalidations, catalog live subscriptions, native panels/controls and Tauri configuration. Preserved unrelated working-tree changes. No commit/tag; a tag cannot include this uncommitted implementation. No Phase 10 work.

## Fixes and preserved behavior

- Online-store Radix tabs now own a real labelled tab panel. Previously the selected tab's `aria-controls` referenced a nonexistent element. Existing routing, drafts and authorization are unchanged.
- Catalog view panel remains mounted through loading/error states so list/grid controls keep a valid accessible target. Its products, pagination and actions are unchanged.
- Web/Tauri and native shells pass current POS visibility to their retained checkout. Idle hidden checkout stops its three-second invalidation poll. Nonempty carts, held carts, pending work and uncertain transactions keep polling; returning to idle POS starts an authoritative revision read. Drafts/models are not unmounted. Tests verify pause/resume and retained draft behavior.
- Native SidePanel now places its content and footer inside KeyboardAvoidingView, preserving safe-area boundaries, native scroll keyboard insets and dismiss/resizing controls. Actual keyboard behavior still requires emulator/device verification.
- Updated obsolete tests to target the merged Inventory workflow, current empty-state label and approved light theme default. Added WebView bridge adapters to two jsdom native suites; these adapters do not qualify the real editor or device bridge.
- Added full-route axe/overflow qualification tooling and a production bundle review guard, exposed as `npm run check:redesign-budget`. Development guide records the guard and conservative retained-POS lifecycle rule.

No API, schema, permissions, stock, money, checkout identity/recovery, settings precedence/persistence or offline authority changes. Security/session and outbox processing remain running as before. Shared catalog sockets already use one connection per business with callback cleanup; no duplicate socket/cache or virtualization library added. Existing shared components/showcase were reused, including the native panel; no new UI primitive.

## Routes, states and source review

`phase-9-validation/verified/browser-results.json` is the per-route evidence matrix, including headings, final destinations, alerts, overflow, axe findings and screenshots. It covers all 56 inventory rows; native-only `/more` is explicitly not applicable to browser testing. Auth recovery without a token and compatibility redirects are recorded as their actual rendered destinations, not as completed authenticated workflows.

| Area                                             | Review and evidence                                                                                                                                                                                                                          |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shell, navigation, settings                      | Collapsed navigation, resizing/focus return, overflow tabs, light/dark/system selection, preferences layout and drawer/menu primitives.                                                                                                      |
| POS, sales, cash                                 | Retained checkout lifecycle, cart/quote/recovery tests, six-width POS captures, bounded 25-card list and search latency. Real scanner/printing and financial posting not exercised.                                                          |
| Inventory/catalog/categories                     | Product list/grid, stable tab target during loading, pagination/selection controls, empty/error/denied/offline/slow scenario captures.                                                                                                       |
| Warehouse/storage/transfers, purchasing/payables | Normal-state route captures, 320 px text stress, shared tables/forms/panels and existing unit regressions. Not proof of real database transactions.                                                                                          |
| Customers/team/staff                             | Normal-state captures, retained-draft and role-removal regressions, narrow/text-scale layouts.                                                                                                                                               |
| Accounting/reports/trading/integrations          | Exact table/summary access retained; existing chart presentation preferences and lightweight renderers unchanged. No heavy rendering dependency introduced.                                                                                  |
| Notifications/logs/admin                         | Route captures and axe scans with owner/superadmin mock roles; actual view targets recorded.                                                                                                                                                 |
| Online store                                     | Overview/products/settings capture coverage, corrected tab semantics, picker/details/removal/history/offline/permission and unsaved-settings workflow tests.                                                                                 |
| Native shell and UI                              | Navigation stack/retained screen dispatch, accessibility hiding for inactive views, safe areas, keyboard wrapper, labelled native controls, touch minima and scaling inspected. Source parity and RN-web tests are not device qualification. |

Browser captures cover 320 and 1440 px in both themes for every web destination, plus 844×390, 1024×900, 1280×900 and 1920×900 for POS, inventory and preferences. Twenty major workspace pages also passed 320×600/200% text overflow probes. These detect page overflow, not every internal truncation or gesture defect. Foundation tests specifically exercise short-viewport menus/dialogs at 200% text.

## Checks and exact results

All paths below are relative to `.ai/reports/redesign/phase-9-validation/`.

| Check                                        | Result / evidence                                                                                                                                                                                                                       |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full Vitest, `npx vitest run --maxWorkers=2` | Final **226 files / 603 tests passed**, 93.08 s (`tests-final.log`).                                                                                                                                                                    |
| Focused POS tests                            | **5 files / 11 tests passed**, including idle pause/resume and draft retention (`pos-tests-final.log`).                                                                                                                                 |
| Repaired existing shell/entry/trend tests    | **4 files / 8 tests passed** (`regressions-final.log`).                                                                                                                                                                                 |
| Foundation/responsive/auth Playwright        | **11 passed**, 27.4 s (`accessibility-verified.log`): axe, keyboard navigation, skip link, focus trap/return, dismissal, errors, themes, reduced motion and 200% text.                                                                  |
| Online-store Playwright                      | **3 passed**, 25.2 s (`online-workflows.log`): collection, details/history/picker/removal, offline/role controls, setup enablement and drafts.                                                                                          |
| Full-route qualification                     | **264 captures; 200 axe scans; zero axe violations, blocked captures or document overflows** (`verified/`). Twelve recorded resource-error entries are intentionally blocked external mock images, not page exceptions or API failures. |
| Text stress                                  | **20/20 pages without document overflow** at 320 px / 200% text (`text-scaling.json`). No account preference writes.                                                                                                                    |
| TypeScript                                   | `npm run typecheck` passed, including native and test types (`typecheck-verified.log`).                                                                                                                                                 |
| Lint/boundaries                              | Full lint **0 errors / 70 warnings**; no violations across 1,324 modules / 7,567 dependencies (`lint.log`). Later changed test/tool files pass scoped lint (`lint-final-files.log`).                                                    |
| Formatting/diff                              | Scoped Prettier checks and task-file `git diff --check` passed. Unrelated files preserved.                                                                                                                                              |
| Foundation / route / docs / parity           | Passed: 66 documents, 1,445 source files; 56 route rows; four concise canonical guides; 41 shared routes, 45 web/45 native, 9 settings each.                                                                                            |
| Design guard                                 | 0 new groups, 5 improved groups; 6 existing review findings (`audit.log`).                                                                                                                                                              |
| Redesign/design tooling tests                | **9 passed** (`tooling.log`).                                                                                                                                                                                                           |
| Web / macOS bundle                           | Tauri build's web TypeScript/Vite production build passed; macOS release `.app` built, **12.53 MiB** (`desktop-build.log`).                                                                                                             |
| Mobile                                       | Android/iOS/web Expo export passed (`mobile-build.log`), not installed native binaries.                                                                                                                                                 |
| Production size guard                        | Passed (`budget.json`): JS +4.13%, CSS +8.94% versus Phase 1; both below 10% review limit.                                                                                                                                              |
| Database integration                         | Not run: isolated `TEST_DATABASE_URL` unavailable. No replacement production/development database used.                                                                                                                                 |

Initial failures are retained: first complete unit run was 222 files passed / 4 failed, 596 tests passed / 3 failed, plus two suite-import failures. Causes were retired navigation labels, changed empty-state wording and native WebView import handling. All affected assertions remain meaningful after correction. Initial foundation run was 8 passed / 1 failed due to the obsolete theme-default assertion. An intermediate browser run was interrupted by rebuilding shared assets/HMR; final browser runs occurred without source/build activity. No assertions were relaxed to suppress axe findings.

Known tooling warnings: jsdom canvas is unavailable; some browser tests change the hash directly and emit router blocker warnings, while the ordinary navigation draft-guard assertions pass. Existing Vite config-loader/color warnings remain. Size warnings for cohesive checkout/panel/editor/test tooling files are reviewed, not hidden through baseline regeneration.

## Performance versus Phase 1

Same Chrome/mock fixture, 1440×900, fixed date, local machine and runner. Development timing includes automation/debounce; not production INP. Recorded samples:

| Metric              | Phase 1     | Phase 9                                          |
| ------------------- | ----------- | ------------------------------------------------ |
| Cold POS readiness  | 239 ms      | 245 ms (+2.51%)                                  |
| Warm POS median     | 131.5 ms    | 136 ms (+3.42%); samples 67, 207, 77, 195        |
| Search median       | 394 ms      | 399 ms (+1.27%); samples 374, 451, 399, 441, 381 |
| All JS chunks, raw  | 1,663,917 B | 1,732,603 B (+4.13%)                             |
| All CSS chunks, raw | 127,764 B   | 139,187 B (+8.94%)                               |

Phase 9 gzip totals: JS 534,469 B; CSS 24,796 B. All-chunk totals are not initial-route payload. Measurements remain within the documented 10% review threshold, but literal “never slower” is not established by these samples. A controlled production/device benchmark remains required before a stronger claim.

Large-list review: current POS fetch remains bounded, search debounce/cancellation and cursor/page semantics unchanged. Product imagery uses existing lazy/fallback handling. Inactive screens remain mounted to retain drafts; only proven idle POS polling was reduced. Shared event callbacks may still update retained screens after real catalog changes, intentionally preserving consistency. Security polling, pending transactions and offline synchronization were not suppressed. No evidence justified virtualization or a new library.

## Platform qualification and manual checklist

| Platform      | Actually verified                                                                                                                                                                                     | Open checks                                                                                                                                                                                                 |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web/Chrome    | Route/theme/viewport sweep, axe, focus/keyboard/dialog behavior, text stress, mock workflows, unit tests and production build                                                                         | Real API workflows, physical scanner/printer, production offline restart, browser/OS screen readers, exhaustive preference combinations.                                                                    |
| macOS/Tauri   | Built release app, launched actual WKWebView sign-in, visually checked default 1100×760 window and resized to **480×600**; `desktop-runtime.png` and `desktop-narrow.png`. App quit after smoke test. | Authenticated workflows, vault/restart, printing/scanner, deep links, modal focus with VoiceOver, signing/notarization/installer upgrade. Launch rendering is not complete qualification.                   |
| Windows/Tauri | Shared web source/build path reviewed                                                                                                                                                                 | **Not verified:** no Windows host/WebView2/installer environment.                                                                                                                                           |
| iOS/Android   | Source parity, tests using RN-web adapters, TypeScript and Expo exports                                                                                                                               | **Not verified:** adb absent and `xcrun simctl` unavailable (`environment.json`). Native safe areas/keyboard/footer, orientation, camera/scanner, checkout, storage and gestures need device/emulator runs. |

Manual assistive-technology checks, all **Not verified** unless noted:

- **VoiceOver macOS:** landmarks/headings, sidebar/tab navigation, product selection, form errors, drawer focus/trap/return, live quote/sync announcements and exact table values. Actual Tauri sign-in rendering alone does not verify VoiceOver.
- **VoiceOver iOS:** native modal focus isolation, swipe order, Dynamic Type, keyboard avoidance, safe areas, actionable errors and landscape cart/checkout.
- **TalkBack Android:** equivalent navigation/modal/collection reading, large font/display scale, keyboard/back dismissal, scanner permission and offline state announcements.
- **NVDA Windows:** Chrome and installed WebView2 landmarks/tables, menu/combobox semantics, tab/shift-tab focus, drawers and error/live status reading.
- **Physical touch:** native 48 px control minima inspected; actual touch accuracy and coarse-pointer interactions not qualified. Browser axe target-size checks are not a physical-device test.
- **Contrast/motion:** automated applicable axe rules and foundation reduced-motion checks passed; custom palette combinations, native contrast and all transient states still require manual review.

No discovered route-level axe/overflow issue remains unreviewed in this run. The manual/device checklist is deliberately open, so Phase 9 is not a blanket accessibility or release sign-off.

## Files and evidence

Application files modified: web `OnlineStorePage`, `CatalogPanel`, `WorkspaceScreens`, `PosPanel`, `PosCheckout`; native `NativeScreens`, `PosPanel`, `PosCheckout`, `SidePanel`.

Tests modified: `tests/browser/design-system.spec.ts`, web `ManagementWorkflows.test.tsx`, `RegistrationTrend.test.tsx`, native `entry.test.tsx`, `ManagementPanel.test.tsx`. Added web `PosCheckout.test.tsx`.

Tooling/docs: added `scripts/redesign-qualification.mjs`, `scripts/redesign-budget.mjs`; updated `package.json` and `docs/development.md`. Added this report and validation artifacts; no application files removed. Exact paths in `changed-files.json`; task-start snapshot and `scoped.diff` distinguish these changes from unrelated earlier work.

Next step: review results and execute the open real-device/screen-reader release checklist. Stop here; do not start the next phase automatically.
