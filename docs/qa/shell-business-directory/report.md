# Shell, drawer and registered-business verification — 2026-10-22

## Delivered

- Settings tabs use the shared secondary surface. Overflow has end chevrons, no visible scrollbar, and directional edge fades. Existing Radix keyboard selection and route destinations remain intact. An inherited cross-axis alignment rule that caused overflow was corrected.
- Desktop sidebar collapse/expand straddles its resizable border; narrow layouts retain the navigation drawer. Header controls share the 22px token and thin semantic dividers.
- Real Radix tooltips replace title bubbles on common buttons, icon controls, sidebar links, the resize handle and view controls. Tooltip state is namespaced so it cannot overwrite tab/menu selected state. The old CSS-only rail tooltip was removed.
- Vaul/shadcn drawers replace operational form, product-detail and mobile-web navigation sheets. Existing `FormSheet` exports remain compatible. The initial focus goes to a form field or the labelled container; Escape, close, and controlled dismissal retain their contracts. Native uses safe-area panels with reduced-motion-aware transitions.
- Workspace/profile identities share dimensions, typography, spacing and shape preferences; logos are clipped to the selected shape. Preferences dialogs have an 800px maximum, bounded by the viewport.
- Platform overview now links to `/#/admin/businesses`. The directory has cancellable search, status filters, list/grid, existing pagination/incremental-load preferences, and Add business using the existing audited creation flow. Nested location pages load only on expansion. Business, store and warehouse names open registration details in a drawer. Native has equivalent cards, expandable location lists and detail panels.
- Checkout is outside the cart's scrolling content on web/Tauri and native. Existing server quote, confirmation, uncertainty, permission and cash safeguards remain in place. Opening review reveals its fields without performing a sale.

## Scope and ownership

Common components: `apps/web/src/components/ui/{Tooltip,Drawer,Button}.tsx`, `components/common/{OverflowTabs,FormSheet,ViewTabs}.tsx`; shell presentation in `theme/shell-controls.css`, `AppShell`, `Header`, `Sidebar`, `ProfileMenu`, `ProfileIdentity` and `SettingsPage`. Actual local examples are under `/#/design-system` in **Navigation, drawers and record selection**.

Business directory: `apps/web/src/features/platform/`, `apps/mobile/src/platform-businesses/`, `packages/contracts/src/platform-businesses.ts`, `packages/api-client/src/platform-businesses.ts`, and `apps/api/src/security/platform-businesses.controller.ts`. The new read endpoints recheck platform authority on every request, return bounded minimal registration data, and validate queries/responses. Existing business-creation semantics are reused. No migration, financial calculation, stock posting, password/token handling, offline grant or permission rule was changed. The pre-existing dirty workspace was preserved; no commit was made.

See [component contracts and examples](../../development/common-components.md), [directory behavior and authorization](../../development/platform-business-directory.md) and [impact map](plan.md).

## Automated evidence

| Check                                           | Actual result                                                                                                                                                                                                                                                   |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`                             | Passed across shared packages, API, web and mobile, including mobile test types.                                                                                                                                                                                |
| `npm test` tooling phase                        | 14/14 tooling checks passed. Initial component run exposed drawer focus issues; fixed and rerun below.                                                                                                                                                          |
| `npx vitest run --maxWorkers=4`                 | 106 files, 220 tests passed. Includes new nested-directory, tooltip-state and tab-overflow regression tests.                                                                                                                                                    |
| PostgreSQL directory integration file           | 4/4 passed against a real isolated database, with up migrations executed twice. Verifies unauthenticated/role denials, revoked platform authority, literal search, invalid queries, bounded independent pagination, missing records and location scoping.       |
| `PLAYWRIGHT_CHANNEL=chrome npx playwright test` | 24/24 passed. Includes theme/preference combinations, focus, menu keyboard handling, native date semantics, reduced motion, contrast/axe checks and responsive widths 320/768/1440px. The former CSS-tooltip assertion now checks the actual portalled tooltip. |
| `npm run lint`                                  | Passed, 0 errors; 23 existing source-length warnings. Dependency boundaries: 880 modules / 4640 dependencies, no violations.                                                                                                                                    |
| Formatting                                      | Changed source files pass Prettier. Whole-workspace formatting still flags the pre-existing user-maintained `AGENTS.md`; it was preserved.                                                                                                                      |
| `npm run build`                                 | API and production web build passed.                                                                                                                                                                                                                            |
| `npm run build:mobile`                          | Android, iOS and Expo web JavaScript exports passed. This is not native iOS/Windows execution.                                                                                                                                                                  |
| `npm run build:desktop -- -- --bundles app`     | macOS ARM64 `.app` build passed (12.22 MiB).                                                                                                                                                                                                                    |
| Diff review                                     | No whitespace errors; new API surface is limited to the requested platform directory. New dependencies are Radix Tooltip and Vaul; no additional frontend framework.                                                                                            |

The final targeted web/common tests passed 10/10; native POS/panel and dashboard follow-up tests passed 4/4 after the native layout correction.

Test database `auth_test_92dc1ed070dd46f99e7bb414b941a7da` was retained, as required by repository instructions; no rollback/drop commands were run. It is recorded in the retained-database registry. Full historical integration suites were not rerun: this pass ran the new directory integration tests plus the unit/browser regression suites.

## Running application evidence

- **Chrome, live PostgreSQL API:** superadmin login, platform overview link, nested stores/warehouses, business and warehouse drawers, Escape, grid, search empty/recovery, Add business drawer focus/dismissal, sidebar placement/tooltips, enlarged preferences and logout. Viewports: 1440×1000, 768×1000 and 390×1000. No page errors. [Recorded checks](browser-results.json).
- **Chrome, isolated demo:** 25 cart items at 1440×900 and 390×900. Checkout remains in the same position while the cart scrolls; payment review opens. No axe violations in the cart, no page errors, and no sale submitted. [Recorded checks](cart-results.json).
- **Android 16 ARM64 emulator / Expo Go, 1080×2400:** real API login, platform directory, actual business/location expansion and drawer, grid, settings tab chevrons, preferences popup and logout. [Recorded checks](android-directory-results.json). The API used the retained isolated development database; no business mutation was submitted in this walkthrough.
- **Chrome, retained isolated development database:** Add business submitted successfully (201), directory refresh/search returned the created business, and expansion showed the genuine empty-location state. The uniquely named test business is retained: [creation evidence](create-result.json).
- **Android cart:** fixture product selection, cart drawer/footer, Checkout opening cash-review fields, close and logout passed. Native layout completion is now handled before scrolling the review into view. [Recorded checks](android-cart-results.json). No sale was submitted.
- **macOS Tauri:** built the actual `.app` and launched its sign-in window. Authenticated native interaction could not be completed through the available GUI automation. The launch showed a saved-session verification warning; this pass does not claim the authenticated macOS journey is verified. Web shared-renderer results are distinct from native runtime verification.

## Limits and follow-up

Windows execution and an iOS native simulator/device are unavailable on this host. Native tabs use swipe/chevrons rather than CSS edge masks; native panels use the platform modal transition. The directory is online-only and platform-admin-only, with registration details rather than unrestricted tenant operational data. Locations show their store reference identifier. Business creation retains the existing non-retried mutation contract; inspect registrations before retrying an uncertain response.

No live sale/payment was submitted by these UI checks. Full hardware scanner, printer, filesystem, signed installers and production deployment qualification remain outside this pass. Compilation alone is not treated as platform verification.
