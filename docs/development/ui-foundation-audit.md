# Prompt 1 — UI foundation audit

Scope: shared presentation only. No changes to business behavior, routes, APIs, schemas, permissions or transactions. Prompt 2 is not started.

## Inspection and impact map

| Layer                          | Existing implementation and change                                                                                                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Canonical tokens               | `packages/design-tokens/tokens.css` already generates native exports. Retain palettes; add table/navigation states, typography/family/native-body/shadow tokens.                                       |
| Web and macOS/Windows renderer | React/Vite/Tailwind 4 CSS-first theme with local shadcn/Radix primitives. Refine global mappings, preference CSS, Button, form controls, Table, Page/Panel and SectionNavigation. No new dependencies. |
| Mobile                         | Expo/React Native with generated palettes and native controls. Preserve 16-unit native body and OS scaling; fix heading line height and centralized shadow color.                                      |
| Settings                       | Existing policy resolver and adapters remain authoritative. Font contract supports system only; no unsupported font selector or alternative preference store added.                                    |
| Data/security/offline          | No changes; existing account/business isolation, workflows and persistence reused for validation.                                                                                                      |
| Tests/showcase/docs            | Existing showcases updated, token contrast extended, native heading regression and browser preference/motion checks added.                                                                             |

## Findings corrected

- Web body, controls, supporting text and headings used competing sizes. Canonical default web scale is now 12/13/14/16/20/28px; text preferences scale it consistently. Native body remains 16 units.
- Table states reused generic muted alpha colors; navigation selection used the primary action treatment. Explicit semantic state tokens now own those surfaces and their text.
- Outline buttons and menus used Tailwind shadow defaults that ignored disabled effects. All consumed shadow utilities now map to semantic elevations.
- Motion CSS was duplicated and used tiny durations for reduced motion, leaving infinite animations running. Consolidated rules suppress animation and transitions, including pseudo-elements.
- Small text buttons had fixed heights and unwrappable labels; they now grow and wrap while retaining minimum targets.
- Native headings inherited body line height, risking clipped large text. Line height now derives from the actual font size unless explicitly provided.
- Native runtime testing exposed duplicate account keys on sibling settings/management panels in both clients. Distinct prefixes preserve account-based remounting and remove React reconciliation warnings; authentication behavior is unchanged.
- Android status-bar icons remained dark over the dark theme. The native shell now sets icon contrast from the resolved theme and keeps scrolling content below the Android status bar.
- The class-merging helper mistook the new control font-size class for a text color; its configuration now preserves both, with an override regression test.
- Common-component documentation incorrectly described authenticated appearance as nonpersistent; corrected to match the existing settings service.

## Validation

| Check                                                                   | Actual result                                                                                                                                                                                                                                                                                            |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run validate`                                                      | Pass: formatting, foundation links, lint/boundaries, strict workspace types, 13 tooling tests, 141 unit tests across 70 files, API/web builds. Six existing source-length warnings; no lint errors.                                                                                                      |
| `PLAYWRIGHT_CHANNEL=chrome npm run test:web:browser`                    | 7 passed: light/dark at 320/1440px, system theme changes, keyboard/labels/dialog/menu focus, axe including contrast, size/density/targets, effects and motion.                                                                                                                                           |
| Disposable PostgreSQL + API/browser workflows                           | All 23 migrations applied to an isolated database. Existing organization/catalog/pricing/stock/purchasing/transfer/customer/POS/return/payment/report/accounting/security workflows passed with synthetic accounts and businesses. Includes settings reload/enforcement and scoped accessibility checks. |
| Additional populated browser check                                      | Light/dark workspace screenshots; 320px large text + compact spacing + teal + disabled animation; no horizontal overflow or axe violations; preferences survive reload.                                                                                                                                  |
| `npm run build:mobile`                                                  | Android, iOS and web exports passed. This alone is not native runtime qualification.                                                                                                                                                                                                                     |
| `npm run build -w @inventory/desktop -- --bundles app`                  | macOS ARM64 app bundle passed (11.54 MiB); launched through macOS `open`, process remains running.                                                                                                                                                                                                       |
| `cargo test --locked --manifest-path apps/desktop/src-tauri/Cargo.toml` | 2 passed: desktop context and durable SQLite migration/revision.                                                                                                                                                                                                                                         |

Android runtime: **verified on an Android 16 ARM64 emulator (API 36), using Expo Go 58.0.5**. This runs native React Native controls in a real Android VM; it is not a mobile browser simulation. Checks exercised API readiness, login, creating “Emulator Foundation Audit”, listing/selecting businesses, large text/compact/teal preferences shared with the browser, restoration of the authenticated session after process restart, light/dark appearance, system appearance following Android night-mode changes, and native showcase controls including confirmation cancellation. The duplicate-key warning disappeared after the fix. Screenshots were inspected, including corrected status-bar contrast. The initial Metro connection needed IPv4 localhost resolution and adb reverse ports; no API origin or environment file was changed in the repository.

The emulator was headless with direct Android UI automation/screenshots. This does not qualify a separately built signed APK, physical devices, camera/printing, native offline recovery or TalkBack. The full database integration suite was not rerun for this presentation-only change; the real migrated database/browser workflow suite was run instead.

Evidence logs on this machine: `/tmp/ui-validate-final.log`, `/tmp/ui-browser-final.log`, `/tmp/ui-workflows.log`, `/tmp/ui-populated.log`, `/tmp/ui-mobile-final.log`, `/tmp/ui-desktop-final.log`, `/tmp/ui-rust.log`, `/tmp/ui-mobile-typecheck-final.log`, `/tmp/ui-final-review.log`. Browser screenshots are under ignored `test-results/`; populated workspace/native screenshots are under `/tmp/ui-workspace-*.png` and `/tmp/ui-native-*.png`. These are local test artifacts, not release artifacts.

## Changed files

- Tokens: `packages/design-tokens/tokens.css`, `tokens.test.ts`, `build.mjs`.
- Web foundation: `apps/web/src/styles.css`, new `theme/preferences.css`; `components/ui/{Button,FormControls,Table}.tsx`; `components/common/Layout.tsx`; `components/layout/SectionNavigation.tsx`.
- Web rendering support: `apps/web/src/lib/{utils.ts,utils.test.ts}`, `features/auth/{AuthPanel,AuthPanel.test}.tsx`.
- Web showcase: `apps/web/src/features/foundation/{TokensDemo,ComponentsDemo,ReferencePanel}.tsx`.
- Native: `apps/mobile/src/ui/{metrics.ts,Themed.tsx,Controls.tsx,NativeShowcase.tsx,Theme.test.tsx}`, `App.tsx`, `auth/{AuthPanel,AuthPanel.test}.tsx`.
- Browser regressions: `tests/browser/appearance-preferences.spec.ts`.
- Documentation: this report, `design-system.md`, `common-components.md`, and `../architecture/platforms.md`.

## Limits and performance

No dependencies, font downloads, charts, providers or migrations were added. Existing feature chunking remains; the 520.92 kB web entry still emits the existing Vite 500 kB warning. No unrelated bundle refactor is attempted. Existing extensionless offline-shell warning also remains.

The macOS app is built and launched, but screen capture failed and `AXIsProcessTrusted()` returned false. Native window clicking, screenshots and VoiceOver are therefore unverified; browser bearer simulation is not counted as a native WebView UI test. iOS simulation is blocked by missing full Xcode (`xcrun simctl` unavailable). Windows is skipped as permitted. No full device/release accessibility certification is claimed.

Native tools are provisioned outside the repository from the [official Android tools](https://developer.android.com/studio) and [Expo Go distribution](https://expo.dev/go). They do not change project dependencies. Test data uses disposable local accounts/businesses; existing development data is not reset or reseeded. The disposable database and test servers are stopped after verification; the emulator retains its SDK/AVD setup but its test-app data is cleared. macOS UI interaction remains an outstanding qualification, not a passed test.
