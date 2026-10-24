# Web design foundation

The design reference screen is at `/#/design-system`; the default `/#/` route opens the authenticated business workspace. The showcase contains only local examples; existing business workflows remain on the workspace route. Guest appearance is temporary; authenticated appearance uses the Command 25A settings service and respects platform/business policies. The showcase uses an isolated appearance preview and no API connection check; live connection diagnostics remain in Settings.

## Ownership and reuse

| Location                            | Responsibility                                                                                  |
| ----------------------------------- | ----------------------------------------------------------------------------------------------- |
| `packages/design-tokens/tokens.css` | Canonical semantic colors and design metrics; generated native exports keep palettes aligned    |
| `components/ui`                     | App-neutral Button, native form controls, Radix dialog/menu wrappers and semantic table styling |
| `components/common`                 | Layout, field/error presentation, loading/empty/error/retry states and confirmation composition |
| `features/foundation`               | The small demo, its local validation/state, and the existing API connection check               |
| `app`                               | Routing, route-loading fallback and page failure recovery                                       |

Keep feature state and API calls out of UI primitives. Do not move DOM components into contracts or api-client. Both browser web and Tauri desktop consume this same UI. The existing shadcn Button and scoped Radix Slot are retained. New dialog/menu wrappers follow shadcn composition conventions using the same scoped Radix stack; they are local implementations, not claimed verbatim registry copies. Native input, select and checkbox elements provide their built-in semantics and platform keyboard behavior. Stage 3.5 adds one portable token workspace and named Lucide icons. No form framework, data grid, new native styling framework, or unused future control was introduced.

Sources: [shadcn dialog composition](https://ui.shadcn.com/docs/components/dialog), [Radix Dialog](https://www.radix-ui.com/primitives/docs/components/dialog), and [Radix Dropdown Menu](https://www.radix-ui.com/primitives/docs/components/dropdown-menu).

## Tokens and layout

Light and dark palettes are defined in `packages/design-tokens/tokens.css`; web imports the CSS directly. Its build generates pure JavaScript and declarations for native consumption. `apps/web/src/styles.css` maps those variables into Tailwind. Both platform appearance adapters default to system. Command 25A supplies account preferences and effective platform/business policy from one shared typed resolver; guest overrides remain temporary. No credentials or policy authority are placed in browser storage. Offline startup uses safe defaults until authenticated settings load. See [settings and security architecture](command-25a.md).

Run `npm run build:shared` after editing canonical tokens to regenerate native values. Web prebuild and mobile prebuild do this automatically. Theme changes preserve mounted workflows and drafts. Input/focus/text/disabled/status contrast is tested in both palettes. There are no charts requiring chart tokens or visualization dependencies. Error uses the destructive semantic foreground with explanatory text.

| Concern       | Convention                                                                                                                                                                       |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Surfaces/text | `background`, `card`, `foreground`, `muted`, `muted-foreground`; use supporting text without lowering opacity                                                                    |
| Actions       | `primary`/`primary-foreground` and `secondary`/`secondary-foreground`; accents are for hover/selection                                                                           |
| Feedback      | `destructive`, `success`, `warning`; always include explanatory text, never color alone                                                                                          |
| Borders       | Subtle `border` for grouping, stronger `input` for control boundaries                                                                                                            |
| Focus         | 3px solid `ring` with a 3px offset; never remove the only visible focus indicator                                                                                                |
| Font          | System sans from family tokens, web body 14px and native body 16px with 1.5 line height; monospace reserved for technical values                                                 |
| Hierarchy     | h1 28px; h2 20px; h3 16px; body/controls 14px; labels/tables 13px; supporting 12px. Tailwind text sizes reference canonical metrics scaled by the resolved text-size preference. |
| Spacing       | 4px unit; use 8, 12, 16, 20, 24, 32 and 48px rhythm through Tailwind spacing utilities                                                                                           |
| Radius        | Small 6px, medium 8px, large 12px, extra-large 16px                                                                                                                              |
| Targets       | Fine-pointer defaults 40px (compact 36px), small 32px, large 48px, icon 36px; coarse-pointer minimum 44px. Checkbox sits inside a clickable 44px label.                          |

`Page` owns the centered width, responsive padding, main landmark and skip link. Its skip link focuses the main element without overwriting the application's hash route. Use one Page per route. `Stack`, `Cluster`, `Grid` and `Panel` own vertical flow, wrapping actions, responsive columns and grouped surfaces respectively. Grid becomes two columns at the large breakpoint; panels and fields permit shrinking. Avoid fixed widths and page-level horizontal scrolling. Long data tables may need a separately named scroll region when a real data use case arrives; the reference table fits a narrow screen without one.

Respect reduced motion; global transition/animation overrides apply when requested. System fonts avoid an external font dependency. The primitive Button defaults to `type="button"`; form submissions must explicitly use `type="submit"`. Changes from the original shadcn Button are documented here: 40px desktop defaults, 44px coarse-pointer minimum, 48px large targets, shared opaque focus outline, and safe default button type. Color changes apply atomically; only shadows transition, preventing low-contrast intermediate colors during appearance changes.

## Forms and feedback

Use FormField's render function to spread its id, required, aria-invalid and aria-describedby properties onto the actual control. Every field has a visible label; required status is both textual and native. Hints persist independently from errors. ErrorSummary announces failed submission, receives focus, and provides buttons that focus the offending fields without modifying hash navigation. Inline errors are linked descriptions rather than duplicate alert announcements. Validate on submit, preserve entered values, and remove stale errors as the example field changes. Future server errors must use safe messages and the same presentation, not expose internal details.

The demo intentionally uses native form elements with local state. Its Update preview action is a synchronous example, not a persistence operation. The confirmation wrapper is also for synchronous actions: the demo reset executes only after explicit confirmation. Async destructive workflows need a separately designed pending/error flow rather than passing an unhandled promise to this wrapper.

LoadingState uses a polite status announcement; ErrorState announces a failure and exposes a real retry button; EmptyState explains absence of content. RouteLoading and RouteError reuse those conventions. Confirmation dialogs have accessible titles/descriptions, initial Cancel focus, modal focus containment, Escape cancellation and trigger focus restoration. Outside pointer clicks do not confirm or dismiss the confirmation. Generic Dialog consumers must provide a title, description and explicit close action. Menus retain Radix arrow-key/Enter/Escape behavior and disabled-item skipping. Action menus are non-modal and render in place within the page landmark; do not put a clipping overflow container around them. This avoids hiding unrelated focusable controls or moving menu content outside landmarks. Highlighted menu items have an inset focus ring. Tables use a caption and explicit column/row header scopes.

## Native equivalents

Desktop renders the same web components in Tauri; its Rust host remains isolated. Browser checks validate DOM behavior, while WebView/OS assistive technology and release qualification still need native checks.

Mobile remains Expo/React Native and imports no DOM components. `src/theme.tsx` consumes generated palette values and follows `useColorScheme`; `ui/Themed.tsx` and `ui/Controls.tsx` own native text, inputs, actions and radio choices. Existing Stage 3 screens now consume themed text and controls. `organization/Controls.tsx` preserves feature imports as a compatibility export. Development builds expose a native component showcase. Targets are at least 48 units for actions/inputs/choices; text scaling is enabled. Keyboard taps remain usable while scrolling. Native Modal provides business archive confirmation. Physical barcode/printing artwork intentionally remains black/white.

[React Native Reusables](https://reactnativereusables.com/docs/installation/manual) was evaluated; introducing its additional styling setup would duplicate this repository's existing StyleSheet-based primitives. Retaining and improving the native controls avoids a new styling framework solely for parity. Web retains [shadcn CSS-variable conventions](https://ui.shadcn.com/docs/theming) and existing Radix behavior; [named Lucide React imports](https://lucide.dev/guide/react/) supply the small icon set. Storybook is not required for the current lightweight in-app showcase. VoiceOver/TalkBack focus, device safe-area/keyboard differences and native modals still require device qualification.

## Checks and limits

Run `npm test -w @inventory/web` for component/entry tests and `npm run test:web:browser` for the real browser checks. Install the browser once with `npx playwright install chromium`; on this machine the existing Chrome installation was used via `PLAYWRIGHT_CHANNEL=chrome npm run test:web:browser`. The browser runner owns port 5180 and stops its server after tests. It requires no live API because it does not invoke the connection check. Traces/screenshots are generated under ignored `test-results/`.

Representative checks cover visible labels and descriptions, error focus and recovery, default button semantics, confirmation focus containment/restoration and explicit reset, keyboard menus with disabled-item skipping, and keyboard retry. axe runs against both the page and an open confirmation. The jsdom test skips color contrast because it has no layout engine; real-browser axe checks include it. Browser checks also verify responsive overflow, skip navigation, dialog fit, open-menu accessibility/keyboard behavior and reduced motion at 320px and 1440px. Screenshots were visually inspected at both sizes.

Automated checks do not certify full WCAG compliance. Screen-reader behavior on real devices, Windows WebView differences, high-contrast OS themes, translated long strings and broader browser coverage remain manual qualification. User/business preferences use the existing settings service. Full manual WCAG certification is not claimed.

## Historical Command 4 validation record (before Stage 3.5)

- `npm run validate`: formatting, foundation links, lint/boundaries, TypeScript, 12 tooling tests, 27 Vitest tests, API and web builds pass. The web suite includes 9 tests across 3 files.
- `PLAYWRIGHT_CHANNEL=chrome npm run test:web:browser`: 2 real-browser tests pass at 320px and 1440px, with no axe violations on the page, open confirmation or open menu. Checks include real-browser color contrast, focus restoration, skip navigation, overflow and reduced motion.
- `npm run build -w @inventory/desktop -- --debug --bundles app`: macOS debug app packaging passes with the shared web design foundation. This is not Windows or release-signing validation.
- `git diff --check` and `npm ls --depth=0` pass. Generated browser outputs are ignored. Browser test servers stop automatically after validation.

In the historical Command 4 result, native UI was unchanged. Stage 3.5 now implements native theming and shared control improvements. Existing native-device and Windows verification limits remain.

## Workspace navigation

The web/desktop landing page is `features/organization/WorkspacePage.tsx`. Authentication opens `ManagementPanel`, which selects an authorized business through the shared `OrganizationModel`. `ManagementWorkflows` provides permission-filtered section buttons and an overview. Previously visited workflow panels remain mounted while hidden so ordinary section switching preserves drafts; a business/access change or logout clears the relevant workspace. Financial mutations still use existing server authorization and idempotency.

Components load their data on first section entry. Business & access contains the existing location, membership and audit editors. POS uses its existing separate checkout view and locks its exit while a checkout outcome is unresolved. Offline cash remains accessible before login for prepared, encrypted registers. Design examples are excluded from the main route and its initial feature bundle.

The browser-specific navigation is shared by Tauri desktop. Native mobile keeps its existing native controls; automatic business selection is shared. No API, database, permission, credential-storage or offline-lease rules changed.

## Stage 3.5 component contract

See [common component usage](common-components.md) for every custom common component's path, props/types, defaults, examples, accessibility behavior and platform limits. The showcase at `/#/design-system` imports this maintainable documentation and renders real controls, token previews, typography, actions, navigation, pagination, status/loading/error states, forms, menu and confirmation examples. It has no tenant data. A development-only link in the workspace header makes it discoverable; the data-free route remains valid in production.

New common components must include an example, documentation and meaningful accessibility/behavior checks. Keep DOM primitives in `components/ui`, composed controls in `components/common`, shell/navigation in `components/layout`, native equivalents in mobile `ui`, and feature logic in established feature folders (no mass folder migration). Neither contracts/domain/api-client nor the backend may depend on design tokens or UI runtimes.

## Prompt 1 foundation refinement

The workspace reference refinement uses neutral surfaces and a restrained warm brown primary accent in light and dark themes; the existing optional teal preference remains available. Dedicated navigation and table header/row/hover/selected tokens separate their states from generic muted surfaces. Static table selection uses `data-selected="true"`; interactive grids still need their own behavior and semantics. Table examples and navigation examples live in the existing showcase. Chart colors are deferred because reports currently use accessible tables, not charts.

All four shadow utilities currently consumed (`shadow-xs`, `sm`, `lg`, `xl`) use the two semantic elevations; disabling effects removes outline-button, menu and dialog shadows. Typography and family tokens are centralized; the existing settings schema permits only `font: system`, so no downloaded font or new font setting is introduced. Small/medium/large use 0.9/1/1.2 scale factors throughout the text hierarchy; native OS text scaling remains enabled. Native body remains 16 units and heading line height follows heading size instead of clipping into a fixed body line height.

`theme/preferences.css` owns resolved text size, compact spacing, accent, effects, minimum targets and motion overrides. It contains no settings persistence. Reduced and disabled motion suppress animations/transitions (including pseudo-elements); OS reduction always wins. Minimum 44px coarse-pointer web and 48-unit native targets are independent of compact spacing. Fine-pointer defaults use 40px (36px compact), with 32px small variants. Coarse-pointer form text remains at least 16px to avoid iOS focus zoom. Compact/small buttons wrap long labels and grow vertically. This is a documented local deviation from the original shadcn single-line button styles.

Page/Panel spacing is slightly tighter without removing containers, controls or workflows. Only shared presentation and showcase/test/docs files change; API contracts, permissions, schemas and transaction behavior are untouched. See [Prompt 1 audit](ui-foundation-audit.md) for the current validation and device limitations.

Prompt 2 control states and current validation are documented in [core component standardization](core-components.md).

Prompt 3 adds shared table metrics and overflow, controlled native disclosure headers, exact native report rows, bounded compact confirmations and keyboard-visible rail labels. Date calendars remain platform-owned; no chart, drawer, tab framework or new dependency was introduced. See [complex component audit](complex-components.md) and [usage documentation](common-components.md).

## Reference screens (current)

The newer reference replaces the earlier warm accent with accessible blue and cool neutral surfaces. Both themes and the optional teal accent remain token-driven. Sign-in is a centered compact card. Full appearance/performance preferences live in Settings; the later routed-shell request adds a quick theme control to the web/desktop header and profile menu, with the native equivalent on Profile. Dashboard, POS/cart and inventory share passive metrics and consistent surfaces. Responsive navigation collapses at narrow widths; visited workspace drafts remain mounted. See [reference screen redesign](reference-screens.md). Historical Prompt 1 palette notes above describe the earlier iteration.

Prompt 6 retains these tokens and existing account settings. Workspace composition now follows density, the typography preview follows text scale, native focus rings follow the accent, and shared feedback honors simple/enhanced states. See [appearance/performance audit](appearance-preferences.md) for the full preference matrix, persistence checks and platform limitations.

Prompt 7 applies the existing system to narrow/resized windows, enlarged-text menus/dialogs, native safe areas and keyboard scrolling. See [responsive/accessibility verification](responsive-accessibility.md) for shared ownership, actual device evidence and remaining qualification.

## Routed shell ownership

`apps/web/src/shell` owns the shared browser/Tauri layout; `apps/mobile/src/shell` owns native tabs, More, headers and local stack behavior. Neither platform imports the other platform’s components. `packages/api-client/src/workspace-navigation.ts` provides portable route metadata and permission visibility, while the backend remains authoritative. Full preference editing stays in Settings. See [route inventory](../routes.md) and [QA evidence](../qa/report.md).
