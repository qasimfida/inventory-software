# Platform development

The mandatory scope rule is canonical in [AGENTS.md](../../AGENTS.md): an unspecified platform means all applicable supported platforms; an explicit platform limits UI/integrations, while required shared-layer changes still apply. Inspect actual support first, disclose missing foundations, and implement them only within task scope. Never equate a planned platform with a completed one.

| Platform | Scaffold and verification                                                                | Remaining qualification                                                                                        |
| -------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Web      | React/Vite authentication and management; build, Chrome workflow and axe checks verified | Broader browser/device qualification; IndexedDB and offline startup absent                                     |
| Windows  | Tauri host consuming web frontend; Rust source/config present                            | Native build requires Windows OS/MSVC/WebView2; installer, storage and hardware unverified                     |
| macOS    | Tauri macOS ARM64 release `.app` build verified; shared web management UI                | Native WebView management, signing/notarization, DMG and hardware tests pending                                |
| Android  | Expo React Native shell; Metro/Hermes export and typecheck verified                      | Android adb and Java runtime absent; native build/device tests blocked; SecureStore adapter runtime unverified |
| iOS      | Expo React Native shell; Metro/Hermes export and typecheck verified                      | Full Xcode and CocoaPods absent; native build/device tests blocked; SecureStore adapter runtime unverified     |

See the [startup repair report](../development/startup-repair.md) for current verification and [platform setup and feasibility](../platforms/setup.md) for prerequisites, capability choices and commands. Scaffolded clients are applicable to future features by default, but native verification limitations must be reported separately. No platform is a production-qualified POS release.

## Sharing boundary

- Share pure domain rules, runtime wire schemas, API error semantics, synchronization state machine and application use cases through ports. Native clients must remain compatible with deployed contract versions.
- Share DOM UI between web and desktop. Mobile uses native components/navigation; shadcn/ui DOM primitives are not native UI. Share design tokens and validation behavior where useful.
- Isolate local persistence, credential storage, clock/ID generation, connectivity, scanners, printers, filesystem, and lifecycle in platform adapters. SQLite implementations need transactional outbox, migration, and crash-recovery conformance checks.
- A USB keyboard-wedge scanner, mobile camera scanner and native scanner SDK are different integrations. Browser print dialogs do not prove native receipt printer support. Native permissions use least privilege.
- Backend authorization remains authoritative even when shared client validation passes. Device credentials must not be embedded in shared code.

## Applying scope

“Implement checkout” requires applicable UI, storage, contract, backend and device paths across supported clients; absent clients become named scope decisions/blockers. “Web inventory dashboard only” changes web UI and necessary shared dependencies. “Fix Windows receipt printing” follows the Windows adapter unless tracing finds a shared defect. “Live product prices” traces all actual price consumers, subscriptions and recovery paths.

## Adding support

Scaffold a platform only under an authorized task. Prove launch/build, storage atomicity, migration recovery, secure credentials, lifecycle/reconnect, and required hardware on its actual OS. Register its scripts and CI/device coverage, update this support table and the module map, and list limitations. Until native checks run, report implementation separately from verified support.

Command 6 adds authentication UI on every scaffolded client. Web uses HttpOnly cookies; Tauri uses memory-only credentials; Android/iOS use the Expo SecureStore adapter. Android/iOS/web exports and a macOS release `.app` build passed locally. Actual Android/iOS vault behavior, Windows native build, desktop WebView authentication and release signing remain unqualified. DMG creation is blocked by Finder automation permission on this host. See [authentication policy and validation](../security/authentication.md).

Command 7 adds scoped business, membership, store/branch, warehouse and terminal management on web/desktop and native mobile. [Organization validation](../development/organization-management.md#validation-results) records exact database, browser, component and platform build results. Desktop transport simulation in Chrome is not native WebView verification. Android/iOS exports are not native application builds.

The [eight-command domain rollout](../development/domain-rollout.md) adds catalog/pricing, stock, purchasing, storage and transfer screens to web/Tauri and native mobile. Current native hardware and installation limits in the table still apply; shared UI coverage does not qualify a Windows or mobile release.

## Commerce adapters

Web and both Tauri hosts consume the same DOM checkout/customer/cash/correction UI. Expo owns native equivalents. Receipt text is generated from server-confirmed facts; web/Tauri use a transient iframe and the system print dialog, while mobile uses the Expo SDK-matched `expo-print` adapter. HTML text is escaped or assigned through `textContent`; print success/cancellation never changes sale/payment state. These adapters do not implement ESC/POS, cash drawers, silent printing or fiscal certification. Physical printer and native WebView/device qualification remains pending. Browser keyboard-wedge barcode entry and mobile camera entry use the existing platform adapters. Exact commerce build/test results are in [commerce rollout](../development/commerce-rollout.md).

## Offline and scanning implementation

Web/Tauri and mobile now expose equivalent offline register and warehouse/count controls. Web uses IndexedDB and a production service-worker shell; desktop uses bundled rusqlite behind narrow Tauri IPC; Android/iOS use SDK-matched Expo SQLite; Expo web uses IndexedDB without a separate offline shell. Native camera scanning reuses Expo Camera; USB/Bluetooth keyboard wedges require no SDK. See [offline rollout](../development/offline-rollout.md) for exact verification. Windows runtime, installed Android/iOS SQLite, native camera hardware and physical scanner qualification remain required; successful JS export is not device certification.
