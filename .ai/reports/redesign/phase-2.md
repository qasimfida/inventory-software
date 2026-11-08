# Phase 2 — token and preference checkpoint

Status: **draft for approval; implementation has not started**. Branch: `redesign/phase-2`. No application, schema, generated token, font asset, dependency or persistence changes. Invoking Phase 2 authorizes this draft, not implicit approval of unresolved Phase 1 migrations. This is the checkpoint required by `.ai/prompts/redesign/phase-2.md`.

## Inspected and ownership audit

| Owner / evidence                                                                         | Current behavior and conflict                                                                                                                                            | Proposed correction after approval                                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/design-tokens/tokens.css`, `build.mjs`                                         | CSS owns literal palettes; generator merges two flat blocks into native JS/types. Primary is blue; surfaces are blue-tinted.                                             | Keep this one source. Add neutral ramp and semantic mappings; teach generator to resolve aliases with cycle/missing-reference checks before introducing CSS variable aliases. Native must receive resolved colors/numbers, not `var()` strings. |
| `apps/web/src/styles.css`                                                                | Tailwind 4 CSS-first aliases consume tokens; multiple imported refinement sheets can override them.                                                                      | Retain CSS-first bridge; only canonical tokens own literals and preference adapters own effective overrides. No Tailwind configuration package.                                                                                                 |
| `apps/web/src/theme/preferences.css`                                                     | Compact density changes space unit and control height; accent overrides primary; surface radius overrides canonical 20px with 8px; duplicate palette-option rule blocks. | Separate layout density from controls; neutral primary independent of accent; explicit control/surface radius roles. Consolidate only audited duplicate definitions.                                                                            |
| `apps/mobile/src/theme.tsx`                                                              | Hand-built RGB tint function colors primary, sidebar, selected and table-hover; density scales all spacing by .75.                                                       | Consume generated neutral semantics and shared dimension variants. Remove parallel palette derivation only after consumers migrate.                                                                                                             |
| `apps/mobile/src/ui/metrics.ts`                                                          | Static light metrics, 48px native target; many metrics cannot respond to density/control size.                                                                           | Keep theme-independent base metrics; resolve context variants through existing native theme, preserving 48px native touch minimum.                                                                                                              |
| `apps/web/src/components/ui/button.tsx`                                                  | Link uses primary, ghost/outline hover uses accent, icon sizes include literal size-3/4 utilities.                                                                       | Link uses link token; hover uses neutral interactive surface. Keep behavior/variants, derive visual sizes from existing icon preference and independent control size.                                                                           |
| `theme/inventory-refinement.css`, `operational-ui.css` (web)                             | Repeated status color mixes; primary used for text as well as fills.                                                                                                     | Promote repeated status surfaces into source tokens; classify each primary consumer as action/link/chart before replacement.                                                                                                                    |
| `packages/contracts/src/settings.ts`                                                     | Strict schema, shared resolver, two density values, legacy motion/visualizations; business enforced wins over personal choice.                                           | Extend existing schema only; preserve raw partial values, optimistic concurrency and field provenance. Account-consistent appearance needs an explicitly approved policy migration.                                                             |
| `packages/api-client/src/settings/model.ts`, `apps/api/src/settings/settings.service.ts` | Account JSON/version writes; workspace connect reloads policy; broad snapshot notifications; errors can clear snapshot.                                                  | Keep account record/version and single-attempt writes. Separate effective appearance selector from loading/error emissions; retain last confirmed appearance for same account. Never retain another account's preferences.                      |
| `apps/web/src/theme/Appearance.tsx`, `apps/mobile/src/theme.tsx`                         | System guest default; web applies attributes in effect; providers subscribe to whole state.                                                                              | Light only for unset values; stable effective-value subscription; apply already-known settings before visible paint. Do not promise remote account settings before they are loaded.                                                             |
| `apps/mobile/src/App.tsx`, `packages/design-tokens/fonts/`                               | Karla/Lora bundled; native useFonts invoked without waiting; system/local choices offered.                                                                               | Bundle pinned Geist Sans/Mono with license; use bounded font loading and fallback. Preserve legacy choices, offer bundled fonts for new selections. No font downloaded in this phase.                                                           |

This is an ownership/consumer audit, not a claim that every hardcoded value across 409 component modules has been removed. Existing route/component evidence remains in `routes.md` and `components.md`.

## Final proposed semantic token table

These are proposed implementation values, not live CSS. Neutral ramp: 0 `#ffffff`, 50 `#fafafa`, 100 `#f5f5f5`, 200 `#e5e5e5`, 300 `#d4d4d4`, 400 `#a3a3a3`, 500 `#737373`, 600 `#525252`, 700 `#404040`, 800 `#262626`, 900 `#171717`, 950 `#0a0a0a`. Keep existing names as compatibility aliases where possible.

| Semantic token                                  | Light                     | Dark                      |
| ----------------------------------------------- | ------------------------- | ------------------------- |
| background                                      | neutral-50                | neutral-950               |
| foreground                                      | neutral-900               | neutral-50                |
| surface / existing card                         | neutral-0                 | neutral-900               |
| elevated                                        | neutral-0                 | neutral-800               |
| muted / muted-foreground                        | neutral-100 / neutral-600 | neutral-800 / neutral-300 |
| primary / primary-foreground                    | neutral-900 / neutral-0   | neutral-50 / neutral-950  |
| secondary / secondary-foreground                | neutral-100 / neutral-900 | neutral-800 / neutral-50  |
| accent / link / ring                            | `#1d4ed8`                 | `#93c5fd`                 |
| accent-foreground (if needed)                   | `#ffffff`                 | `#0a0a0a`                 |
| border (decorative separators)                  | neutral-200               | neutral-700               |
| input (control boundary)                        | neutral-500               | neutral-400               |
| destructive / destructive-foreground            | `#b91c1c` / `#ffffff`     | `#fca5a5` / `#450a0a`     |
| error-surface                                   | `#fef2f2`                 | `#450a0a`                 |
| success / success-surface                       | `#166534` / `#f0fdf4`     | `#86efac` / `#052e16`     |
| warning / warning-surface                       | `#854d0e` / `#fefce8`     | `#fde047` / `#422006`     |
| info / info-surface                             | `#1e40af` / `#eff6ff`     | `#93c5fd` / `#172554`     |
| disabled / disabled-foreground                  | neutral-100 / neutral-600 | neutral-800 / neutral-300 |
| overlay                                         | `#00000066`               | `#000000b3`               |
| sidebar / sidebar-foreground                    | neutral-0 / neutral-900   | neutral-900 / neutral-50  |
| navigation-hover / table-hover                  | neutral-100               | neutral-800               |
| selected / navigation-selected / table-selected | neutral-200               | neutral-700               |
| selected foreground (all aliases)               | neutral-900               | neutral-50                |
| table-header / table-row                        | neutral-100 / neutral-0   | neutral-800 / neutral-900 |
| table-stripe (first/odd row)                    | neutral-50                | neutral-950               |

Accent choices retain default/teal/violet/rose/amber identities. Proposed light/dark pairs: default `#1d4ed8/#93c5fd`, teal `#0f766e/#5eead4`, violet `#6d28d9/#c4b5fd`, rose `#be185d/#fda4af`, amber `#92400e/#fcd34d`. Accent does not recolor sidebar, primary actions or selected surfaces. Primitive hover consumers currently using `accent` must move to neutral hover before changing its meaning.

Chart palette proposal: blue `#0072b2`, orange `#e69f00`, green `#009e73`, purple `#cc79a7`, vermilion `#d55e00`, cyan `#56b4e9`. Dark presentation may use lighter equivalents after contrast testing. This is a color-vision-friendly starting palette, not proof of accessible charts: use explicit labels, line/dash/marker distinctions, sufficient line contrast and a numeric/table alternative. Small chart text always uses foreground, not series color. User accent may highlight a single series without replacing categorical identities.

Status requires text/icon, not color alone. Contrast gates before implementation acceptance: 4.5:1 normal text, 3:1 large text, control boundaries/focus and meaningful chart marks. Decorative borders need not meet control-boundary contrast. Validate every accent/theme combination on actual surfaces.

## Typography and numeric semantics

| Role                             | Base px / line-height | Weight          |
| -------------------------------- | --------------------- | --------------- |
| display (rare, not ordinary KPI) | 28 / 1.2              | 600             |
| page title                       | 22 / 1.3              | 600             |
| section                          | 18 / 1.35             | 600             |
| card heading                     | 15 / 1.4              | 600             |
| body / input                     | 14 / 1.5              | 400             |
| secondary / label / table        | 13 / 1.5              | 400 / 500 / 400 |
| caption                          | 12 / 1.5              | 400             |
| numeric / mono                   | inherit context size  | inherit         |

Keep existing small/medium/large text scales (.9/1/1.2); apply once, not both root rem and token multiplication. Native body remains 15px, with OS text scaling enabled. Inputs on iOS/coarse web retain >=16px text to avoid zoom. Controls expand for large text rather than clipping to fixed heights.

Use tabular figures for quantities, money, percentages and dates; Geist Mono for technical references only, never force every amount into mono. Retain existing currency minor-unit handling, currency formatter, rounding and negative signs; don't recompute money for display. Keep existing business-timezone reporting/notification semantics and device-local security-log semantics; detail views include zone. No new timezone or precision preference. Long names may ellipsize only where the full accessible name and details/tooltip remain available; amounts and critical statuses must not silently truncate.

## Context dimensions and effects

All px values are design bases, with min-height/content growth where text scales. Density never scales text, icons or touch hit areas.

| Context token           | Compact / default / comfortable |
| ----------------------- | ------------------------------- |
| page padding (desktop)  | 16 / 20 / 24                    |
| section gap             | 16 / 20 / 24                    |
| card/panel padding      | 12 / 16 / 20                    |
| form gap                | 8 / 12 / 16                     |
| table row minimum       | 32 / 40 / 48                    |
| table header minimum    | 32 / 36 / 40                    |
| horizontal cell padding | 10 / 12 / 14                    |
| toolbar minimum         | 40 / 44 / 48                    |
| shell header minimum    | 56 / 60 / 64                    |

Narrow page padding is 12/16/20. A toolbar/header grows to contain its selected controls. Sidebar initial width 248px, rail 64px; preserve existing resize state/bounds. Drawer 432px, preferences 800px; dialogs compact448/standard512px; clamp to available viewport and preserve safe areas/current resizing. No forced fixed-height forms.

| Independent control-size token                | Small / medium / large |
| --------------------------------------------- | ---------------------- |
| button/input/select/search/tab/trigger height | 30 / 34 / 40           |
| horizontal control padding                    | 8 / 12 / 16            |
| icon button visual box                        | 30 / 34 / 40           |
| checkbox/radio visual mark                    | 16 / 18 / 20           |
| quantity control visual box                   | 28 / 32 / 36           |

Icon preference remains 16/20/24px, independent of control size; grow a box when the chosen icon plus padding exceeds it. Native hit targets remain >=48px; coarse web >=44px, including checkbox/quantity actions. A 32px table row containing an interactive control must grow to fit its touch target; never overlap adjacent hit regions.

Rounded: control6, card8, dialog/drawer12px. Circle: pill controls/avatar, card16, dialog/drawer20px; multiline input8px to keep editing usable. Border1px; focus2px with offset2px. Low elevation `0 1px 2px #0000000d`; modal elevation `0 12px 32px #00000026` light / `#00000066` dark. Existing effects=false disables decorative shadows, never modal backdrop/focus. Preserve custom resize widths and all existing radius selections.

## Five preference axes and compatibility

| Axis / proposed stored field | Values                        | Unset default                                          | Legacy treatment                                                                                                                                                               |
| ---------------------------- | ----------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Theme / appearance           | light, dark, system           | light                                                  | Every explicit saved value unchanged, including system.                                                                                                                        |
| Density / density            | compact, default, comfortable | desktop/web compact; native/coarse-pointer web default | Existing explicit compact/comfortable retained; their future layout metrics use the new independent control-size system.                                                       |
| Control size / controlSize   | small, medium, large          | medium                                                 | New optional key; textSize/iconSize retain meaning.                                                                                                                            |
| Animation / animation        | off, minimal, full            | minimal                                                | Retain motion raw field. Without new explicit choice, disabled/reduced suppress nonessential motion, enabled allows legacy behavior. Never silently rename reduced to minimal. |
| Charts / charts              | numbers, balanced, charts     | balanced                                               | Retain visualizations raw field. Without new choice, simple/enhanced keep existing rendering behavior.                                                                         |

Proposed coexistence: explicit new animation/charts wins over that user's legacy motion/visualizations only after the user selects it; untouched accounts retain legacy behavior. OS reduced-motion always wins, including full; low-power retains existing effects/simple-visualization constraints. Enforced legacy off/reduced policy cannot be bypassed by a new key while current policy precedence remains active. Hidden compatibility fields are not additional user-facing axes.

Animation: off = no nonessential animation/transitions/smooth scroll; minimal = <=120ms opacity/shadow feedback without movement; full = <=180ms purposeful opening/closing motion, no bounce/scaling decoration. CSS transitions only on web; native uses existing compatible feedback, no new animation library. Essential loading/pending feedback remains text/icons when motion stops.

Charts: numbers prioritizes summaries/tables with an explicit chart reveal where available; balanced pairs modest charts with values; charts emphasizes the same existing charts. Never remove access to records, values or exports, load unavailable chart types, alter metrics, or override simple legacy rendering without a new user choice.

Other fields (accent, radius, font, textSize, iconSize, pagination, effects, states, currency) retain identity and storage. No new border/typography preference; per-device sidebar state stays separate.

## Persistence, policy and first paint

Keep `user_preferences` JSON and optimistic-concurrency version. Do not confuse record version with migration version. Raw partial records distinguish absence from an explicit old default; never materialize new defaults into saved JSON on read. Add schema keys server-first, then clients; old strict clients and whole-record saves require a compatibility rollout test so unknown new keys cannot be erased. No automatic cross-version writes or blind retries. A minimum compatible client/version gate may be necessary before enabling new keys; decide from deployment capability, not a new settings store.

The request that business switching never changes appearance conflicts with the current resolver's business defaults/enforced policies. **Proposed migration needing approval:** resolve cosmetic fields from platform defaults → account choice → device accessibility constraints, excluding business cosmetic layers and retiring platform cosmetic enforcement after explicit migration/disclosure. Preserve original policy records for audit; do not delete them. Security/operational policy is unchanged. Existing explicit account fields survive; unset fields receive the locked per-platform defaults. Until approval, keep current precedence and document that workspace invariance is not achieved.

Hybrid desktop-touch recommendation: use coarse primary pointer only for the unset density fallback; saved user choice wins. Treat native as touch regardless of hardware keyboard. Do not persist media-query-derived values.

Before first paint: static light fallback, then synchronously apply already-known resolved settings in the existing provider before visible update. Remote account settings cannot be known before login/load without persistence. Do not introduce a second localStorage store: if a reusable approved cosmetic bootstrap cache does not exist, acknowledge a possible remote-load theme transition; don't block the app or claim zero flicker. Portals inherit root settings; native fonts use existing expo-font with bounded fallback. Subscribe by effective preference values so busy/errors/business reloads do not reset visual state or drafts.

Font proposal: pinned bundled Geist Sans and Mono (license evidence in Phase 1 preferences report), retain Karla/Lora; new font options only bundled assets. Preserve existing system/serif/monospace/local selections as compatibility entries with their existing native fallbacks. The literal requirement that _every_ selectable font is bundled conflicts with preserving local-font choices; recommend grandfathering only existing choices, without offering new unbundled selections. Approval and asset pin/license checks precede installation.

## Planned combination matrix — not yet tested

Implementation will add a concise rule in `docs/design-system.md` referencing this evidence; do not label a proposed matrix as verified. Corners/defaults, not a claim of the full Cartesian product:

- Both themes with default density/control size/animation/charts on desktop and native; system follows OS changes.
- Compact+small+small text+rounded and comfortable+large+large text+circle, both themes, 390/1024/1440 widths; also small controls+large text/icons for clipping.
- All five accent identities against neutral actions/sidebar/selection and semantic statuses, both themes.
- Off/minimal/full with reduced motion on/off; low-power constraints and effects false/true.
- Numbers/balanced/charts plus legacy simple/enhanced; identical metrics, records and exports.
- All bundled fonts plus persisted legacy local/system choices; native unavailable-font fallback.
- Account switch/logout, business switch, absent/partial/invalid records, old clients, concurrent version conflicts, failed save/reload and offline startup.
- Showcase actual controls, menus, portals, dialogs, table, quantity controls, keyboard/focus, text zoom, coarse pointer and native safe areas/keyboard.

## Changed, preserved, checks and platform status

Created this report only. No components/routes modified or removed; no API/permission/data/stock/money/offline behavior changed. No canonical rule was promoted to an implemented guarantee. No new dependencies. Existing unrelated work remains on the new phase branch.

Validation: `npm run check:redesign` passed (56 route rows and all four canonical guides); `npx prettier --check .ai/reports/redesign/phase-2.md` passed; scoped `git diff --check` exited 0 (this report is untracked, so Prettier is the content-format check). Application tests/builds/screenshots are not repeated for a draft-only change. Phase 1 results remain historical evidence, not new Phase 2 passes. Web/Windows/macOS/native implementation and runtime acceptance remain pending; Windows and native tooling limitations from Phase 1 remain unqualified. No completion tag created: Phase 2 is at its required checkpoint, not implemented or qualified.

## Decision required before implementation

Approve or revise this token/dimension table and five-axis mapping. In particular approve (1) account-only cosmetic resolution and explicit policy migration, (2) the legacy animation/chart coexistence rule, (3) bundled Geist with grandfathered font choices, and (4) coarse-pointer fallback for hybrid devices. Starting Phase 2 does not silently approve these conflicts. The phase prompt says: “stop after tokens and preference semantics are drafted and show me the final token table, default values and preference mapping before building on them.” No Phase 3/page redesign begins here.
