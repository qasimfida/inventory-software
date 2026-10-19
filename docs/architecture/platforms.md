# Platform development

The mandatory scope rule is canonical in [AGENTS.md](../../AGENTS.md): an unspecified platform means all applicable supported platforms; an explicit platform limits UI/integrations, while required shared-layer changes still apply. Inspect actual support first, disclose missing foundations, and implement them only within task scope. Never equate a planned platform with a completed one.

| Platform | Current status                      | Target UI / persistence                     | Required qualification                                                                           |
| -------- | ----------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Web      | Not scaffolded                      | React DOM / IndexedDB                       | Browser matrix, offline app startup, quota/eviction, multi-tab writers                           |
| Windows  | Not scaffolded                      | Shared React DOM in proposed Tauri / SQLite | Windows build, WebView2, installer/signing, printers, update/recovery                            |
| macOS    | Not scaffolded                      | Shared React DOM in proposed Tauri / SQLite | macOS build, WKWebView, permissions, notarization/signing, printers                              |
| Mobile   | Not scaffolded; OS matrix undecided | Proposed React Native / native SQLite       | iOS/Android targets to confirm; lifecycle/background suspension, camera, secure storage, devices |

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
