# Phase 1 preference mapping and conflicts

## Current persistence and precedence

Sources: `packages/contracts/src/settings.ts`; `packages/api-client/src/settings/{model,client}.ts`; `apps/api/src/settings/settings.service.ts`; migration `1794300000000_settings_security.sql`; web `theme/Appearance.tsx`, `theme/preferences.css`; native `theme.tsx`, `ui/metrics.ts`, `settings/PreferenceFields.tsx`.

Account preferences already persist in `user_preferences(account_id, data, version, updated_at)`. Business/platform policies are separate. No new table, state library or localStorage store is needed. Writes check the record version; generic mutations remain single-attempt. `SettingsModel.save` merges explicit patches into previously saved fields, then reloads. Failed/conflicting writes do not confirm success.

Current precedence, lowest to highest: built-in defaults → platform defaults → business defaults → explicit user values → business enforced → platform enforced → device constraints. Device reduced-motion overrides enabled motion; low-power disables effects and forces simple visualization. Policy defaults do not beat explicit user choices; enforced values do.

## Five target axes

| Axis         | Existing field / values                                 | Target / unset default                                                 | Safe implementation proposal; unresolved behavior                                                                                                                                                                                                |
| ------------ | ------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Theme        | `appearance`: light/dark/system; system default         | light/dark/system; light                                               | Keep existing field and explicit choices. Change only fallback for genuinely absent values. Do not rewrite saved system to light.                                                                                                                |
| Density      | `density`: compact/comfortable; comfortable default     | compact/default/comfortable; compact desktop/web, default native/touch | Extend enum only after schema/version review. Preserve explicit compact/comfortable. Decide hybrid desktop-touch precedence and token values for new default.                                                                                    |
| Control size | No independent field; density/text size affect controls | small/medium/large; medium                                             | New optional preference with fallback and shared metric derivation; do not reinterpret textSize or iconSize. Maintain >=44px mobile hit targets and OS scaling.                                                                                  |
| Animation    | `motion`: enabled/reduced/disabled                      | off/minimal/full; minimal                                              | Preserve legacy meanings through explicit adapters. Disabled maps to off; do not silently reinterpret reduced as minimal because current reduced suppresses nearly all motion. Keep compatibility for explicit reduced until migration decision. |
| Charts       | `visualizations`: simple/enhanced; simple default       | numbers/balanced/charts; balanced                                      | Not a lossless enum rename: simple already includes lightweight SVG, enhanced only enables supported modules. Preserve legacy field/choices until an approved precedence rule defines coexistence with new axis. Data/metrics never change.      |

## Other choices retained

Accent, radius, font, text size, icon size, pagination, effects, enhanced states, currency and operational settings retain existing stored meanings. No border or typography preference. Sidebar collapse and drawer width remain device/view UI state, not new account appearance fields. Currency is presentation, not FX or a rewrite of posted transactions.

Accent identity persists, but the target changes its visual application: links/focus/charts only; neutral primary buttons and selected surfaces. This is a planned token change, not yet implemented.

## Enforcement consumer trace and decision

- `resolveSettings` applies both enforced layers to every preference and then device constraints.
- Web `AppearanceProvider` and native theme resolve the same snapshots; controls/panels use lock information and effective settings.
- `SettingsPanel`, `PreferenceFields`, `PolicyEditor`, and `BusinessPolicy` expose or consume these policies on both platforms.
- `SettingsModel.connect(accountId,businessId)` reloads account plus business policy on workspace changes, so effective cosmetic appearance can legitimately change today.
- Backend policy writes remain permission/version checked. Appearance enforcement cannot be removed by merely hiding policy controls.

Proposed account-consistent target: explicit personal cosmetic preferences win across businesses; organization defaults may fill unset values, while mandatory accessibility/device limits win. Existing cosmetic enforced values require a migration decision and disclosure before changing this order. **No resolver or enforcement change is made in Phase 1.** Security, offline grants, operational limits, notification policy and financial/business configuration stay independently enforceable.

## Synchronization, startup and conflicts

- Retain server-authoritative, versioned account records and account-switch clearing. Do not carry one user's cosmetic cache into another account.
- Current model loads on connect/save, not preference-specific live cross-device events. Define acceptable refresh latency before adding a scoped invalidation/version refresh mechanism.
- Anonymous appearance is in-memory; any future persistent anonymous cache must be cosmetic-only and must not silently overwrite an account record.
- Root preference application currently happens in effects, so first-paint theme/font swaps require visual measurement. Native useFonts is not used as a startup gate.
- Broad settings-state updates can recompute appearance context; separate effective preference subscriptions from pending/error state before introducing a second store.
- Concurrent saves currently require refresh. Recommended future UX: load latest version, show conflicting fields, explicitly reapply changed fields; never blind last-write-wins or generic mutation retries.

## Font evidence and migration conflict

Existing bundled assets: `packages/design-tokens/fonts/Karla.ttf`, `Lora.ttf`, with OFL notices. Current choices also include system/generic/local-machine fonts. The target requirement that every offered font is bundled conflicts with those unbundled choices; preserve stored values/fallbacks until the user chooses a migration policy.

The official [Geist license](https://github.com/vercel/geist-font/blob/main/OFL.txt), checked 2026-11-06, is SIL OFL 1.1 and permits bundling subject to its conditions, including retaining the notice/license. No font was downloaded or installed. Approve pinned asset version, bundled formats/weights and distribution notices before implementation; no Next.js font package is needed for Vite/Expo.

## Checkpoint decisions

1. Approve bundled Geist Sans/Mono with its license notice and a pinned asset release; retain Karla/Lora and explicit legacy selections until a separate migration.
2. Confirm default density on hybrid desktop/touch devices: recommended coarse primary pointer uses default density; explicit user density always wins. Other locked defaults remain light/medium/minimal/balanced for unset values only.
3. Decide cosmetic enforced-policy migration after the consumer trace above; recommended account preference priority, with a visible migration for existing enforced policies. No automatic removal now.
4. Approve retaining legacy reduced-motion and visualization semantics via compatibility adapters instead of lossy renaming. Define what wins if both old and new chart fields are stored.
5. No new dependency is proposed. Any future form/chart/state library needs its own justification and approval.
