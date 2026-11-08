# Phase 10 — regression and handover

**Status: audit delivered with release blockers; redesign/release NOT qualified.** No commit or release tag was created. Branch: `redesign/phase-10`. Existing uncommitted work was preserved. CI is proposed, not installed.

## Inspected and scope

Read AGENTS, global/Phase 10 instructions and all four canonical guides. Used live registries/dispatchers and shared import evidence, existing tests and Phase 1/9 capture evidence. Regenerated **56 routes, 440 components, 228 static subview declarations and 243 token declarations**. Dynamic/native branches remain explicitly partial rather than inferred complete from source.

Deliverables:

- [Generated route completion matrix](completion.md), all 56 routes with source links, state/responsive/accessibility/regression columns and remaining issues.
- [Component-level report](component-completion.md), all 440 source components; existing typed props/showcase remain the API reference.
- `phase-10-validation/subviews.json`, `tokens.json`, `completion.json`: source-line inventories and machine-readable status.
- [Visual review](phase-10-validation/visual-review.md), `comparison.json` and ten before/after contact sheets.
- [CI proposal](ci-proposal.md); approval is required by Phase 10 before installing workflows.

## Changed and behavior preserved

- Fixed a real coarse-pointer cascade regression: later small-button rules had reduced touch targets to 33px; shared touch minima now win. Existing showcase/core-component touch checks cover it.
- Removed an invalid literal space under a native View in `apps/mobile/src/catalog/ProductQuantity.tsx`; the native-text guard now excludes browser-only `.web.tsx` sources but still checks native JSX.
- Updated existing browser expectations to accepted compact dimensions, 22px page titles and neutral primary/focus-accent separation. Contrast, exact-money, motion, focus, target-size and layout checks remain.
- Added deterministic Playwright visual cases/config and an evidence-driven completion generator. No additional library or state system.
- Excluded generated validation artifacts from format/lint and included new visual TypeScript files in root checking. Authored instructions are not excluded to hide formatting failures.
- Updated only four canonical guide rules: ARC-019, DS-086, SEC-059, DEV-044 (architecture/qualification, states/native text, safe test/downgrade boundaries, final evidence/CI approval).

No API, schema, migration, stock/money calculation, authorization, preference persistence, route or transactional behavior was changed by this phase. Existing dirty changes from earlier work are not attributed to Phase 10. See scoped change manifest/diff in validation evidence. No files removed.

## Verification

Exact logs are under `phase-10-validation/`; initial failing runs are retained, not overwritten by green summaries.

| Check                                                        | Actual result                                                                                                                                                                        |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run check:foundation`                                   | Pass                                                                                                                                                                                 |
| `npm run check:parity`                                       | Pass; source parity is not device qualification                                                                                                                                      |
| `npm run audit:ui`                                           | Pass; static design guard                                                                                                                                                            |
| `npm run check:redesign`                                     | Pass; 56 registry rows, four guides <=200 lines                                                                                                                                      |
| `npm run lint`                                               | Pass after tooling correction; 70 pre-existing source-size warnings; 1,324 modules / 7,567 dependencies, zero boundary violations                                                    |
| `npm test -- --maxWorkers=2`                                 | Pass: 34 tooling tests; 226 Vitest files / 603 tests                                                                                                                                 |
| Isolated `npm run test:integration -- --maxWorkers=2`        | **Fail:** 73 suites pass, 1 suite fails teardown; all 167 assertions pass. Not an integration pass.                                                                                  |
| `PLAYWRIGHT_CHANNEL=chrome npm run test:web:browser`         | Pass: 26/26 (1.0m), after fixing coarse targets and stale design expectations                                                                                                        |
| `npx playwright test --config=playwright.redesign.config.ts` | Pass: 56/56 (3.3m), without snapshot updates                                                                                                                                         |
| Shell suite                                                  | **Fail: 27 pass / 10 fail (9.4m)** using a unique output directory. Initial run 25 pass / 12 fail also suffered shared-output artifact collisions                                    |
| Final checks                                                 | Typecheck, web/API build, mobile export, macOS app-only build and budget pass. Full desktop DMG fails (-1743); root format fails on 28 pre-existing files. See final-commands.jsonl. |

Integration used a newly initialized disposable PostgreSQL cluster on loopback port 55439, never the application database. Test fixtures migrated up and exercised real API/DB boundaries. `storefront-management.integration.test.ts` fails during downgrade because legitimate per-store listings cannot satisfy the old business/product uniqueness constraint restored after `1795200000000_storefront_management.sql`. No records were removed and no migration or test invariant was weakened. A supported downgrade/data-preservation decision is required.

Warnings include existing jsdom canvas fallback, Node SQLite experimental warning, Vite config-loader compatibility notice, and mock tests assigning hashes outside router APIs. No production browser console certification is implied.

## Functional regression evidence and limits

| Area                     | Executed evidence                                                                                                          | Remaining limit                                                                                                          |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Authentication and roles | auth/recovery/recovery-status integration; auth HTTP, auth-links and session tests; shell denied-route role change         | No installed-device identity-provider, real email/link or full custom-role matrix qualification                          |
| Products, pricing, stock | catalog/pricing, ledger, inventory and warehouse DB suites; product setup, SKU validation and rich-description shell cases | Product-detail/stock-planning legacy selectors and all per-route empty/error states need reconciliation                  |
| POS and finance          | checkout/credit/pricing-feedback/returns/receipt/accounting DB suites; client POS/payment/offline characterization         | Rapid triple-click quantity case fails; real scanner/printer and uncertain-response installed-device journeys still open |
| Purchasing/operations    | purchasing/payables/partial receipt/return guards, transfer lifecycle, counts and stock tests                              | No physical warehouse scanner workflow qualification                                                                     |
| Reports/team/settings    | dashboard/report, organization/permissions, operations, setup/settings/navigation integration and preference tests         | Runtime all-role/all-business combinations and device persistence not exhaustive                                         |
| Storefront               | 12 management assertions pass; shell listing/setup/filter/drawer flows run                                                 | Management teardown fails; publication readiness and real public deployment remain separate gates                        |
| Offline                  | shared offline/race/grant/outbox tests and existing platform adapters                                                      | Actual network interruption, crash recovery, vault pressure and peripherals on each release OS not qualified             |

`phase-10-validation/test-final.log` and `integration.log` are authoritative aggregate results. Coverage is layered: unit/model tests, real DB/API suites and mock browser workflows; none alone proves a complete physical-device workflow.

## Visual, accessibility and preferences

All 56 fixed-clock candidates compared identically on this host. Cases: login, shell/dashboard, inventory, product detail, POS, purchasing, reports, company settings, preferences, add-product drawer, showcase, reset dialog, empty inventory and loading overview. Widths **1440 and 390**, height **900**, pairwise light/dark and compact/comfortable. Chrome, en-US, UTC, fixed 2026-11-06; external images blocked. These are pairwise candidates, not every preference cross-product or a Linux baseline.

Reviewed all ten contact sheets at top-viewport level: 48 matched Phase 1 captures and 8 had no matching dialog/loading state. Neutral controls and surfaces, clearer hierarchy and retained responsive structure follow the accepted foundation. Before density, fixture data and dates differ; they are qualitative comparisons, not pixel-diff acceptance. Full-page lower content, all dialogs and every state are not certified by these images.

Known visual issues: narrow product-detail tab labels wrap mid-word; empty inventory remains minimal in the captured fixture; setup occupies more vertical space on mobile. Approval remains pending. Do not silently update snapshots to mask future differences.

Phase 9 retained evidence covers 264 screenshots / 200 axe scans with zero recorded violations or page overflow, plus 20 text-stress checks. Those were **not rerun wholesale in Phase 10**. Phase 10 browser tests exercise focus/dialog/menu/portal behavior, touch minima, typography, theme/contrast, density, reduced motion and preference combinations. Screen-reader and native keyboard/safe-area qualification remains open. All existing preference meaning, precedence and persistence were preserved.

## Platforms and release blockers

| Platform      | Evidence                                                                                                                                  | Qualification                                                                                                          |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Web           | Production build, mock-browser component/shell checks and deterministic snapshots; isolated DB API integration                            | Partial: shell and downgrade failures; real deployment/offline/peripherals still open                                  |
| macOS         | Tauri application compiled; full desktop command fails DMG Finder automation (-1743). Phase 9 recorded unauthenticated launch/resize only | Partial: packaging/signing/notarization and authenticated installed-app workflows remain open                          |
| Windows       | Shared renderer/source parity only; no Windows host available                                                                             | Not qualified; installer, WebView2, vault, links, updates and peripherals untested                                     |
| Native mobile | JS export and source/unit parity; native invalid Text child corrected                                                                     | No emulator/device run: adb absent and simctl unavailable. Native binary, keyboard, vault and screen reader unverified |

## Priority follow-up

1. Resolve storefront downgrade policy without discarding valid listings; rerun isolated integration.
2. Diagnose rapid cart increments and remaining shell failures; update stale selectors only against verified current workflows, retaining financial and authorization assertions.
3. Fix narrow product tabs and complete enhanced-empty/per-route state review; approve platform-specific visual baselines.
4. Resolve existing format debt without rewriting archived instructions' meaning; retain source-size warnings as technical debt.
5. Build/install on Windows and package/sign/qualify macOS; run real API, offline vault, deep-link, scanner/printer and accessibility gates against artifact hashes.
6. Review and approve the CI proposal before workflow installation. No next redesign phase or feature work has started.

## Shell failure triage

The final run used `npx playwright test --config=playwright.shell.config.ts --output=.ai/reports/redesign/phase-10-validation/shell-results`. No shell assertions were weakened or skipped.

| Spec                | Observed failure / disposition                                                                                                                                                                                                                                               |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| compact-workflows   | Expects former heading “Business setup shortcuts”; current setup heading differs. Stale selector; downstream actions not verified by this case.                                                                                                                              |
| held-carts          | Tries to fill the hidden cart-name field without expanding the retained Held carts accordion. Update navigation then rerun allocation assertions.                                                                                                                            |
| inventory-identity  | Assumes planning accordion appears immediately beside products; current workspace separates stock. Test must navigate the real tab.                                                                                                                                          |
| online-fix          | Expected “Product results” dialog did not appear. Needs workflow/result-presentation diagnosis; not dismissed as a label-only issue.                                                                                                                                         |
| pos-availability    | Timed out locating New product after login/navigation; passed the initial run. Race/flakiness remains; sold-out guard has other unit evidence, but this browser case is not qualified.                                                                                       |
| product-details     | Still asserts storefront publishing is unimplemented although channels now exist. Earlier product-scoped stock/history/pricing checks execute; channels assertion needs current contract.                                                                                    |
| setup               | Exact Transaction currency link lookup times out. Updated completed-step labels/navigation must be investigated; persistence assertions not reached.                                                                                                                         |
| shell               | Expects `/catalog?search=HP-002`, actual merged destination `/inventory?search=HP-002`. Preserve compatibility while aligning destination expectation.                                                                                                                       |
| stock-planning      | Attempts obsolete initial accordion without entering Stock & movements. Update user navigation and rerun actual hold creation checks.                                                                                                                                        |
| workflow-refinement | Three rapid increase clicks expect quantity 4 but render 2. Reproduced in both runs. Common quantity control captures a render-time next value; investigate event batching/model coordination across web/native before release. Do not lower expected quantity to hide loss. |

The last failure is a critical interaction regression; the audit cannot mark POS complete. The other failures also remain open until corrected tests execute their entire intended workflows.

## Final artifacts and reproducibility

Final command timings/exit codes: `phase-10-validation/final-commands.jsonl`. App-only build produced `apps/desktop/src-tauri/target/release/bundle/macos/Inventory Foundation.app`; it does not supersede the failed full DMG command. Budget: JS 1,733,773 raw / 534,765 gzip bytes; CSS 139,342 raw / 24,815 gzip bytes, all chunks combined, not initial transfer. No production latency claim.

`playwright.redesign.config.ts` now starts its own mock server when necessary (reuses 5197 locally, isolated in CI). Full 56-test comparison used the already-running mock server; final config smoke ran one login comparison successfully, and discovery lists all 56. An initial overly anchored smoke grep selected no tests and was corrected; that empty selection is not counted as a pass.

The disposable PostgreSQL cluster was stopped successfully; its diagnostic files remain. Existing application data and unrelated dev servers were untouched. Final scoped manifest and diff distinguish this phase from earlier uncommitted work.

## Performance sample

Quiet mock-server run completed five POS readiness/search trials with no issues. Before/after mean milliseconds: cold POS list readiness: 239 → 234 (-2.1%; latest range 234–234); search to matching suggestion and filtered cards (debounce included): 405 → 408.8 (+0.9%; latest range 387–439); warm POS list readiness: 131.75 → 135 (+2.5%; latest range 62–208). This is development automation, not production INP. Variance and >10% changes require review; no debounce, query limits or transactional model changed in this phase.
