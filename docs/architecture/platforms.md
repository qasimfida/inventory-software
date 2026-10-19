# Platform development

The mandatory scope rule is canonical in [AGENTS.md](../../AGENTS.md): an unspecified platform means all applicable supported platforms; an explicit platform limits UI/integrations, while required shared-layer changes still apply. Inspect actual support first, disclose missing foundations, and implement them only within task scope. Never equate a planned platform with a completed one.

| Platform | Scaffold and verification                                            | Remaining qualification                                                                         |
| -------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Web      | React/Vite shell; TypeScript and production build verified           | Browser interaction/accessibility tests; IndexedDB and offline startup absent                   |
| Windows  | Tauri host consuming web frontend; Rust source/config present        | Native build requires Windows OS/MSVC/WebView2; installer, storage and hardware unverified      |
| macOS    | Tauri native debug build and launch verified; no native APIs enabled | Release/signing/notarization and hardware tests pending                                         |
| Android  | Expo React Native shell; Metro/Hermes export and typecheck verified  | Android adb and Java runtime absent; native build/device tests blocked; storage adapters absent |
| iOS      | Expo React Native shell; Metro/Hermes export and typecheck verified  | Full Xcode and CocoaPods absent; native build/device tests blocked; storage adapters absent     |

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
