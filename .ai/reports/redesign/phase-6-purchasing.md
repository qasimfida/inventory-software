# Phase 6 — purchasing

2026-11-06 · branch `redesign/phase-6` · purchasing module only. Existing unrelated changes preserved; no commit or implementation tag.

## Inspected and changed

Read AGENTS, global/Phase 6 prompts and canonical guides. Traced web/native purchasing and payables, shared purchasing/payable clients and command definitions, contracts, mock transport, permissions and route dispatch. Full surface matrix: [phase-6-purchasing/routes.md](phase-6-purchasing/routes.md).

- Purchase and supplier collections use consistent headings, columns, state badges, shared retry/loading/empty states and refresh controls. Creation actions sit with their collection; selected-supplier editing sits with supplier details.
- Order details open in the existing right drawer/native panel instead of appearing below long collections. Lines, delivery receipts, invoices and returns have labelled, compact evidence tables. Delivery receipts use already-loaded data; no extra request or invented actor names.
- Supplier invoices use the shared table. Invoice drawers show exact balances, settlement/credit history and the existing authorized payment/refund/credit commands.
- Receipt, return and invoice commands remain distinct nested command drawers. A visual review caught flex-shrunk table rows; the content now retains its height and scrolls within the drawer. Browser assertions guard against that clipping regression.
- Same tokens, density, preferences, primitives and native equivalents. No new shared primitive, dependency, API, schema, business state or calculation. Existing showcase remains applicable.

## Behavior and characterization

Before UI edits, **11 tests / 3 files passed** (`characterization-before.log`). New characterization pins all six PO state action sets, fractional partial receipt quantity, null root location, stable identity after uncertain response, versioned transition and single-attempt supplier writes.

Final focused suite: **20 tests / 9 files passed** (`tests-all.log`): characterization, payable/retry identity tests and web/native purchasing/details/payable component tests. Read-only views expose no creation/payment commands; exact loaded values and empty history are tested. No transaction submitted by browser tests.

Source hashes against this module's start snapshot show only six purchasing UI files, six component test files, one client characterization test, one browser script and `docs/design-system.md` changed/added. No backend, contracts, client implementation, permissions, routes or persistence changed during this module. Pre-existing changes in those areas were preserved.

## Verification

Evidence: `phase-6-purchasing-validation/`.

- `npm run typecheck`: passed all workspaces.
- `npm run lint`: passed with 0 errors and 69 warnings; dependency boundaries passed.
- Scoped Prettier check and `git diff --check`: passed.
- `npm run build`: passed repository production builds.
- `npm run build -w @inventory/desktop -- --bundles app`: macOS app bundle built; not an installed runtime/installer qualification.
- `npm run build:mobile`: Expo exports passed; not a native device test.
- `npm run check:foundation`: passed, with existing source-size review warnings outside this module.
- `npm run audit:ui`: passed, 133 baseline design findings, 0 new, 5 improved; existing review findings remain.
- `npm run check:parity`: passed, 41 shared / 45 web / 45 native entries, 9 settings each.
- `npm run redesign:inventory` and `npm run check:redesign`: generated inventory refreshed; 56 route rows and four canonical guides verified.
- Chrome mock fixture: **12 viewport/theme cases** (390×900, 844×390, 1024×900, 1280×900, 1440×900, 1920×900; light/dark). Order detail, receipt drawer and invoice detail opened; 1440px also opens return/invoice commands. No page overflow/runtime exceptions. Browser screenshots and JSON retained. This is not live API or exhaustive visual qualification.

## Performance

No new dependency or unbounded fetch. Final production JS totals **1,699,449 bytes** (+0.39% versus inventory phase), CSS **136,339**, bundled fonts **647,236** (both unchanged). Final bundle measurements are in `bundle-sizes.json`.

Same development POS sentinel as earlier phases: cold **254ms** versus 241ms, warm **69/199/68/204ms** (median134ms versus150.5ms), search median **396ms** versus397ms, no runner issues. This is a cross-phase regression sentinel, not purchasing production latency or device performance. Final wrapper changes only drawer flow; release performance remains unqualified.

## Limitations and platform status

- Web: build, mock Chrome responsive/theme checks and focused tests verified. No configured TEST_DATABASE_URL; live receipt/return/payment posting, rollback, concurrency and financial reconciliation were not exercised.
- macOS: Tauri frontend/app build verified. Installed WKWebView, signing/notarization, printer/scanner, offline vault and deep links untested. Prior Finder automation restriction leaves DMG qualification open.
- Windows: no Windows host/build/runtime available; release gate remains open.
- Native iOS/Android: component tests and exports passed. No simulator/device, screen reader, software keyboard or native panel runtime qualification. Phone-width browser tests do not qualify native mobile.
- Exact actor/location/movement IDs remain explicitly labelled references because these responses do not supply resolved names. No unauthorized lookup or fabricated details.
- The four purchasing/payable controllers exceed the 200-line review threshold (261–354 lines). Kept each existing load/selection/mutation owner together to avoid a state-ownership refactor during this visual change; presentation extraction remains a maintenance follow-up.
- Long evidence tables retain horizontal scrolling; full production datasets, exhaustive preference combinations and real-device usability need further testing. Existing supplier status editing and command confirmation/unsaved behavior remain unchanged.

## Files and stop point

Complete list: [phase-6-purchasing-changed-files.json](phase-6-purchasing-changed-files.json). No existing files removed. Canonical rule addition: DS-076 in `docs/design-system.md`. Reports, route matrix, start hashes, test/build logs, browser captures and bundle/performance evidence are under `.ai/reports/redesign/`; generated root route/component evidence refreshed.

Stop for purchasing review. Do not continue warehouse, transfers, sales-cash or customers. No tag created without an authorized reviewed commit.
