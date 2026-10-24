# Core component standardization (Prompt 2)

Scope: existing controls and their presentation. No page redesign, new library, API, schema, permission, business rule, storage or synchronization changes. Existing uncommitted work from earlier stages is preserved.

## Audit and impact map

| Layer                               | Existing implementation and change                                                                                                                                                                                                      |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authoritative presentation          | `packages/design-tokens/tokens.css`: shared control heights, selection and icon dimensions; generated native exports use the existing build.                                                                                            |
| Web and desktop primitives          | `components/ui/Button`, `FormControls`, `Menu`: size variants, stable loading, pressed/selected feedback, read-only/disabled/error presentation, portal and bounded menu scrolling. Existing Radix and native select semantics remain.  |
| Common and feature consumers        | `FormField`, `CommandForm`, `IconButton`; catalog textareas, organization permission checkboxes and appearance checkbox now use the existing primitives. Field names, defaults, validation limits, required flags and callbacks remain. |
| Mobile                              | `ui/Action`, `Controls`, `Themed`, `AppearanceControl`; authentication and connection-check actions reuse Action. Native target sizes, theme preferences, accessible state and native pickers remain platform-specific.                 |
| Backend, transactions and contracts | No changes. Existing API validation, authorization and idempotency remain authoritative.                                                                                                                                                |
| Persistence, outbox and caches      | No changes. Loading presentation does not implement retries, scheduling or recovery.                                                                                                                                                    |
| Evidence and documentation          | Web `ControlStatesDemo`, native `NativeShowcase`, component unit tests, real-browser state/geometry/keyboard checks, common component guide. Validation results below.                                                                  |

## Interaction contract

| State           | Web / shared desktop                                                                                   | Native mobile                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Default         | 40px buttons/fields, 32px small, 48px large, 36px icon; 14px text, semantic radius and borders         | At least 48 units; scalable 16-unit text                                                                           |
| Compact / touch | 36px default in compact density; coarse pointer controls retain a 44px minimum and 16px field text     | Density reduces spacing, never the 48-unit minimum                                                                 |
| Hover / pressed | Semantic hover surfaces; inset pressed outline, no transform                                           | Pressed border feedback; no scaling or delayed action                                                              |
| Focus           | Existing 3px focus-visible outline; Radix menu highlight and keyboard handling                         | Input accent border; action/choice focus outline for external keyboards                                            |
| Selected        | `aria-pressed` ring; native checked controls; existing navigation state                                | Radio checked semantics, dot and selected surface/foreground                                                       |
| Disabled        | Native disabled semantics, opaque readable muted colors                                                | Native disabled state and matching palette                                                                         |
| Loading         | Opt-in Button `loading`: accessible busy/disabled state; retained label footprint and overlaid spinner | Opt-in Action `loading`: busy/disabled state, retained footprint; static indicator when motion is reduced/disabled |
| Invalid         | Existing `aria-invalid` and associated descriptions/errors; no new validation                          | Opt-in Field error / TextInput invalid presentation; native accessibility hint, Expo web described-by association  |
| Read-only       | Native readOnly with muted surface; remains focusable and included in form data                        | Native readOnly; distinct from disabled presentation                                                               |

Text controls can grow with text scaling or wrapped labels. Checkboxes use 18px glyphs within labelled targets. Lucide inline icons are 16px; icon-only controls use 20px icons and require an accessible label. Menus render into a Radix portal with viewport bounds and the trigger's minimum width. No combobox, switch, web radio group or autocomplete widget currently exists: native selects/checkboxes and native radio choices remain the supported equivalents. Do not create an unused parallel widget library.

Specialized navigation tiles, warehouse nodes and disclosure controls retain their existing structures and ARIA semantics. They are not ordinary command buttons. Production mutations are not automatically given loading state: their existing owner controls pending state, permission checks and duplicate prevention. `loading` is not supported on Button `asChild`; links retain native navigation semantics. Confirmation flows are unchanged.

## Validation

Commands and platform checks below were executed for this change.

### Results (21 October 2026)

- `npm run validate`: passed formatting, foundation checks, lint (0 errors, 6 existing length warnings), boundaries, workspace type checks, 13 tooling tests, 155 unit tests in 76 files, and API/web builds.
- Final direct TypeScript checks for web, mobile, mobile tests and root: passed. Focused tests after the native refinements: 10 passed in 4 files. Final lint: 0 errors, the same 6 existing warnings; 643 modules / 3,012 dependency edges, no violations.
- `PLAYWRIGHT_CHANNEL=chrome npm run test:web:browser`: 10 passed. Light/dark at 320px and 1440px, system appearance, axe including contrast, keyboard focus/menu/confirmation, readonly/disabled/invalid controls, 40/32/48/36px sizing, stable loading dimensions, compact/coarse-pointer 44px targets including checkbox labels, menu portal clipping, effects and motion preferences.
- Existing `tests/manual/organization.mjs` against a disposable PostgreSQL/API/browser environment: all 23 migrations executed and all 17 workflow groups passed. This covers organization, permissions, settings, catalog/pricing, stock, purchasing/returns, transfers, POS, payments, reports, recovery and session-host checks. Initial unsigned-session 401s and the deliberate invalid-checkout 409 are expected; neither localhost alias returned authenticated 401s. Disposable test accounts/business data were cleaned up.
- Running Vite browser: local development account and existing Design Review Store/four catalog records loaded, product detail worked, light/dark accessibility scans and 375px overflow checks passed, session survived reload. The existing local records were reused rather than duplicated.
- `npm run build:mobile`: Android, iOS and web JavaScript exports passed. Expo web on localhost passed real cookie login, protected catalog access, reload and HttpOnly/Strict cookie checks.
- Android 16/API 36 ARM64 emulator with Expo Go: refreshed native bundle ran; account session restored, fresh login succeeded, and the protected Design Review Store catalog loaded all four products. Native choice selection, action callback, busy/disabled loading, read-only reference and linked error presentation were exercised. Read-only value remained REF-EXAMPLE during attempted input. Light/dark component screenshots were inspected. Choice layout retains full available width for vertical groups.
- macOS ARM64 native WKWebView: a temporary external Tauri host using the built application and existing security configuration passed login (201), protected catalog access, control sizes, stable loading, selected state and light/dark appearance. The temporary script waits for initial session verification before submitting; early harness attempts that clicked during the disabled initial state were corrected. The host and script are outside application source and removed after use.
- `npm run build -w @inventory/desktop -- --bundles app`: normal macOS application bundle built and launched. Binary inspection confirmed that verification hooks are absent. The normal application is rebuilt after instrumentation; no verification hooks enter repository source or the shipping app.

### Remaining limits

Windows execution is unavailable on this macOS host and was skipped as requested. iOS JavaScript export is verified; no full Xcode/iOS Simulator or signed native device build is available. Android testing uses Expo Go, not a signed standalone APK. VoiceOver/TalkBack and hardware keyboard behavior across every OS still need device qualification; DOM keyboard coverage and native accessibility semantics are verified, not a complete assistive-technology certification.

Six existing source-length warnings and the existing approximately 521KB web entry chunk warning remain. Native picker option rendering is controlled by the OS; it is not replaced with a custom combobox. Specialized navigation/disclosure/warehouse controls keep their existing semantics and layout. No speculative switches, web radio widgets, external tooltip package or component library was added. Stop here: Prompt 3 and page redesign are not part of this change.
