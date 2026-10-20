# Web design foundation

Command 4 adds a small design reference screen to the existing foundation route. It contains local examples only; it does not save preferences or implement POS, inventory or other business workflows. The existing API connection check remains separate from the simulated feedback examples.

## Ownership and reuse

| Location                  | Responsibility                                                                                      |
| ------------------------- | --------------------------------------------------------------------------------------------------- |
| `apps/web/src/styles.css` | Semantic color, typography, spacing, radius, border and focus tokens; global accessibility defaults |
| `components/ui`           | App-neutral Button, native form controls, Radix dialog/menu wrappers and semantic table styling     |
| `components/common`       | Layout, field/error presentation, loading/empty/error/retry states and confirmation composition     |
| `features/foundation`     | The small demo, its local validation/state, and the existing API connection check                   |
| `app`                     | Routing, route-loading fallback and page failure recovery                                           |

Keep feature state and API calls out of UI primitives. Do not move DOM components into contracts or api-client. Both browser web and Tauri desktop consume this same UI. The existing shadcn Button and scoped Radix Slot are retained. New dialog/menu wrappers follow shadcn composition conventions using the same scoped Radix stack; they are local implementations, not claimed verbatim registry copies. Native input, select and checkbox elements provide their built-in semantics and platform keyboard behavior. No form framework, data grid, UI package, or unused future control was introduced.

Sources: [shadcn dialog composition](https://ui.shadcn.com/docs/components/dialog), [Radix Dialog](https://www.radix-ui.com/primitives/docs/components/dialog), and [Radix Dropdown Menu](https://www.radix-ui.com/primitives/docs/components/dropdown-menu).

## Tokens and layout

The current theme is explicitly light. Dark-mode qualification is not implemented. Semantic token names allow future themes without feature-level color literals.

| Concern       | Convention                                                                                                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Surfaces/text | `background`, `card`, `foreground`, `muted`, `muted-foreground`; use supporting text without lowering opacity                                                                              |
| Actions       | `primary`/`primary-foreground` and `secondary`/`secondary-foreground`; accents are for hover/selection                                                                                     |
| Feedback      | `destructive`, `success`, `warning`; always include explanatory text, never color alone                                                                                                    |
| Borders       | Subtle `border` for grouping, stronger `input` for control boundaries                                                                                                                      |
| Focus         | 3px solid `ring` with a 3px offset; never remove the only visible focus indicator                                                                                                          |
| Font          | System sans, base 16px with 1.625 line height; monospace reserved for technical values                                                                                                     |
| Hierarchy     | h1 30px/36px responsive; h2 20px; h3/body 16px; labels/supporting copy 14px. Use rem-based Tailwind tokens and semantic heading order.                                                     |
| Spacing       | 4px unit; use 8, 12, 16, 20, 24, 32 and 48px rhythm through Tailwind spacing utilities                                                                                                     |
| Radius        | Small 6px, medium 8px, large 12px, extra-large 16px                                                                                                                                        |
| Targets       | Default buttons/inputs/selects/menu rows at least 44px high; checkbox sits inside a clickable 44px label. Compact inherited Button variants require a deliberate dense-interface decision. |

`Page` owns the centered width, responsive padding, main landmark and skip link. Its skip link focuses the main element without overwriting the application's hash route. Use one Page per route. `Stack`, `Cluster`, `Grid` and `Panel` own vertical flow, wrapping actions, responsive columns and grouped surfaces respectively. Grid becomes two columns at the large breakpoint; panels and fields permit shrinking. Avoid fixed widths and page-level horizontal scrolling. Long data tables may need a separately named scroll region when a real data use case arrives; the reference table fits a narrow screen without one.

Respect reduced motion; global transition/animation overrides apply when requested. System fonts avoid an external font dependency. The primitive Button defaults to `type="button"`; form submissions must explicitly use `type="submit"`. Changes from the original shadcn Button are documented here: 44px default targets, 48px large targets, shared opaque focus outline, and safe default button type.

## Forms and feedback

Use FormField's render function to spread its id, required, aria-invalid and aria-describedby properties onto the actual control. Every field has a visible label; required status is both textual and native. Hints persist independently from errors. ErrorSummary announces failed submission, receives focus, and provides buttons that focus the offending fields without modifying hash navigation. Inline errors are linked descriptions rather than duplicate alert announcements. Validate on submit, preserve entered values, and remove stale errors as the example field changes. Future server errors must use safe messages and the same presentation, not expose internal details.

The demo intentionally uses native form elements with local state. Its Update preview action is a synchronous example, not a persistence operation. The confirmation wrapper is also for synchronous actions: the demo reset executes only after explicit confirmation. Async destructive workflows need a separately designed pending/error flow rather than passing an unhandled promise to this wrapper.

LoadingState uses a polite status announcement; ErrorState announces a failure and exposes a real retry button; EmptyState explains absence of content. RouteLoading and RouteError reuse those conventions. Confirmation dialogs have accessible titles/descriptions, initial Cancel focus, modal focus containment, Escape cancellation and trigger focus restoration. Outside pointer clicks do not confirm or dismiss the confirmation. Generic Dialog consumers must provide a title, description and explicit close action. Menus retain Radix arrow-key/Enter/Escape behavior and disabled-item skipping. Action menus are non-modal and render in place within the page landmark; do not put a clipping overflow container around them. This avoids hiding unrelated focusable controls or moving menu content outside landmarks. Highlighted menu items have an inset focus ring. Tables use a caption and explicit column/row header scopes.

## Native equivalents

Desktop renders the same web components in Tauri; its Rust host remains isolated. Browser checks validate DOM behavior, while WebView/OS assistive technology and release qualification still need native checks.

Mobile remains React Native and imports no web components. Its current `src/theme.ts` already uses the equivalent primary `#16594d`, white on-primary, error `#a62424`, 8/16/24 spacing and 8px radius. Use semantic native theme keys, system fonts and dynamic text scaling rather than importing CSS tokens or shadcn components. Prefer 48-unit Pressable targets, accessible labels/roles/states, TextInput with linked labels and hints, platform pickers, and native modal/Alert conventions. Errors need visible text and platform announcements; modal focus, screen-reader traversal and dismissal require VoiceOver/TalkBack device testing. These are equivalent conventions, not a claim that new native controls or device tests were implemented.

## Checks and limits

Run `npm test -w @inventory/web` for component/entry tests and `npm run test:web:browser` for the real browser checks. Install the browser once with `npx playwright install chromium`; on this machine the existing Chrome installation was used via `PLAYWRIGHT_CHANNEL=chrome npm run test:web:browser`. The browser runner owns port 5180 and stops its server after tests. It requires no live API because it does not invoke the connection check. Traces/screenshots are generated under ignored `test-results/`.

Representative checks cover visible labels and descriptions, error focus and recovery, default button semantics, confirmation focus containment/restoration and explicit reset, keyboard menus with disabled-item skipping, and keyboard retry. axe runs against both the page and an open confirmation. The jsdom test skips color contrast because it has no layout engine; real-browser axe checks include it. Browser checks also verify responsive overflow, skip navigation, dialog fit, open-menu accessibility/keyboard behavior and reduced motion at 320px and 1440px. Screenshots were visually inspected at both sizes.

Automated checks do not certify full WCAG compliance. Screen-reader behavior on real devices, Windows WebView differences, high-contrast OS themes, translated long strings and broader browser coverage remain manual qualification. No dark theme, persistent settings or business functionality is claimed.

## Command 4 validation record

- `npm run validate`: formatting, foundation links, lint/boundaries, TypeScript, 12 tooling tests, 27 Vitest tests, API and web builds pass. The web suite includes 9 tests across 3 files.
- `PLAYWRIGHT_CHANNEL=chrome npm run test:web:browser`: 2 real-browser tests pass at 320px and 1440px, with no axe violations on the page, open confirmation or open menu. Checks include real-browser color contrast, focus restoration, skip navigation, overflow and reduced motion.
- `npm run build -w @inventory/desktop -- --debug --bundles app`: macOS debug app packaging passes with the shared web design foundation. This is not Windows or release-signing validation.
- `git diff --check` and `npm ls --depth=0` pass. Generated browser outputs are ignored. Browser test servers stop automatically after validation.

Native mobile UI is unchanged; the equivalent conventions above document its separate framework. Existing native-device and Windows verification limits remain.
