# Phase 7 — Platform administration

Scope: platform-admin only on redesign/phase-7. No commit/tag, new dependency, API/schema, permission, transaction, route or settings changes. Unrelated working-tree changes preserved.

## Inspected and reused

- Web platform/RegisteredBusinesses, BusinessDirectory, BusinessLocations, BusinessLocationCards; reports/PlatformOverview and RegistrationTrend; organization/AddBusiness and BusinessEditor.
- Native platform-businesses equivalents and reports equivalents.
- Shared platform-businesses client, schemas, cancellable resources and workspace selection.
- Web WorkspaceScreens and native NativeScreens dispatch; backend platform-businesses and platform-overview controllers. Both read controllers revalidate requirePlatformAdmin. Directory inspection does not grant membership or authorize management.
- Existing RecordDetails, drawers, Table/RecordTable, pagination, search, filters, ViewTabs, MetricCard, ChartPresentation, EmptyState and IconButton. No new shared UI component requires a showcase.

## Changes

- Business/location detail drawers use consistent labelled metadata on web/desktop and native. Counts distinguish unavailable from zero; explicit business/location references remain secondary. Existing exact UTC registration timestamp retained.
- Detail composition uses one shared presentation helper; it neither fetches data nor grants access. Manage in business workspace retains the existing select-and-verify callback.
- Active/suspended/archived registration status uses success/warning/neutral consistently. Archived records no longer imply an actionable warning.
- Platform registration metrics use neutral surfaces rather than misleading stock warning/error colors. Values and registration chart calculations unchanged.
- Overview identifies its server as-of time in UTC and explains registration analytics separately from business sales/stock.
- Overview refresh uses the established tooltip-bearing icon control.
- Directory distinguishes empty registrations from no search/filter matches, respecting simple/enhanced state preferences. Registration chart empty guidance uses the existing empty-state primitive.
- Creation form, initial owner assignment, subsequent setup navigation, errors and pending behavior preserved.

## Route / action coverage

| Surface                               | Retained behavior and evidence                                                                                                                                                                                       |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| /admin, platform overview destination | Server totals, active count, accounts, stores, warehouses, terminals, last-30-day UTC registrations, exact chart table, logs/directory links. Chrome overview checked in both themes at six widths.                  |
| /admin/businesses list                | Server search/status/offset, cancellation, 250ms debounce, total/pagination; nested locations load only after expansion. Characterization test checks one GET, no prefetch.                                          |
| /admin/businesses grid                | Actual registered business cards, counts, location cards grouped into stores/branches and warehouses; opens details. Browser and unit coverage.                                                                      |
| Business/location drawers             | Metadata, exact counts, read-only inspection, explicit management handoff. Unit test verifies no management action without callback and correct ID/location flag with callback.                                      |
| Add business                          | Existing validated name, pending lock, owner assignment, success/setup steps; creation drawer opened at every tested width/theme without submitting. Live create and failure recovery not exercised.                 |
| Business management handoff           | Existing workspace selection must succeed before navigating to business/location settings; no direct platform mutation added. BusinessEditor test preserves archive confirmation and cancellation without a request. |
| Empty/no results                      | Chrome 1440px light/dark checks search with no matches and empty scenario; simple/enhanced settings remain authoritative.                                                                                            |
| Error/denied/loading/paging           | Existing resource and shell guards retained and inspected. Mock client tests exercise platform restrictions; no live database role/tenant matrix. Large-data pagination not driven in browser.                       |
| Native equivalents                    | Native detail/overview/status/empty-state parity type checked and exported; native list retains existing stacked rows, not DOM tables.                                                                               |
| Tauri                                 | Shared web frontend built into macOS app; no host integration changed.                                                                                                                                               |

## Validation

- Before editing: 3 files, 9 tests passed.
- Final focused suite: 4 files, 12 tests passed: BusinessDirectory, BusinessEditor, mock transport, platform-businesses.
- New tests cover encoded/cancellable paginated platform reads, unknown-versus-zero counts, archived/suspended tones and management callback boundary.
- Workspace typecheck passed after resolving an unused native import.
- Lint passed: 0 errors, 69 warnings; boundaries passed (1,323 modules, 7,557 dependencies).
- UI audit: 0 new groups, 5 improved groups; 6 existing review findings remain.
- Parity passed: 41 shared routes, web/mobile 45 each; settings 9 each.
- Route/docs checks passed after regeneration; four canonical guides unchanged.
- Foundation passed: 64 documents, 1,441 source files before this report.
- Production web and macOS Tauri app build passed (.app 12.53 MiB).
- Expo Android, iOS and web exports passed.
- Scoped formatting and whitespace diff checks passed.
- Browser evidence uses mock transport and Chrome, fixed date and local images/network behavior. No actual business records created/changed.

## Limitations / review

Windows runtime/build unavailable; macOS installation/signing/runtime and native emulators/devices not verified. Export success is not device qualification. Live DB integration, role revocation, tenant access, stale versions, real creation, archived/inactive workspace handoff and failure recovery require an isolated test environment. No migration required.

Not all appearance combinations, screen readers or large datasets were exercised. Creation and location management remain existing business workflows, not unrestricted platform edits. Review this module; do not automatically start another phase.

## Changed files and evidence

- packages/api-client/src/platform-businesses.ts
- apps/web/src/features/platform/BusinessDirectory.tsx
- apps/web/src/features/platform/BusinessLocations.tsx
- apps/web/src/features/platform/BusinessLocationCards.tsx
- apps/web/src/features/platform/RegisteredBusinesses.tsx
- apps/web/src/features/reports/PlatformOverview.tsx
- apps/web/src/features/reports/RegistrationTrend.tsx
- apps/mobile/src/platform-businesses/BusinessDirectory.tsx
- apps/mobile/src/platform-businesses/BusinessLocationCards.tsx
- apps/mobile/src/platform-businesses/RegisteredBusinesses.tsx
- apps/mobile/src/reports/PlatformOverview.tsx
- apps/mobile/src/reports/RegistrationTrend.tsx
- packages/api-client/src/platform-businesses.test.ts
- apps/web/src/features/platform/BusinessDirectory.test.tsx
- scripts/redesign-platform-admin-browser.mjs
- Generated coverage and validation artifacts refreshed. No files removed.

## Bundle and timing

- Production raw/gzip bytes: {"js": {"files": 31, "raw": 1729478, "gzip": 531502}, "css": {"files": 4, "raw": 139236, "gzip": 24688}}.
- cold POS list readiness: [229] ms; median 229 ms.
- search to matching suggestion and filtered cards (debounce included): [373, 431, 394, 447, 382] ms; median 394 ms.
- warm POS list readiness: [58, 198, 61, 202] ms; median 129.5 ms.
- Development mock timing, not production INP. Previous notification/log run: cold 234ms, warm median 129ms, search median 394ms. No POS, search debounce or list-fetch logic changed.

- Final browser run passed 12 viewport/theme cases: widths 390, 844, 1024, 1280, 1440 and 1920px, both light/dark; height 390px at width 844, otherwise 900px. Overview, list/grid, business/location detail entry and Add business drawer exercised; no page overflow or runtime page errors. No-result/empty checks passed at 1440px. Visually inspected the 390px light detail screenshot. Browser scripts and screenshots are in the validation directory.
