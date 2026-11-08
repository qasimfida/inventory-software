# Phase 7 — trading

## Inspected and changed

Trading only on `redesign/phase-7`, no commit or implementation tag. Inspected web/native screens and consumers, shared client/forms/contracts, server service/repository/controller and existing bilateral integration tests. Preserved unrelated working-tree changes.

- Relationships now use compact reference/status tables rather than concatenated paragraphs, with explicit empty guidance.
- Shared order details separate buyer/seller, currency, creation time and references from exact agreed description/quantity/unit/price lines. Unavailable business names remain labelled references, not invented identities.
- Order collection uses readable status labels, a success tone for received coordination, explicit web column headings and singular/plural line counts. Existing list/grid/export and opening behavior retained.
- History keeps its deferred GET and separate pagination, uses the existing controlled web accordion/native disclosure, readable business-timezone timestamps and an event table. Empty history and read-only error recovery are explicit.
- Refresh controls use existing tooltip icon buttons/native equivalents. Removed duplicate empty-order messaging and an unreachable accounting-permissions message guarded by a constant true flag. No permission boundary changed.
- Read-only drawer description states that this view does not post stock or money; shared command forms, options, confirmations and callbacks remain unchanged.

11 source/test/script/guide files created or modified, none removed: [manifest](phase-7-trading-changed-files.json). Only canonical guide changed: `docs/design-system.md`, DS-084. [Route/action/state matrix](phase-7-trading/routes.md). Feature-local TradingEvidence compositions reuse existing primitives; no shared primitive, dependency, API, schema, financial calculation or settings changes.

## Preserved behavior

Characterization passed **before UI edits: 7 tests / 2 files**. Tests cover business.write route visibility, active/non-revoked relationship candidates, terminal order exclusion, exact shared terms, versioned transitions, stable identity on explicit retry, paged history and invalid-quantity rejection before transport.

Backend authorization and participant checks remain authoritative. Only the invited business can accept pending sharing; seller acceptance/dispatch and buyer receipt follow original state/version rules. Order status records coordination, not stock/cash settlement. No additional partner identity request, financial command, all-record fetch or persistent/offline cache introduced. API filtering remains offset-only.

## Verification

Logs and screenshots: `.ai/reports/redesign/phase-7-trading-validation/`.

- **13 tests / 4 files passed:** `npx vitest run packages/api-client/src/trading-characterization.test.ts packages/contracts/src/stage6.test.ts apps/web/src/features/trading apps/mobile/src/trading` (`tests-complete.log`). Panel tests verify exact values, on-demand history without command submissions, safe list/history recovery and empty history on both platforms.
- `npm run lint`: **0 errors, 68 existing warnings**; boundaries passed (1315 modules, 7493 dependencies). Scoped trading lint clean.
- Scoped Prettier and `git diff --check` passed; no whole-tree rewrite.
- `node scripts/redesign-trading-browser.mjs`: **12 viewport/theme cases passed** (`browser-complete.log`), details/history and four command drawers opened/closed. At1440: empty/error/retry/recovery. No financial or trading mutation submitted.
- `redesign:inventory`, `check:redesign`: passed, 56 route rows/four canonical guides. `check:parity`: 41 shared routes, 45 web/45 native, 9 settings each. `audit:ui`: 0 new groups, 5 improved groups, 6 existing review findings.

Browser: Chrome mock owner at widths **390/844/1024/1280/1440/1920**, height390 at844 and900 otherwise; light/dark, fixed date, UTC/en-US, external HTTPS images blocked. No page exceptions or document horizontal overflow; agreed-line table does not vertically clip. Visual review included narrow dark details/history and wide light overview. Wide reference/financial columns retain horizontal scroll inside the drawer/table region. Final captures include corrected headings and read-only description.

Initial failures retained: the characterization test initially expected a promise rejection for synchronous schema validation; corrected to assert synchronous rejection. A JSX parenthesis and testing-library option typo were corrected. Native collection supports neutral/success/warning, not info; dispatched now uses its existing neutral treatment on both platforms. No shared primitive or validation rule weakened.

Final `npm run typecheck` passed (`typecheck-complete.log`). `npm run build -w @inventory/api` passed; `npm run build -w @inventory/desktop -- --bundles app` built the final web assets and macOS app (12.53 MiB). `npm run build:mobile` exported Android/iOS/web successfully. `check:foundation` passed: 60 documents, 1428 source files, existing source-size review warnings. Final behavior-source diff was empty for trading forms/client/contracts/server.

## Performance

Existing development mock POS sentinel, not trading latency or production INP: cold **253ms**; warm **77/58/200/61ms**, median **69ms**; search **358/389/442/392/442ms**, median **392ms**. Prior reports pass: cold236ms, warm136.5ms, search398ms. No >10% regression trigger; noisy automation samples are not production qualification.

Production assets: JS **1,727,063 raw / 530,834 gzip bytes**, 32 chunks; CSS **139,236 / 24,688**, 4 files; fonts **647,236 / 340,769**, 4 files. JS +4,330 raw bytes (~0.25%) from reports; CSS/fonts unchanged. No heavy dependency or extra background fetch. Exact data: `bundles.json` and `performance.json` in the validation directory.

## Remaining qualification

- No `TEST_DATABASE_URL`; live integration/full repository suite not run. Bilateral consent, stale versions, cross-tenant denied writes, concurrency/rollback and successful transitions were inspected/characterized, not executed against PostgreSQL.
- Browser mock fixture is small. Real multipage history, grid/export runtime, permission changes during requests, offline/session expiry and comprehensive keyboard/screen-reader testing remain unqualified.
- Native adapter tests prove React Native presentation under a web test adapter, not device behavior. No emulator/physical-device, VoiceOver/TalkBack, safe-area/keyboard runtime evidence.
- Windows host unavailable. Installed Tauri runtimes, native saving/peripherals, signing/notarization and Windows installers require platform qualification.
- Generic forms retain original action choices and server validation; no new role/state-specific option filtering introduced. Existing pending, success reload, uncertain retry and dismissal behavior retained.

Stop after trading. No integrations, team/staff, notifications/logs or platform-admin work started.
