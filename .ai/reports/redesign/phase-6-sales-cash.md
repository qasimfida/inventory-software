# Phase 6 — sales and cash

2026-11-06 · branch `redesign/phase-6`. Sales-cash only; previous work preserved, no commit/tag.

## Inspected and changed

Read AGENTS, global/Phase 6 prompt and relevant canonical guides. Traced web/native sales/receipt and cash-shift screens, route and embedded consumers, cash/return forms, receipt serializer/print adapters, contracts and backend shift/return boundaries. Matrix: [phase-6-sales-cash/routes.md](phase-6-sales-cash/routes.md).

- Cash shifts now use a compact reconciliation table and per-shift detail drawer/native panel. Opening/expected/counted/discrepancy remain server-provided exact minor units; unknown count/reconciliation is explicit. Open/refresh share a toolbar; close/adjust stay with the selected shift.
- Sales use shared loading/retry/refresh patterns and the shell-aligned title. Original printable receipt is retained unchanged. A separate recorded-settlement view distinguishes outstanding debt, return credit, cash refund and confirmed refund references/history.
- Correction commands are grouped below read-only evidence and printing, with a clear stock/settlement heading. Same return/void/exchange forms, permissions, state gates, reason/disposition and transaction handlers.
- Native error visibility uses boolean conditions, preventing empty-string children under a native View. No API request, calculation or persistence behavior changed.
- Reused existing primitives, tokens, drawer/native panel and table components. New components are feature-local, not a new shared library. No dependency or shared primitive API change; existing showcase remains applicable.

## Characterization and behavior

Before UI edits: **8 tests / 3 files passed** (`characterization-before.log`). Coverage pins terminal sale states, read-only permissions, closed-shift commands, uncertain close identity, exact remaining return quantity/disposition and existing literal receipt printing.

Final focused suite: **18 tests / 9 files passed** (`tests.log`). Web/native tests verify negative discrepancy and exact amounts, explicit empties, separate return/refund evidence, viewer printing of exact receiptText, no correction actions and no API write on read/print. Initial test selectors accidentally matched the native panel-close button and duplicate fixture timestamps; selectors were corrected without changing product behavior.

Module-start hashes confirm no changes to backend/contracts/shared client implementations, business calculations, permissions, routes, settings or printer adapters. Changed source list: [phase-6-sales-cash-changed-files.json](phase-6-sales-cash-changed-files.json).

## Checks and browser evidence

Logs/captures: `phase-6-sales-cash-validation/`.

- `npm run typecheck`: passed; final web/mobile checks include newly added component tests.
- `npm run lint`: passed, 0 errors /69 warnings; dependency boundaries passed. Final scoped lint logged separately.
- Scoped Prettier and `git diff --check`: passed.
- `npm run build`: API/web passed.
- `npm run build -w @inventory/desktop -- --bundles app`: macOS application bundle passed.
- `npm run build:mobile`: Expo exports passed; final export repeated after the native empty-string rendering correction.
- `check:foundation`, `check:parity`, `audit:ui`: passed. Parity 41 shared/45 web/45 native routes, 9 settings each. UI audit 621 source files, 6 review findings; design 133 baseline groups, 0 new, 5 improved.
- Generated route/component evidence refreshed; `check:redesign` verifies 56 route rows and four canonical guides.
- Chrome demo: **12 cases passed**, light/dark at 390×900, 844×390, 1024×900, 1280×900, 1440×900, 1920×900. Cash list/details, sales list/receipt and nested return drawer; 1440px also close/adjust/void command drawers. No horizontal page overflow/runtime exceptions. Screenshots visually reviewed. No transaction or physical printing submitted.

## Performance

Production totals: JS **1,708,609 bytes** (+0.22% versus transfers), CSS **136,807**, fonts **647,236** (both unchanged). Per-file raw/gzip in bundle-sizes.json. No new dependency, unbounded fetch or debounce change.

Development POS sentinel (same fixture, not production sales/cash latency): cold243ms vs235ms, warm53/202/49/202ms (median127.5ms vs129ms), search median397ms vs396ms. No runner issues or >10% regression.

## Platform status and limits

- Web: build, focused tests and mock browser checks verified. No TEST_DATABASE_URL configured; actual refund/void/exchange, cash closing, approval thresholds, concurrent cash/stock, duplicate processing and rollback not integration-qualified this turn.
- macOS: app bundle built, not installed WKWebView/DMG/signing/notarization/peripheral qualification. Receipt adapter test is not a real printer test.
- Windows: no host/build/runtime available; release gate remains open.
- Native: tests and JS exports passed; no emulator/device, native printing, panel/keyboard, screen reader, storage or process-death testing. Browser phone sizes are not native qualification.
- Cash API returns shift summaries, not entry history: no fabricated cash ledger or new search/filter endpoint. Actor/terminal references remain references, not invented names.
- Correction triggers retain generic CommandForm styling and existing confirmation/dismissal/unsaved semantics. The added consequence heading is presentation, not a new approval rule. Permission and approval enforcement remain backend-owned.
- Exhaustive preferences, every server failure and production-size histories remain manual/release checks. Wide evidence tables retain horizontal scrolling. Existing pending/mutation behavior was not redesigned.

## Files and stop point

Seventeen source/doc/test/script files added/modified; none removed. Includes four existing screens, four feature-local presentation components, six component tests, one characterization test, one browser script and DS-079 in docs/design-system.md. Reports/matrix/start hashes/logs/screenshots/performance/bundle evidence stay under `.ai/reports/redesign/`.

Stop after sales-cash for review. Do not start customers or another stage. No implementation tag without an authorized reviewed commit.
