# Phase 6 — transfers

2026-11-06 · `redesign/phase-6` · transfer module only. No commit/tag; prior unrelated work preserved.

## Inspected and changed

Read AGENTS, global/Phase 6 prompt and canonical guides. Traced TransferPanel/TransferDetails on web/native, shared create/add-line/transition/receipt forms, transport, schemas, route ownership and backend transition/receiving implementation. Coverage: [phase-6-transfers/routes.md](phase-6-transfers/routes.md).

- Draft creation now sits with collection controls. Refresh uses the shared tooltip icon button; initial loading, safe retry and missing-warehouse states use existing components.
- Detail drawers show source/destination warehouse names from already-authorized loaded locations, location references, state, version and created time. Missing names remain explicit references.
- Replaced repeated line/receipt/event blocks with compact shared tables/native RecordTable. Selected-unit quantities, base units, good/damaged/shortage and actor references are distinct. Empty sections explain absent evidence. Web drawer content retains its natural height.
- Same collection search, filtering scope, paging, export, list/grid, nested command drawers and state-specific actions. No backend, schema, route, permission, settings, client implementation, stock or monetary change. No dependencies/new shared primitive API; existing showcase remains applicable.

## Characterization and checks

Before presentation edits: **9 tests / 2 files passed** (`characterization-before.log`). New characterization covers all six states, versioned dispatch, stable uncertain retry identity and separate exact fractional receipt quantities.

Final focused suite: **17 tests / 6 files passed** (`tests.log`). Web/native components test receipt evidence, empty history, read-only actions and owner draft actions without mutations.

Evidence under `phase-6-transfers-validation/`:

- `npm run typecheck`: passed; final web/mobile checks also include new component tests (`typecheck-tests.log`).
- `npm run lint`: 0 errors / 69 warnings, dependency boundaries passed. Final scoped ESLint: 0 errors / 1 coordinator-size warning (216 lines); existing exception preserves load/selection/command ownership with details and forms extracted.
- Scoped Prettier and `git diff --check`: passed.
- `npm run build`: API/web passed.
- macOS `npm run build -w @inventory/desktop -- --bundles app`: passed.
- `npm run build:mobile`: Expo exports passed.
- Foundation/parity/UI audit: passed; parity 41 shared /45 web /45 native routes, 9 settings each. UI audit 613 sources, 6 review findings; design 133 baseline groups, 0 new, 5 improved.
- Generated route/component inventory refreshed; `check:redesign` verifies 56 route rows and four canonical guides.
- Browser script opens list, creation, partial-transfer detail and receipt confirmation at 390×900, 844×390, 1024×900, 1280×900, 1440×900, 1920×900, light/dark. At 1440px it also opens add-line/approve/cancel/dispatch confirmations. No transaction submitted. Final run: **12 cases passed**, no page overflow or runtime exceptions; exact results/captures in browser-final.log/browser.json. Initial run returned to login during a development reload; retained in browser.log and rerun on the settled server.

## Performance

Production totals: JS **1,704,868 bytes** (+0.18% versus warehouse); CSS **136,807** (+0.35%); fonts **647,236**, unchanged. Raw/gzip files in bundle-sizes.json. No new dependency, unbounded fetch or changed debounce. Same development POS sentinel: cold235ms versus222ms; warm58/207/47/200ms (median129ms versus125.5ms); search median396ms versus394ms. No runner issues or >10% regression. This is a cross-phase comparison, not production transfer latency.

## Platforms and remaining limits

- Web: focused tests/build and mock browser validation; no live database transfer mutation. TEST_DATABASE_URL not configured. Existing server guards/stock transactions were inspected, not integration-qualified this turn.
- macOS: app bundle built, not installed WKWebView/installer qualification. Signing, notarization, DMG, peripherals, offline vault and protocol testing remain open.
- Windows: no Windows host/build/runtime verified; release gate open.
- Native: component tests and Expo exports passed, not simulator/device/native modal, keyboard, camera, screen-reader or peripheral qualification. Browser phone widths do not qualify native.
- Live duplicate delivery, concurrent stock allocation, cancellation-release, partial receipt reconciliation, rollback and endpoint isolation require isolated DB tests. Existing tests under apps/api/src/transfers remain unchanged/unrun.
- Full preference combinations, production-sized histories and every failure state are unverified. Long evidence tables scroll horizontally inside labelled regions. Native keeps its table scroll equivalent.
- Existing generic CommandForm uses the same outline trigger for all commands; cancellation is explicitly named and requires its existing reason submission, but no new destructive styling/confirmation API was introduced. Existing unsaved-draft and pending semantics remain unchanged.

## Files and stop point

Eleven source/doc/test/script files added or modified; none removed. Complete list: [phase-6-transfers-changed-files.json](phase-6-transfers-changed-files.json). Module-start hashes show no changes to backend/contracts/client implementations. Canonical rule: DS-078 only. Reports/matrix/logs/screenshots/bundle and performance evidence remain under `.ai/reports/redesign/`.

Stop for transfer review. Do not start sales-cash or customers. No implementation tag without an authorized reviewed commit.
