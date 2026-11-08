# Phase 7 — accounting

## Inspected and changed

Accounting only on `redesign/phase-7`. No commit or implementation tag; unrelated working-tree changes preserved. Inspected web/native accounting panels and consumers, shared forms/client/contracts and server accounting controller, service, repository and source rules.

- Compact trial-balance, period and unposted-source tables replace repetitive evidence blocks, using canonical account names, exact minor-unit values and aligned numeric columns.
- Journal drawers separate metadata from debit/credit lines; missing source/reversal references have explicit labels. Recorded timestamps use the business timezone; posting dates and UTC period rules remain unchanged.
- Posted journals have an explicit heading; redundant empty messaging removed. Read failures offer the existing read-only retry presentation. Web refresh uses the existing tooltip icon button.
- Web and native use feature-local AccountingTable, AccountingSummary/AccountingPending and JournalDetails, composing established primitives. No new common primitive, dependency or settings system.

15 source/test/script/guide files created or modified, none removed: [manifest](phase-7-accounting-changed-files.json). Only canonical guide changed: `docs/design-system.md`, DS-082. [Route/action/state coverage](phase-7-accounting/routes.md). Generated route/component inventories refreshed.

## Behavior preserved

Characterization ran **before UI edits: 7 tests / 2 files passed**. Coverage includes read/write permission combinations, source availability, reversal candidates, UTC close eligibility, exact balanced payloads and stable reversal identity after an uncertain response. No API, schema, permission, cache, money calculation or transaction code changed.

Trial balance is all posted entries/all dates/per currency; period/journal/pending evidence remains paged. A zero pending count on a page is not reconciliation. Manual entries do not change stock or AR/AP; reversing a journal does not undo its source transaction. Backend period/source locks, balanced entries, idempotency and close refusal with pending sources were traced, not changed. Accounting remains online-only and is not full statutory accounting, valuation, COGS or tax filing.

## Verification

Logs and screenshots: `.ai/reports/redesign/phase-7-accounting-validation/`.

| Command/check                                                                                                                                                                                                                                                 | Actual result                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npx vitest run packages/api-client/src/accounting-characterization.test.ts packages/api-client/src/stage6.test.ts packages/contracts/src/stage6.test.ts apps/web/src/features/accounting apps/mobile/src/accounting apps/api/src/accounting/sources.test.ts` | **30 tests / 8 files passed**, `tests-complete.log`.                                                                                             |
| `npm run typecheck`                                                                                                                                                                                                                                           | Final passed, `typecheck-complete.log`.                                                                                                          |
| `npm run lint`                                                                                                                                                                                                                                                | Passed: **0 errors, 69 existing warnings**; boundaries passed, 1304 modules/7430 dependencies. Final scoped accounting lint clean.               |
| Scoped Prettier and diff whitespace review                                                                                                                                                                                                                    | Passed; no whole-tree rewrite.                                                                                                                   |
| `npm run build`                                                                                                                                                                                                                                               | API passed; initial web failure was a test fixture missing `warehouseId:null`. Corrected; final web production build passed through Tauri build. |
| `npm run build -w @inventory/desktop -- --bundles app`                                                                                                                                                                                                        | Final web and macOS `.app` build passed, 12.53 MiB; `desktop-build-complete.log`.                                                                |
| `npm run build:mobile`                                                                                                                                                                                                                                        | Final Android/iOS/web exports passed, `mobile-build-complete.log`.                                                                               |
| `node scripts/redesign-accounting-browser.mjs`                                                                                                                                                                                                                | **12 viewport/theme cases passed**, `browser-final.log`; no financial commands submitted.                                                        |

Browser: Chrome mock runtime at widths **390, 844, 1024, 1280, 1440, 1920**; height 390 at 844, otherwise 900; light/dark, UTC/en-US, fixed date and external HTTPS images blocked. Collection/detail and four command drawers opened/closed; empty/error/retry/recovery at 1440. No page errors or document horizontal overflow; journal lines not vertically clipped. Visually reviewed wide light overview and narrow dark journal; wide financial columns use the existing keyboard-scrollable region rather than truncating values.

Permanent-close drawer is tested in a component with an elapsed period. The browser fixture ends today, so that command is correctly unavailable there. Original failed logs retained: fixture typing corrected; browser harness now moves the pointer away and dismisses a hover notification menu that intercepted a command click. No forced click or weakened validation.

Final structural checks also passed: `redesign:inventory` and `check:redesign` (56 route rows, four canonical guides); `check:parity` (41 shared routes, 45 web/45 native, 9 settings each); `audit:ui` (0 new groups, 5 improved, 6 review findings); `check:foundation` (56 documents, 1416 source files, existing size-review warnings). Final logs use the `*-complete.log` suffix. The scoped diff review found only accounting presentation/tests, its browser harness and DS-082; no financial or authorization implementation changes.

## Performance

Existing development mock **POS sentinel**, not accounting latency or production INP: cold **232ms**; warm **49/198/58/202ms**, median **128ms**; search **384/452/391/437/376ms**, median **391ms**. Prior payables: cold208ms, warm median129ms, search371ms. The single cold sample is +11.5%, triggering review; warm is stable and search +5.4%. Reviewed bundle/dependency changes: accounting adds only feature-local presentation, no dependency, global fetch or debounce change. This noisy single development sample does not establish causality; production/accounting latency remains unqualified.

Production assets: JS **1,719,652 raw / 520,676 gzip bytes**, 32 chunks; CSS **136,807 / 24,234**, 3 files; fonts **647,236 / 340,769**, 4 files. JS +3,351 raw bytes (~0.20%) from payables; CSS/fonts unchanged. Exact metrics in `bundles.json` and `performance.json`.

## Platform status and remaining qualification

- **Web:** Chrome mock runtime verified at stated sizes/themes. Not live transaction or exhaustive assistive-technology qualification.
- **macOS:** Tauri app built; installed WKWebView/runtime, signing, printing and other peripherals not tested.
- **Windows:** no Windows host; installer/runtime not tested.
- **Native mobile:** native composition, adapter tests, types and exports passed. No emulator/physical-device or VoiceOver/TalkBack/keyboard/safe-area runtime qualification.
- No `TEST_DATABASE_URL` configured. Full repository suite, real posting/reversal/close, tenant-denied writes, rollback and concurrency not executed. No migration changes needed.
- API supports offset only, not date/account search. No misleading page-local filters added. Mock evidence is small; real pagination and large data remain manual/integration work.
- Existing command validation, busy/dismissal and unsaved-form behavior preserved; no claim of broad shared-form accessibility fixes. Shared primitives have existing showcase coverage; this change adds only feature-local presentation.

Stop after accounting. No other Phase 7 module started.
