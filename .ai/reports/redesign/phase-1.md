# Phase 1 — Baseline and specification checkpoint

Status: baseline/specification delivered with known validation and platform blockers; **not a clean regression baseline or release approval**. Stop here for decisions; no Phase 2 implementation is authorized by this report.

## Inspected

- Current working tree, root instructions, global/Phase 1 prompts, four canonical guides, manifests and existing audit/test/build scripts.
- Shared route registry, web router/workspace/settings dispatch, native navigation/application/screen dispatch, compatibility paths and nested feature modules.
- Shared tokens/styles, web UI/common/layout, native equivalents, settings schema/resolver/model/policies, API/workflow ownership and test fixtures.
- Source inventory: 56 route destinations and 409 non-test TSX modules. Conservative import closure is not a claim that every imported child is rendered by every route.
- Baseline source fingerprints cover 1,156 app/package TS/TSX/CSS files; see `before/source-integrity.json` for the unchanged-source result.

## Changed

- Added registry-derived route reports and component classification reports with source evidence, permissions, shared components, data imports, nested modules, platform notes, risks and redesign status.
- Added checks that reject a missing route row, missing reviewed page mapping, stale route report, malformed guide, duplicate rule ID, unknown enforcement command and broken local link/anchor.
- Extended existing parity analysis to canonical path aliases only when the target renderer exists; repaired two stale InventoryPanel fixture anchors. No routes or application dispatch changed.
- Converted the four canonical guides to rule-only tagged bullets, each below 200 lines. Preserved previous guides in `before/source-docs/*.txt`. Domain decision rules now live in security-and-data; performance review rules live in development.
- Recorded the five-axis preference migration, existing precedence and consumer trace without changing stored values, defaults, policies, resolver logic or dependencies.
- Added repeatable mock screenshot/performance capture scripts. Generated evidence is excluded from automatic formatting so regenerating it remains deterministic; manually authored reports remain format-checked.

## Deliverables

- `routes.md`, `routes.json`: generated live-registry coverage plus verified shell/detail/native exceptions.
- `components.md`, `components.json`: file/export classification, source imports, native counterparts and reviewed-disposition candidates.
- `architecture-baseline.md`: verified ownership, nested workflows, risks and tooling rationale.
- `preferences.md`: safe mappings, precedence, enforcement consumers, font evidence and open decisions.
- `before/`: screenshots, logs, performance samples, bundle/CSS sizes, source/doc snapshots and platform/tool evidence.

## Files changed by this phase

Modified: `docs/architecture.md`, `docs/design-system.md`, `docs/security-and-data.md`, `docs/development.md`, `package.json`, `.prettierignore`, `scripts/check-parity.mjs`, `scripts/parity-source.mjs`, `scripts/parity.test.mjs`.

Created: `scripts/check-docs.mjs`, `scripts/route-coverage.mjs`, `scripts/redesign-source.mjs`, `scripts/redesign-routes.mjs`, `scripts/redesign-components.mjs`, `scripts/redesign-browser.mjs`, `scripts/redesign-baseline.mjs`, `scripts/redesign-performance.mjs`, `scripts/redesign-supplement.mjs`, `scripts/redesign.test.mjs`, and reports/evidence under `.ai/reports/redesign/`.

Removed: none. Existing unrelated changes were preserved. No dependency or lockfile changes. No commit or push. The annotated phase baseline tag points to the pre-existing HEAD; it does not contain the uncommitted reports or code changes.

## Behavior preserved

No application UI source, contracts, API behavior, migrations, business calculations, authorization, settings persistence/enforcement, transaction retries, offline grants or compatibility routes changed. Mock interactions only; no real business records created or modified. The developer showcase reads design-system.md as text, so its displayed documentation changes as requested; its component implementation does not.

## Baseline captures and measurements

- **307 screenshot captures**: 264 route/scenario/responsive captures plus 43 supplemental drawer/tab/cart/role captures. No horizontal document overflow detected in the captured route sweep; this is not complete accessibility validation. Twelve recorded console-error entries come from intentionally blocked external mock images.
- All 55 web-accessible destinations have light/dark captures at 390 and 1440 pixels. Native-only `/more` is recorded as not applicable to web, not treated as missing.
- Additional POS/inventory/preferences captures at 844×390, 1024×900, 1280×900 and 1920×900 cover landscape phone/tablet, laptop and large desktop contexts. Primary full-route captures use 390×900 and 1440×900.
- Inventory empty/error/denied/offline/slow scenarios are captured using the existing mock controller. These are scenario presentations, not real outage/transaction recovery qualification.
- Supplemental captures cover valid online listing details, product creation/detail drawers, stock/pricing/history/channels tabs, local POS cart presentation and seven role landings. See `before/supplement/results.json`.
- Fixed Date: 2026-11-06 12:00 UTC; locale en-US; built-in deterministic SKU/record fixtures. External requests are blocked in the route sweep, so demo remote product images intentionally show fallback states and generate recorded resource errors. These are not API transaction failures.
- The initial sweep used a product ID where online detail expects a listing ID, showing a safe access/error state. The corrected runner and supplemental captures use the actual fixture listing ID. Initial evidence is retained in `before/initial-browser-results.json`; do not treat that initial error as proof the valid listing route is broken.
- The initial combined performance selector expected an old add-button name and timed out after captures. The separate corrected `redesign-performance.mjs` measures actual visible product cards and matching suggestions; its result is `before/performance.json`. No application code was changed to satisfy the selector.
- Production bundle before guide rewrite: total JS chunks **1,663,917 bytes**, total CSS **127,764 bytes**, bundled TTF **306,212 bytes**. These are all chunks, not initial-page transfer size. Per-file raw/gzip sizes are in `before/bundle-sizes.json`.
- Measured development/mock POS list readiness: cold **239 ms**, warm **60–204 ms** across four samples. Search to matching suggestions and filtered cards: **374–445 ms**, median **394 ms**, five samples; includes debounce and automation overhead. Not production INP, network API latency or a device benchmark.
- Representative full desktop POS, narrow dark inventory, and valid online detail screenshots were visually inspected. Narrow inventory spends considerable height on shell/toolbars and large product imagery; headings/actions remain duplicated on some routes. These are baseline findings, not fixes or approval of every captured screen.

## Checks and actual results

| Command / evidence                                                                                                                   | Result                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test` before tooling fixes                                                                                                      | **Failed** before Vitest: 21/25 tooling tests passed, 4 failed (alias detection, two obsolete fixture anchors, native literal-text check). Original log retained. |
| `./node_modules/.bin/vitest run --maxWorkers=2`                                                                                      | **162 files passed, 8 failed**; 416 tests passed, 4 failed, with additional suite import failures. See failures below.                                            |
| `node --test scripts/*.test.mjs` after initial tooling fixes                                                                         | **29/30 passed**; remaining failure is existing native literal-text check.                                                                                        |
| `node --test scripts/redesign.test.mjs scripts/parity.test.mjs` after final regression additions                                     | **16/16 passed**. Missing row/mapping, alias target, IDs/tags/links and enforcement failures are exercised.                                                       |
| `npm run redesign:inventory` / `npm run check:redesign`                                                                              | **Passed:** 56 destinations, 409 source modules; four tagged guides.                                                                                              |
| `npm run check:foundation`                                                                                                           | **Passed**, with existing source-size review warnings.                                                                                                            |
| `npm run lint` final run                                                                                                             | **Passed:** 0 errors, 69 warnings; dependency boundaries passed.                                                                                                  |
| `npm run typecheck`                                                                                                                  | **Passed**, including shared, API, web and native TypeScript checks.                                                                                              |
| `npm run build`                                                                                                                      | **Passed:** API and production web.                                                                                                                               |
| `npm run build:mobile`                                                                                                               | **Passed:** Expo Android/iOS/web exports; not native installation.                                                                                                |
| `PLAYWRIGHT_CHANNEL=chrome npm run test:web:browser -- --max-failures=3 --output=.ai/reports/redesign/before/browser-test-artifacts` | **Failed:** 4 passed, 3 failed, 19 not run after the requested failure limit.                                                                                     |
| `npm run build:desktop`                                                                                                              | Rust release executable and macOS `.app` built; command **failed** during DMG creation because Finder automation was denied (-1743).                              |
| Database integration                                                                                                                 | **Not run:** TEST_DATABASE_URL is not configured for an isolated disposable test database. No development/production database was substituted.                    |
| Source integrity                                                                                                                     | **Passed:** no app/package TS/TSX/CSS change relative to start-of-phase fingerprint.                                                                              |

Repository `npm run format:check` **failed on 14 pre-existing instruction/prompt/wrapper files**; see `before/format-repository.log`. Targeted formatting of changed code, guides and authored reports passed. Unrelated instruction files were not rewritten. Final summaries are retained in `before/`.

### Existing regression failures requiring follow-up

- Native suite import failures: `Unexpected token 'typeof'` in five suites; native adapter/transformation boundaries need investigation.
- Native preference/theme assertions expect larger text metrics than current tokens.
- Web ManagementWorkflows tests still query the obsolete “Catalog & pricing” navigation label.
- Native text audit reports `apps/mobile/src/catalog/ProductQuantity.tsx:105` and `apps/mobile/src/ui/RichTextEditor.web.tsx:81`; review genuine native literal text versus web-only adapter behavior before changing tests.
- Browser failures expect a 28px heading (actual 22px), 40px control (actual 35px) and 40px table density measurement (actual 37.5px). Reconcile accepted sizing with assertions in a separately scoped test/UI phase; do not loosen expectations merely to pass.
- Mock screenshots do not verify real financial posting, tenant isolation, printing, encrypted offline recovery or device permissions.

## Platform status

| Platform           | Verified                                                                                                                                | Not verified / blocker                                                                                                                         |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Web                | Source inventory, Chrome mock route/theme/viewports, supplemental drawers/tabs/role landings, measured mock responsiveness, build/types | Existing regression failures; real API workflows and production offline restart untested                                                       |
| Windows desktop    | Shared web source and Tauri architecture                                                                                                | Windows host/installer/WebView2/runtime/hardware unavailable                                                                                   |
| macOS desktop      | Shared source, Rust release and `.app` build                                                                                            | DMG blocked by Finder automation permission; installed-app workflows, printer/scanner, native vault and deep links not qualified               |
| Native Android/iOS | Source dispatch/equivalent inventory, types, JS exports                                                                                 | Android adb/emulator absent; Xcode/simctl absent; no native screenshots, keyboard/safe-area/storage/VoiceOver/TalkBack or device qualification |

## Decision checkpoint — approval required before proceeding

1. **Fonts:** approve pinned bundled Geist Sans/Mono with OFL notice, retaining Karla/Lora and existing selected font fallback until an explicit local/system-font migration is approved. Official license evidence is linked in `preferences.md`; no assets/dependency installed.
2. **Defaults:** retain the locked unset defaults; choose how hybrid touch desktop devices resolve compact versus default density. Recommended: coarse primary pointer uses default; explicit user value always wins.
3. **Enforcement:** approve a later explicit cosmetic-policy migration or retain current enforced cosmetic behavior. Consumer trace is documented; no policy was removed. Security/offline/operational enforcement remains mandatory either way.
4. **Legacy axes:** choose compatibility semantics for existing `reduced` motion and simple/enhanced visualizations. Do not silently rename them into behaviorally different minimal/balanced modes.
5. **Dependencies:** none proposed; no new state/forms/chart/animation library is necessary for Phase 1.

Recommended next step: resolve these decisions and separately authorize repair of baseline failures before changing visual tokens. Do not start Phase 2 automatically.
