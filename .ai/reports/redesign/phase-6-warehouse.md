# Phase 6 — warehouse

2026-11-06 · branch `redesign/phase-6`. Warehouse module only. Prior work preserved; no commit/tag.

## Inspected and changed

Read AGENTS, global/Phase 6 prompt and canonical guides. Traced scanning, stock counts, storage collections/details/labels, warehouse balances/hierarchy, inventory adjustment/movement and reservation consumers, shared forms/clients/contracts and count backend entry points. Detailed matrix: [phase-6-warehouse/routes.md](phase-6-warehouse/routes.md).

- Separated product and location scan context using existing panels/native surfaces. Wide web screens use two columns; narrow screens stack. Kept native camera and web keyboard scanner behavior intact.
- Grouped count scope/sessions and review actions. New feature-local CountEvidence uses existing metadata and table primitives; hidden expected values stay hidden, fractional values stay exact, stale lines say “Recount required”. No additional API calls or calculated stock.
- Storage location details reuse RecordDetails on web/native. Warehouse balances have explicit empty states and native RecordTable parity. Existing hierarchy, tabs, filters, drawer editing, exports, labels and ledger commands retained.
- No shared primitive API or dependency added; existing showcase remains applicable. DS-077 documents the presentation contract.

## Behavior preserved and tests

Before presentation edits: **8 tests / 3 files passed** (`characterization-before.log`). New characterization pins submit/recount/approve paths, version/reason, stable uncertain retry identity, absolute fractional capture and no posting while loading movement confirmation. Existing ScanGate tests verify duplicate suppression and barcode parsing.

Final focused suite: **13 tests / 6 files passed** (`tests.log`). Web/native CountEvidence tests cover exact quantities, blind visibility, stale warnings and empty evidence. CountWorkflow resume test verifies no write on listing/resume and distinct capture/submit/recount/approve actions.

Module-start hashes confirm only presentation/tests, one browser script and design-system documentation changed. No API/client implementation, schema, backend, ledger, route, permission, cache or settings change. Full list: [phase-6-warehouse-changed-files.json](phase-6-warehouse-changed-files.json). Sixteen files added/modified; none removed.

## Verification

Logs/captures in `phase-6-warehouse-validation/`:

- `npm run typecheck`: passed workspace checks.
- `npm run lint`: passed with 0 errors / 69 warnings; dependency boundaries passed. Final scoped ESLint: 0 errors / 2 existing coordinator size warnings.
- Scoped Prettier and `git diff --check`: passed.
- `npm run build`: API/web production builds passed.
- `npm run build -w @inventory/desktop -- --bundles app`: macOS application bundle passed.
- `npm run build:mobile`: Expo exports passed.
- `npm run check:foundation`: passed, existing source-size review warnings retained.
- `npm run check:parity`: passed (41 shared / 45 web / 45 native routes; 9 settings each).
- `npm run audit:ui`: 608 source files, 6 review findings; design audit 133 baseline groups, 0 new, 5 improved.
- `npm run redesign:inventory` and `npm run check:redesign`: route/component evidence regenerated, 56 route rows and four canonical guides verified.
- Chrome demo transport: 12 width/theme combinations, 390×900, 844×390, 1024×900, 1280×900, 1440×900, 1920×900, light/dark. Read-only saved-count resume, storage list, balance drawer and hierarchy open; no horizontal page overflow/runtime exceptions. No stock transaction submitted. Initial browser attempt failed during route readiness; final runner explicitly waits for workbench controls. Evidence retains both attempts.

## Performance

Production totals: JS **1,701,799 bytes** (+0.14% versus purchasing), CSS **136,330**, fonts **647,236**. Raw/gzip file sizes are in `bundle-sizes.json`. No new dependencies, unbounded fetches or debounce changes. Same development POS sentinel as prior phase (not warehouse production latency): cold222ms versus254ms; warm57/208/54/194ms, median125.5ms versus134ms; search median394ms versus396ms. No runner issues. Visual-only grouping after this sample does not change POS; installed/device performance remains unqualified.

## Limitations and risks

- Web verified through builds, focused tests and mock Chrome captures, not live stock mutations. No TEST_DATABASE_URL configured; live count approval/recount races, rollback, location constraints, reconciliation and reservation isolation remain untested this turn.
- macOS app built, not installed runtime qualification. Signing/notarization, DMG, printing, real scanners, vault and protocol handling remain open.
- Windows unavailable: no Windows build or runtime verified. Release gate remains open.
- Native component tests and Expo exports passed; no iOS/Android simulator/device, camera, keyboard, VoiceOver/TalkBack or native panel qualification. Mobile browser width is not native testing.
- Existing workbench command visibility is broader than backend eligibility (e.g. approve remains an owner-labelled command). Server authorization/transition rules remain authoritative and unchanged; client eligibility/discoverability remains a follow-up rather than a claimed permission UX fix.
- Count sessions remain the existing bounded service response; not a new paginated count browser. Empty/error/validation and exhaustive appearance combinations were not all browser-tested. Existing mixed command-result messaging and unsaved-work behavior remain unchanged.
- Scanner coordinators remain above 200 lines; existing documented exceptions keep scan/unit/source/destination/confirmation context cohesive. Count evidence was extracted instead of duplicating the workflow. No new shared abstraction.

Stop for review after warehouse. No transfer, sales-cash or customer redesign started. Implementation tag deferred until an authorized reviewed commit.
