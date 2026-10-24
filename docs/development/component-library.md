# Component library and showcase — Prompt 4

## Discovery and organization

Web and Tauri retain the existing lazy `/#/design-system` route, rather than adding a duplicate `/dev/components` route. Development Settings links to it; production navigation does not. The previously available direct route remains available in built applications, with no sensitive data or business commands. `FoundationPage` renders real components and embedded Markdown references. Its section index focuses/scrolls without replacing the router hash.

| Location                            | Responsibility                                                                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/web/src/components/ui/`       | Existing Button, native form wrappers, Radix dialog/menu, Table, StatusBadge, Skeleton                                               |
| `apps/web/src/components/common/`   | Reusable presentation, fields/errors, confirmation, pagination, metric/value display, command adapter and existing workspace helpers |
| `apps/web/src/components/layout/`   | WorkspaceHeader and SectionNavigation                                                                                                |
| `apps/web/src/features/foundation/` | Safe developer examples, local state and section index                                                                               |
| `apps/web/src/features/<feature>/`  | Existing feature-owned flat structure; no cosmetic folder migration                                                                  |
| `apps/mobile/src/ui/`               | Native controls, surfaces, metrics, exact rows, disclosure and confirmation equivalents; NativeShowcase                              |
| `packages/design-tokens/`           | Shared semantic tokens, not cross-runtime UI                                                                                         |

See [web common API reference](component-catalog.md), [native API reference](native-component-catalog.md), [usage guide](common-components.md), and [core](core-components.md)/[complex](complex-components.md) interaction contracts. No new package, dependency or Storybook installation is justified: the existing lazy showcase, Markdown and browser/native tests cover isolated component development.

## Audit decisions and impact map

Existing Layout/Page/Panel/Cluster already cover headings, action groups and information panels; FormField/CommandForm cover repeated fields; AsyncState covers feedback; IconButton/Pagination/MetricCard and Radix Menu/ConfirmDialog cover repeated actions and presentation. Catalog filters depend on feature data; moving them to common would couple unrelated workflows. They remain local. No duplicate component was extracted merely to expand the catalog.

| Layer                               | Scope and evidence                                                                                                                               |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Source                              | Existing primitives reused; each common export has props/defaults, examples, accessibility, responsive/theme, dependencies and limits documented |
| Routes/UI                           | Existing hash route preserved; index, spacing specimens, offline/success examples and embedded API docs added                                    |
| Settings                            | Explicit preview mode in web AppearanceProvider/native ThemeProvider; local choices never save account settings, normal providers unchanged      |
| Native                              | Existing development-only NativeShowcase gains isolated theme selection and actual Surface example                                               |
| API/schema/transactions/permissions | No changes; no migration, business fetch or command added                                                                                        |
| Offline/storage                     | Demo state is intentionally ephemeral; no durable outbox or cached tenant data used                                                              |
| Verification                        | Unit isolation tests, browser no-request/keyboard/theme checks, workspace checks and platform builds                                             |

The old showcase reused the account appearance setter and rendered the live connection check. These are corrected: preview choices never call settings.save and the web showcase makes no API requests. Leaving the web preview restores surrounding theme attributes. Native preview has its own provider subtree; the surrounding Settings connectivity diagnostic remains a separate existing read-only check.

## Example coverage

- Both token palettes, typography, visual spacing scale and local light/dark/system selection.
- Actual Button/IconButton variants, focus/hover via real interactions, pressed, busy, disabled and destructive states.
- Labelled inputs/select/checkbox/textarea, error-summary focus, disabled options, read-only and invalid controls.
- Panel and MetricCard, passive semantic badges, exact tables/units, pagination and selected-row styling.
- SectionNavigation and native details/disclosure; native date input preserves locale/calendar behavior.
- Radix menu and confirmation dialog, keyboard focus trapping, Cancel/Escape, persistent feedback.
- Loading, empty, error/retry, honest offline/pending and success examples.
- CommandForm and all workspace compatibility helpers with local values only.

The repository has no general ARIA tabs, drawer, custom calendar, chart, popover or timed-toast abstraction. The guide states the actual equivalents; it does not install unused widgets or simulate unsupported functionality. Title labels are browser hints, not claimed accessible custom tooltips. Operational inbox notifications remain feature-owned and are not loaded into the showcase.

## Contribution rules

1. Search existing primitives and consumers before adding a component. Extract only a repeated presentation concern, never business permissions or calculations.
2. Use semantic tokens and existing typography/density/motion rules. Do not scatter raw colors or bypass reduced-motion settings.
3. Put shared DOM presentation in common, navigation in layout, native equivalents in mobile/ui and feature-only UI in its owning feature. Never import DOM components into native or UI into portable packages.
4. Keep props explicit and strictly typed. Document required/optional props, defaults, limits and accessibility. Avoid speculative universal schemas.
5. Add an actual local showcase example and update the relevant API catalog in the same change. Every new common export needs documentation; inspect examples against current types.
6. Test meaningful behavior: focus, labels, disabled/loading guards, exact value preservation and demo isolation. Hover/focus examples should be interactive, not pretend static states.
7. Never place credentials, production data or live mutation clients in a demo. Preview appearance is development presentation only, never a policy override for business screens.
8. Preserve business handlers, validation, permissions, contracts, transactions and routes during visual refactoring. Record platform checks honestly.

## Verification

- `npm run validate`: passed formatting, foundation checks, lint and dependency boundaries, all workspace TypeScript checks, 14 tooling tests, 162 unit tests across 80 files, API and web builds. Final unit rerun: 162/162, 80/80; focused final native and root test/tooling TypeScript checks passed.
- `PLAYWRIGHT_CHANNEL=chrome npm run test:web:browser`: 17/17 passed. Covers light/dark/system, 320/1440px, keyboard/focus, dialogs/menus, actual contrast/axe, no API requests from the showcase, local state and return to workspace. An additional focused rerun passed after adding expanded web/native reference overflow checks at 320px.
- The default Playwright launch could not find its downloaded Chromium binary; the installed Chrome channel was used. An initial Chrome run overlapped generated-package rebuilds and experienced HMR navigation/focus failures. Repeating against stable generated assets passed without weakening assertions.
- Native Android 16 ARM64 emulator / Expo Go: restored existing session, opened Settings and the development showcase, switched only the preview to dark while the surrounding account stayed light, rendered Surface/fields and exact DataRow values, submitted the local native quantity example (`1.250000` retained), and confirmed the local example. A missing preview background was corrected and regression-tested. No business record was changed.
- macOS native WKWebView: isolated temporary Tauri host using the built frontend and existing CSP passed section-index focus, dark preview, Cancel initial focus/dialog dismissal, and zero API requests. Native result: `native=true,theme=true,sectionFocus=true,confirmation=true,apiRequests=[]`. Temporary hooks are not part of the deliverable.
- `npm run build:mobile`: final Android/iOS/web JavaScript exports passed. This does not qualify a signed standalone mobile build. Native Windows and iOS execution are unavailable on this host and were not claimed.
- Six existing source-length warnings and the existing approximately 522KB main-entry bundle warning remain. The showcase and embedded Markdown are loaded in its lazy route chunk, so the documentation does not load on workspace entry. No new dependencies.
- `git diff --check` passed. No schema/migration/API/business code changed; no new migration or full database workflow suite was needed or run. Existing business data and unrelated workspace changes were preserved.

`npm run build -w @inventory/desktop -- --bundles app` passed: normal macOS app bundle 11.57 MiB. The packaged executable was checked for absence of temporary test hooks and launched. The temporary host/scripts were removed; the owned Metro server and emulator were stopped. Original development services were left running.
