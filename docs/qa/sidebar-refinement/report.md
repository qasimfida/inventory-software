# Sidebar, preferences and role overview audit

## Implemented

- Web/Tauri sidebar resizes by pointer and keyboard, retains width when collapsed, and uses bottom connectivity/collapse utilities. Header owns the back action; POS keeps its checkout lock. Sidebar groups are denser and bold; one-route groups render directly. Workspace/user chevrons match; workspace text truncates on one line.
- Workspace switching is restricted to platform administrators and business administrators (`owner` or authorized custom `business.write`). Other roles see a disabled trigger. Single-location or whole-authorized-business views replace multi-selection on web/native. No server authorization change.
- Notifications have a visible title and compact View all icon. Header notification/theme icons are larger. Theme controls remain available at narrow widths.
- Accent aliases now tint navigation, selection, secondary controls and primary chart color on web/native. Warning/error meanings remain unchanged. Selected text was darkened after a real-browser contrast regression was detected and corrected.
- Karla, already bundled, is the default for unset font preferences. Saved system/other fonts and policy precedence are preserved. Palette layout no longer overlaps labels. Settings navigation scrolls horizontally; content uses the full available width.
- Real Radix checkbox and tabs primitives style collection selection and list/grid controls. Clear selection is an X with a Clear tooltip. Tables have a colored first stripe, header borders and right-aligned row actions. Native uses equivalent checkbox/tab controls, with a widened stock-status control.
- Overview directs platform administrators to existing application analytics, cashiers to the existing POS, and managers to reports with their server-assigned store/warehouse scope. Business-wide managers retain their granted scope; no arbitrary location is imposed.

## Verification

| Check                                         | Actual result                                                                                                                                                                                                                                                                             |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vitest unit/component suite                   | 208 tests across 101 files passed (`npx vitest run --maxWorkers=2`)                                                                                                                                                                                                                       |
| Focused navigation/checkbox/resize regression | 9 tests across 4 files passed                                                                                                                                                                                                                                                             |
| Tooling tests                                 | 14 passed                                                                                                                                                                                                                                                                                 |
| PostgreSQL integration                        | 5 tests in dashboard and settings/navigation suites passed; isolated migrations executed; test databases retained                                                                                                                                                                         |
| Chrome browser regression suite               | 24 passed, including light/dark/system, typography, portals, motion, keyboard and responsive checks                                                                                                                                                                                       |
| Additional Chrome application walkthrough     | Passed at 390, 768 and 1440px; pointer/keyboard resizing at desktop, single workspace selection, checkbox/list/grid, palette propagation, small/large text, settings overflow, cashier/manager landings; zero reported runtime errors and zero axe violations in checked preference views |
| Lint / boundaries                             | 0 errors; 23 existing source-length warnings; no dependency violations                                                                                                                                                                                                                    |
| Foundation checker                            | Passed; source extraction keeps CatalogProducts below review threshold                                                                                                                                                                                                                    |
| Type checks                                   | Workspace `npm run typecheck` passed; final root, web and mobile TypeScript checks also passed after the last edits                                                                                                                                                                       |
| Production builds                             | Web/API passed; Expo Android, iOS and web JS exports passed; final macOS ARM64 Tauri `.app` build passed (12.22 MiB)                                                                                                                                                                      |
| Formatting / diff                             | Task files pass formatting; whole-repository check flags only pre-existing AGENTS.md; `git diff --check` passes                                                                                                                                                                           |

Additional browser verification confirmed the Notifications heading, 16px View all icon, and light-theme overview.

Artifacts: [browser results](browser-results.json), [Android results](android-results.json), screenshots in this directory. `tests/manual/sidebar-refinement.mjs` and `tests/manual/sidebar-native.py` exercise local fixtures, not production transactions.

Android automation was stabilized by waiting for navigation after native drawer dismissal. Final walkthrough steps passed.

Android 16 ARM64 / Expo Go 58: real emulator login, workspace panel, POS filters/searchable options, theme/preferences and inventory list/grid checked at 1080×2400. macOS ARM64: real Tauri `.app` built and launched to sign-in (1100×760 window); authenticated shell behavior was checked in the shared web renderer, not repeated in native WebView. Windows native runtime unavailable on this host. iOS native verification blocked by missing full Xcode/simulator; mobile JS exports cover both platforms without claiming native qualification.

No new migrations, financial/inventory calculations, API wire contracts or backend permission changes. UI capability and landing routing use existing server facts. Five database tests verify authoritative scope; no real sale, payment or stock mutation was made by the visual walkthroughs. The superadmin destination is covered by navigation tests; a fresh authenticated platform-admin browser session was not exercised in this pass.

The working tree contained extensive pre-existing changes. This task preserved unrelated work and did not commit. Whole-repository formatting also reports pre-existing AGENTS.md formatting; it was intentionally preserved. Two small existing-stack Radix primitives (checkbox/tabs) were added, with no additional UI framework. Component props, keyboard behavior, native equivalents and showcase examples are documented in [common components](../../development/common-components.md).

## Main implementation locations

- `apps/web/src/shell`: AppShell, Sidebar, SidebarResizeHandle, Header, WorkspaceSwitcher, NotificationMenu, ProfileMenu and WorkspaceScreens.
- `apps/web/src/theme/sidebar-refinement.css`: responsive shell, accent aliases, collection controls and table presentation.
- `apps/web/src/components`: Checkbox, ViewTabs, RecordCollection and RowActions; catalog/inventory/POS consumers updated. Catalog ProductImage extracted to keep its parent cohesive.
- `apps/mobile/src/shell`, `ui`, `inventory`, `settings`, `theme.tsx`: native equivalents and role landing.
- `packages/api-client/src/workspace-navigation.ts`: shared UI capability and overview destination; `packages/contracts/src/settings.ts`: unset default font only.
- Showcase remains `/#/design-system`; NavigationControlsDemo renders the updated actual selection components.
