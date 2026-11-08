# Phase 1 architecture baseline

## Scope and provenance

Inspected the current working tree, including pre-existing uncommitted work; not a clean historical commit. Branch: `redesign/phase-1`. No application TS/TSX/CSS, contracts, database migrations, dependencies or settings values are changed by Phase 1. Four guide contents are updated; the web developer showcase imports the design guide as text, so its documentation text changes, not component behavior.

The global prompt is now at `.ai/prompts/redesign/00-global.md`. At first invocation it was one level above; it was moved into the expected location between invocations. Phase 1 resumed without recreating its initial evidence. Pre-change guides and source fingerprints are in `before/`.

## Ownership verified

| Layer           | Source                                                                                                | Baseline responsibility / redesign boundary                                       |
| --------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Tokens          | `packages/design-tokens/tokens.css`, `build.mjs`                                                      | CSS semantic values and generated native tokens; no new per-page system           |
| Web styles      | `apps/web/src/styles.css`, theme and refinement CSS imports                                           | Tailwind 4 CSS-first bridge and cascade; consolidate ownership in later phase     |
| Web primitives  | `apps/web/src/components/ui/`                                                                         | Radix/shadcn-style accessible controls; Vaul drawers                              |
| Common patterns | `apps/web/src/components/common/`                                                                     | Forms, collection controls, async states, selection, resizable drawers            |
| Layout/shell    | `apps/web/src/components/layout/`, `shell/`                                                           | Navigation, authenticated workspace scope and retained screens                    |
| Native          | `apps/mobile/src/ui/`, `shell/`, `theme.tsx`                                                          | Native controls, safe areas, keyboard, custom navigation and equivalent semantics |
| Desktop         | `apps/desktop/src-tauri/tauri.conf.json`, Rust adapters                                               | Shared web frontend; native storage/printing/protocol/CSP remain separate         |
| Preferences     | `packages/contracts/src/settings.ts`, `packages/api-client/src/settings/model.ts`                     | Shared resolver, schema, versioned account settings; no new persistence store     |
| Workflow        | `packages/api-client/src/pos-model.ts`, `resource-model.ts`, organization/offline/online-store models | API orchestration, command identity, cancellation, quote and draft state          |
| API contracts   | `packages/contracts/src`, `packages/api-client/src`                                                   | Runtime validation and injected platform transports                               |
| Backend         | `apps/api/src`                                                                                        | Permissions, tenant scope, transaction/ledger/price authority                     |

## Routing and nested functionality

`routes.md` and `routes.json` are generated from the live workspace registry, checked web/native render dispatch, and explicitly verified shell/detail exceptions. The JSON retains conservative import closures and imported client/model names. `components.md` and `components.json` cover every non-test TSX source module, not only top-level pages.

- React web uses `createHashRouter`; most workspace pages dispatch through `WorkspaceScreens` plus workflow panels and `SettingsPage`.
- Native uses `Navigation` and `NativeScreens`, `SettingsScreen`, `NativeApplication` and `NativeShell`; it does not use Expo Router.
- Tauri uses web hash navigation, with native deep-link adapters. No separate desktop page tree.
- Native `/more` has no browser route. `/design-system` is a standalone browser route; native has a showcase component rather than the same URL. Native auth links dispatch parsed invitation/reset state, not a literal `/auth/link` screen.
- Product detail tabs: overview, stock, pricing, history, channels. Product setup drawer: details, price/units, quantity, listing. Inventory embeds catalog and stock/movement views. Categories remain separate.
- Storage embeds list/hierarchy, location details/edit, balances, labels and movements. Stock counts/scanning and transfers are distinct modules.
- Purchasing embeds suppliers, order lines/states, receiving and returns. Sales embeds receipts/returns/void/exchange. Payables/accounting embed settlements, credits, periods and journals.
- Team embeds membership/access and staff records; `/staff` is Expenses. Settings embeds business/profile, policy, sessions, device/offline, security notifications, stores/terminals and audit.
- Online-store management embeds overview/setup, active/ready/changes-required listings, product picker/details, action results and general/fulfillment/policy/image settings. No guest checkout completeness is inferred.

## Baseline risks, not authorized fixes

1. Multiple CSS owners for cards, cart, sidebar and preferences; final cascade must be preserved before consolidation.
2. Retained hidden screens can keep polls/subscriptions alive. Preserve drafts and uncertain transaction state if introducing activity suspension.
3. Current theme/setting defaults and policy precedence differ from the target. See `preferences.md`; no enforcement was removed.
4. Primitive adoption varies: generic command/record forms have different feedback than product-specific workflows. Reuse, do not replace workflow models.
5. Compact styling cannot reduce native/coarse-pointer touch targets or hide stock/money/error information.
6. Public showcase exposes documentation text; decide production visibility separately, without changing auth/routes in Phase 1.
7. Existing tests have baseline failures; source inventory or browser captures are not a substitute for green functional regression evidence.

## Tooling changes justified by baseline

The existing parity checker missed a genuine alias (`/warehouse-view` → `/storage`). It now recognizes aliases only in canonical `path` assignments, and only when their destination has a renderer. Native settings aliases are read from native Navigation. Two stale test fixture anchors referenced `InventoryPanel` after its replacement by `InventoryWorkspace`; only those fixture anchors were corrected. No application route or permission changed.

New route/report checks fail for missing reviewed entry points, absent rows and stale generated route evidence. Documentation checks enforce four guides, <=200 lines, IDs, tags and valid local links/anchors. Component classifications are source triage; they do not authorize removal or certify visual quality.
