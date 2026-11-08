# Phase 3 — shared components and approved Phase 2 foundation

## Scope and decision

User approved the Phase 2 draft and explicitly authorized implementing its foundation first. Implemented that foundation and Phase 3 shared-component work on `redesign/phase-3`. No Phase 4 work, commit, or implementation tag. DEV-036 requires a reviewed authorized commit for an implementation tag; existing dirty work is preserved.

## Inspected

Read AGENTS, global/Phase 2/Phase 3 prompts and canonical guides; traced web/Tauri, React Native, token generation, settings contracts/model/service, showcase, chart consumers and shared CSS. Reviewed operational-ui, shell-controls, inventory-refinement, catalog-cart, sidebar-refinement and navigation-refinement ownership. Route inventory covers 56 routes; the source inventory now includes 413 TSX modules. Route screenshots exercise mocked data, not production transactions or every business state.

## Changed

- Centralized neutral light/dark surfaces, primary/selected states, semantic statuses, typography, spacing, control metrics and transitions. Accent remains for links, focus and charts. Generated native tokens resolve aliases from the same source.
- Implemented approved theme, density, control size, animation and chart presentation axes. Unset defaults: light, compact desktop/default touch, medium, minimal and balanced. Existing stored choices, legacy fonts/effects and operational policy remain supported. New axes remain optional for old saved data.
- Approved cosmetic policy migration now preserves stored policy records but stops applying cosmetic enforcement. Currency, pagination and security/operational policy retain their precedence. No settings-storage replacement or reset. Older strict clients need a coordinated deployment because they may reject new response keys.
- Bundled licensed Geist Sans/Mono, retaining Karla/Lora and selected legacy font fallbacks. New selectable fonts are bundled. Font source, checksums and OFL license accompany assets; no CDN or dependency added.
- Kept confirmed preferences when a refresh fails; account switches still clear old context. A successful save followed by a failed policy reload now retains the confirmed server response. API writes preserve new optional axes when an older write omits them. Existing version/auth/transaction checks remain.
- Consolidated 56 shared CSS rules with breakpoint/layer/source-order evidence in `phase-3-css-moves.json`. Shared collections and controls have owning stylesheets; feature-specific shell/cart rules remain where appropriate. Removed competing accent selection/hover and fixed density-dependent select padding/search-prefix placement. Actual select height is invariant when only density changes.
- Updated web/native controls, focus, table surfaces, numeric rendering and preference previews. Reused Radix/Vaul behavior and existing mature primitives; no form framework migration or replacement of business components.
- Added web/native ChartPresentation with exact-value alternatives and optional chart reveal. Updated existing report chart consumers without changing aggregation, date ranges, currency or metrics.
- Updated `/design-system` and native showcase with local-only foundation controls, live component examples and license information. Preview controls do not save preferences or mutate business data.
- Added AST/CSS design checking to the existing UI audit/validate path. Baseline counts multiplicity, so copying an existing violation fails. Current result: 137 baseline findings, zero new groups, one improved group; baseline debt is not claimed fixed.

## Files and documentation

Exact source files created/modified relative to this phase's starting hashes: [phase-3-changed-files.json](phase-3-changed-files.json) (73 files). Additional assets: `packages/design-tokens/fonts/Geist.ttf`, `GeistMono.ttf`, `Geist-OFL.txt`, `geist-source.json`, and tooling baseline `scripts/design-baseline.json`. No source files removed. Generated build/export output is not authored source.

Canonical guides changed: `docs/design-system.md` (token/preference contract, platform mapping, ownership and guardrails) and `docs/development.md` (design-check workflow). Architecture/security guides unchanged. Exactly four canonical guides remain. Props remain in typed source; runnable examples remain in showcases.

## Behavior preserved and limits

No routes, permissions, authentication, inventory ledgers, prices, checkout calculations, transaction flows, migrations or database tables changed. Settings contracts and cosmetic resolution changed only under the explicit Phase 2 approval. Generic saves remain single-attempt and confirmed response handling retains generation/account guards. Known settings apply before paint; remote initial settings may still cause a later appearance transition—no second bootstrap cache was introduced.

Native equivalents use React Native controls, never DOM primitives. Tests mock only the native WebView host where necessary; this does not qualify native execution. Feature pages were not redesigned or exhaustively requalified. Legacy literal-token debt and retained feature CSS require later scoped migration.

## Verification

- TypeScript: repository type check passed; final web/native checks passed.
- Lint: 0 errors, 69 warnings; dependency boundaries passed (1,239 modules, 6,995 dependencies).
- Foundation: passed (37 documents, 1,341 source files), with existing file-length review warnings. Redesign check passed (56 routes, four canonical guides).
- UI audit: 590 source files, four review findings. Design checker: 497 files, 137 baseline findings, zero new groups, one improved group.
- Focused component verification: 70 tests in 30 files passed. Latest additional settings/appearance regressions: 20 tests in five files passed. Tooling: 19/19 passed.
- Full suite: 166 files passed; five failed. 425 assertions passed, two failed. Two web ManagementWorkflows assertions expect the old “Catalog & pricing” navigation label. Four native suites fail during WebView/Flow import (entry, catalog, organization, POS); these are not counted as passing. Full logs retained under `phase-3-validation/`.
- Rendered browser preference test: 36 theme/density/control-size corners, zero document-overflow cases; actual select height invariance, real local-preview radio wiring and reduced-motion transition suppression passed. This is targeted coverage, not an exhaustive Cartesian test of all legacy preferences.
- Formatting: all 73 phase source files pass scoped Prettier check. Whole-repository format check failed on 18 files before formatting the one changed settings test; remaining findings include pre-existing instructions/prompts/wrappers and generated JSON. Whole-repository formatting is not claimed green.
- API/web production builds passed. Mobile Android/iOS/web JavaScript exports passed.
- Real database integration was not run: TEST_DATABASE_URL is unavailable. No real stock/money transactions were exercised.

## Platform status

| Platform      | Evidence                                                                         | Remaining gate                                                                                                               |
| ------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Web           | Production build, Chrome mock-route captures, preference/overlay/component tests | Real backend workflow regression and full assistive-technology testing                                                       |
| macOS Tauri   | Rust release build and `.app` produced using shared web frontend                 | DMG packaging fails Finder Automation permission (-1743); installed-app printing/vault/deep-link tests not performed         |
| Windows Tauri | Shared frontend checked                                                          | Windows build/installer/runtime unavailable on this host; not qualified                                                      |
| Native mobile | Type checks, component tests and Android/iOS JS exports                          | No adb or usable simulator runtime; device interaction, safe-area/keyboard/font rendering and native integrations unverified |

## Evidence provenance and performance

Fresh pre-change screenshots are in `phase-3-before/` (264 captures). Original Phase 1 primary route screenshots remain intact. During an early supplemental run, a fixed output path overwrote the old supplemental screenshots; `before/supplement/PROVENANCE.txt` identifies those as invalid baseline evidence. Original performance JSON was restored from its untouched log. Scripts now honor REDESIGN_OUT. Use the fresh Phase 3 before captures for comparison; do not treat overwritten supplemental images as before evidence.

Final screenshot/measurement evidence is recorded below. Earlier `phase-3-after`/`phase-3-final` runs are diagnostic, not final acceptance: HMR interrupted some captures, and one run used a lowercase theme option against a capitalized label; the runner was corrected.

Production totals across all chunks: JS 1,684,665 bytes (+1.25% against Phase 1); CSS 135,060 bytes (+5.71%); fonts 647,236 bytes (+341,024 bytes, +111.37%). Font growth is the approved two bundled Geist fonts while retaining existing user fonts. These sums are not initial route payload or production interaction latency. Per-file sizes are in `phase-3-validation/bundle-sizes.json`.

## Remaining work / next step

Resolve the documented existing test-runner/navigation failures, configure a test database, and qualify real Windows/macOS/mobile devices before release. Coordinate settings client/server rollout. No further redesign phase started; review this foundation/shared-component result before authorizing workflow migration.

## Final browser evidence

`phase-3-verified/browser-results.json` records 262 captures plus two interrupted captures recovered in `recovered-captures.json` (264 successful cases total). The interruption came from the repository type-check command rebuilding shared assets during capture; both affected routes, Storage and Trading, were recaptured after it finished. No measured page overflow or recorded theme mismatch. Eleven other issue records concern intentionally blocked external-image loading; some error arrays are drained by the runner after issue collection. No all-network-success claim.

Widths: 390, 844 (390px landscape height), 1,024, 1,280, 1,440 and 1,920px. Broad route sweep uses 390/1,440 light/dark; additional widths cover POS, inventory and preferences. Inspected showcase and inventory screenshots; current 390px search text starts 4px after its icon, with no overlap. These are Chrome mock-data checks, not real devices or complete end-to-end transaction qualification. Final repository type check and `git diff --check` passed.

Supplemental evidence: 43 overlay/editor/cart/role captures completed with no reported errors or overflow (`phase-3-verified/supplement/results.json`). Visually inspected the final 1,440px light POS cart and 390px inventory, including independent cart scrolling/visible checkout and search-prefix spacing.

Final development-mock timing: cold POS list 260ms; warm samples 68/202/57/192ms; search median 403ms versus baseline 394ms (debounce and browser automation included). No timing-run issues. These small local samples do not establish a production performance regression or release budget pass.
