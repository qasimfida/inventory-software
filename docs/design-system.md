# Design system

## Start here

Reuse the actual components at `/#/design-system` before writing UI. Web and Tauri use the existing shadcn-style/Radix primitives and Vaul drawers with small token-based adjustments; do not install another component library. Native uses React Native equivalents, never DOM wrappers. A feature owns its state/permissions; primitives own presentation and accessibility.

| Responsibility                | Web (relative to `apps/web/src`)                | Native (relative to `apps/mobile/src`)                    |
| ----------------------------- | ----------------------------------------------- | --------------------------------------------------------- |
| Primitive controls            | `components/ui/`                                | `ui/Controls.tsx`, `ui/Themed.tsx`, `ui/SelectChoice.tsx` |
| Reusable application patterns | `components/common/`                            | `ui/`                                                     |
| Shell/navigation              | `components/layout/` and app routing            | `shell/` and navigation registries                        |
| Business UI                   | `features/<feature>/`                           | `<feature>/`                                              |
| Appearance adapter            | `theme/Appearance.tsx`, `theme/preferences.css` | `theme.tsx`                                               |

## Tokens and user preferences

`packages/design-tokens/tokens.css` is the palette/metric source. Run `npm run build:shared` to generate native exports. Use semantic surface/text/primary/border/focus/status/navigation/table/chart tokens; use spacing, typography, radius and elevation tokens instead of feature-local values. Physical print/barcode black and white are deliberate exceptions. Layout breakpoints, aspect ratios and actual media dimensions may be explicit; do not replace them blindly.

`packages/contracts/src/settings.ts` owns schema/defaults and `resolveSettings`: defaults → platform defaults → business defaults → user values → business enforced → platform enforced → device accessibility/performance constraints. Preserve this precedence, account isolation, persistence and existing policy locks. No extra localStorage/theme system, reset, or per-page preference copy.

| Preference     | Required behavior                                                                                                                                  |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Appearance     | Light, dark, system; system reacts to OS changes, including portals                                                                                |
| Accent         | Existing blue/teal/violet/rose/amber palette; primary/focus/navigation/selection/chart tokens follow it, semantic errors/warnings stay distinct    |
| Font           | Default Karla; existing Lora/system/serif/monospace/local choices; native unsupported local font falls back safely, preserve tabular numbers/icons |
| Text size      | Small/medium/large scale headings, controls, menus, tables and help; native OS scaling remains enabled                                             |
| Radius         | Rounded: restrained corners; circle: pill controls/avatars and larger card corners; multiline fields stay readable                                 |
| Density        | Existing compact/comfortable spacing and row/control sizing; never sacrifice native/coarse-pointer targets                                         |
| Icon size      | Existing small/medium/large metrics; named icons, consistent stroke and accessible icon-only labels                                                |
| Motion         | Disabled/reduced beats every component animation/transition, including portals; OS reduced motion also wins                                        |
| Effects        | Optional decorative elevations; disabling never removes focus, selection or functional feedback                                                    |
| Visualizations | Simple keeps lightweight summaries/tables/SVG; enhanced loads available visualization modules lazily, never invents data                           |
| States         | Simple/enhanced presentation, same data/error semantics; enhanced empty states have icon/title/description and only permitted relevant actions     |
| Pagination     | Existing pages/scroll behavior; no paginator for one page, keep bounded data loading and stable selection                                          |
| Currency       | Existing supported codes/symbol formatter; no conversion or reinterpretation of posted monetary values                                             |

Settings controls belong in Preferences, not repeated on every feature page. Keep user choice effective throughout mounted screens and overlays without resetting drafts. Explain enforced choices rather than offering an ineffective toggle.

## Screen contract

- One authoritative heading/description and consistent action placement; preserve existing route shell and history-aware back action. Auth has its own layout; no business controls stacked under login.
- One wrapping collection toolbar: search with leading icon/clear, filter badge/summary, view tabs where supported, relevant refresh and permission-gated creation/export. Debounce/cancel reads; never retry unsafe commands generically.
- Existing Table/TableScroll: aligned headers/cells, fixed narrow selection column, select-all in header, right-aligned actions, tabular numeric values, token zebra rows. Wide tables scroll inside a named region, not the whole page.
- Use StatusBadge with explicit semantic tone, never an unstyled `status-badge` span. Status is text plus color. Links underline on hover; icon actions use real tooltips and keyboard names.
- Cards reflow with content-driven columns; preserve names, units and prices. Show selection only with authorized bulk actions. Selected counts appear only when relevant.
- Keep cart below the sticky header with internal scrolling and visible checkout; present authoritative totals and unknown/failed states honestly.
- Drawers use existing FormSheet/SidePanel and focus/keyboard/safe-area handling. Keep small confirmations in ConfirmDialog. Do not replace platform-accessible selection/menu behavior with hand-built clickable divs.
- Empty search explains no matches; empty collections offer permitted creation; failures offer a real retry; offline/sync UI distinguishes local persistence from remote confirmation.
- Support 320px through desktop widths, large text, keyboard, visible focus, meaningful labels/errors, screen readers, reduced motion and touch. No feature removal to fit a smaller viewport.

## Web component API reference

Use TypeScript declarations in the linked implementation as the exact required/optional/default prop contract; examples below exercise real components. Shared additions require inline prop documentation, a local-state showcase example, meaningful interaction tests and an update here. Avoid a second prose copy of every prop signature that will become stale.

| Component source                                                         | Use / limitation                                                                                                                  |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `components/common/Layout.tsx`                                           | Page main landmark/skip link; Stack/Cluster/Grid/Panel layout. One main per route, avoid unnecessary card nesting.                |
| `components/common/FormField.tsx`                                        | Label, hint and error associations; spread supplied control props onto actual input. ErrorSummary focuses invalid controls.       |
| `components/ui/FormControls.tsx`                                         | Shared Input/Textarea/Select; use native validation and existing schemas. Search only for sufficiently large/dynamic option sets. |
| `components/common/IconButton.tsx`                                       | Named icon + label/tooltip; never encode permission or command behavior in the primitive.                                         |
| `components/ui/StatusBadge.tsx`                                          | `children`; optional `tone`: neutral (default), success, warning, error, info. Not an action.                                     |
| `components/common/SearchControl.tsx`                                    | Controlled text/suggestions, clear and keyboard listbox; owner supplies bounded, cancellable reads.                               |
| `components/common/FilterButton.tsx`, `ViewTabs.tsx`, `OverflowTabs.tsx` | Active filter summary, list/grid and overflow chevrons. OverflowTabs child uses the established settings-tabs style.              |
| `components/ui/Table.tsx`                                                | Semantic table and named keyboard-scroll region; caller owns sort/filter/page/selection.                                          |
| `components/common/FormSheet.tsx`, `ConfirmDialog.tsx`                   | Controlled drawer or confirmation with title/description/focus. Preserve pending/dismissal rules; model owns async work.          |
| `components/common/AsyncState.tsx`                                       | Loading/empty/error; preserve announcements and safe retry identity.                                                              |
| `components/common/MetricCard.tsx`                                       | Label/value/unit, optional primary treatment; no fabricated trend or calculation.                                                 |
| `components/ui/Accordion.tsx`, `Popover.tsx`, `Tooltip.tsx`              | Existing keyboard/portal primitives; no hover-only critical information or clipped actions.                                       |

```tsx
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Panel } from '@/components/common/Layout';
<Panel>
  <h2>Availability</h2>
  <StatusBadge tone="warning">Low stock</StatusBadge>
</Panel>;
```

## Native component API reference

Native `ui/Themed.tsx` Text/TextInput resolve font, size, colors and state; `ui/Controls.tsx` provides Action/Field/Choice. `ui/IconAction.tsx` takes an accessible label and native icon name. Use `ui/StatusBadge.tsx`, `MetricCard.tsx`, `Surface.tsx`, `SearchControl.tsx`, `FilterButton.tsx` and `ViewTabs.tsx` for equivalent patterns. `ui/SidePanel.tsx` owns modal safe areas, scrolling and optional footer. Native controls support system text scaling; keep minimum touch targets even in compact mode. Local desktop font availability does not imply that font exists on a phone.

```tsx
import { Surface } from './ui/Surface';
import { Text } from './ui/Themed';
<Surface>
  <Text>Current warehouse stock</Text>
</Surface>;
```

Browser/React Native Web tests do not qualify VoiceOver/TalkBack, native modals, keyboard avoidance or installed WebViews. Use the release checklist in [development](development.md#release-qualification).
