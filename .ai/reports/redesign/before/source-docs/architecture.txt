# Architecture and decisions

## Ownership

| Area                                    | Source of truth                                               |
| --------------------------------------- | ------------------------------------------------------------- |
| Web and Windows/macOS presentation      | `apps/web/src`; Tauri host/adapters in `apps/desktop`         |
| Native presentation                     | `apps/mobile/src`; Expo, native controls, no DOM imports      |
| Independently deployable API            | `apps/api/src`; NestJS, PostgreSQL, module-owned services     |
| Runtime contracts and settings          | `packages/contracts/src`; strict schemas at trust boundaries  |
| Client models, transport and navigation | `packages/api-client/src`; injected platform adapters         |
| Portable business rules                 | `packages/domain/src`; no app/UI/server/native imports        |
| Design tokens                           | `packages/design-tokens/tokens.css`; generated native exports |
| Workspace scripts/dependencies          | Root and workspace `package.json`, root npm lockfile          |

Controllers validate requests; application services authorize and orchestrate transactions; domain rules own invariants; repositories/adapters own persistence/external calls. Shared packages never import applications. Keep native integrations outside browser code. Do not introduce another state, settings, styling or component framework without a demonstrated need.

## Finding every screen

Use `packages/api-client/src/workspace-navigation.ts`, `apps/web/src/app/router.tsx`, and the registries inspected by `scripts/check-parity.mjs`. Run `npm run check:parity` for shared/web/native coverage. Public storefront is web-only; its management screens require native parity. The component showcase is `/#/design-system`; it operates on local examples, not business records.

Implemented areas include organization/access management, catalog/pricing, inventory ledger/counts/storage/transfers, purchasing/suppliers, customers/credit, POS/shifts/receipts/returns, staff/expenses, reporting, notifications/approvals/audit, settings, trading/accounting foundations, bounded offline cash and storefront publication management. Inspect the owning module and tests before calling a sub-feature complete. A route existing is not proof that every workflow works.

## Accepted decisions

These rules preserve prior decisions; future behavior is not implicitly implemented by documenting it.

| Decision           | Rule / consequence                                                                                                                                                                                                                            |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PO sending         | Keep `ordered`; optional sent time/method, UI “Ordered / Sent”; no new state or stock/cash effect.                                                                                                                                            |
| Prices             | No named price lists. Storefront uses the existing default-store resolver and explicit online overrides; never create a parallel calculator or change POS price through an online override.                                                   |
| Adjustment reasons | Built-in codes plus optional tenant custom codes; preserve historical reason snapshots and existing free text.                                                                                                                                |
| Refund approvals   | Cumulative per-sale, per-currency thresholds through the approval queue; absent policy requires approval. No self-approval or split-request bypass. Execution revalidates independently. Do not assume every refund path implements this yet. |
| Undo               | Authorized, idempotent linked compensation; never erase committed stock, money or audit history.                                                                                                                                              |
| Public API         | Separate published-only projection, not internal catalog controllers. Narrow guest commands and event ingestion require separate guards and abuse budgets before implementation.                                                              |
| Sellable stock     | On hand − reserved − damaged − buffer, per SKU and allocation pool; buffer once, transit separate. Backorders are identified unallocated demand, not fictional holds.                                                                         |
| Readiness          | Content/price failures auto-delist; zero availability remains active as Sold out or hidden by policy. Stock is not a content blocker.                                                                                                         |
| Payments           | Pickup/COD/manual transfer design only; COD unpaid until confirmed collection, transfer uses clearing. Card providers disabled. Configuration does not imply guest checkout exists.                                                           |
| Posting            | Order, payment, fulfillment and journal events are distinct; see [integrity](security-and-data.md#posting-boundaries).                                                                                                                        |
| Analytics          | Online-only, in-memory cached/as-of views. Intended shared POS/online aggregation uses business timezone and net returns; do not describe legacy UTC/gross queries as migrated without tests.                                                 |

Publication management is implemented; guest checkout/fulfillment is not established by that implementation. Store-scoped `onlineStore.view` supports authorized read; business-wide `onlineStore.manage` controls writes. Manager read supersedes older “owners only” documentation. Readiness and availability revalidate on server; hints only invalidate clients. Media previews require authenticated scope, trusted hosts, public-address pinning, no redirects/credential forwarding, byte/time/rate caps and post-fetch authorization.

Rejected designs remain rejected: client-only authorization; exposing internal APIs publicly; new PO sent state; fake stock reservations; blind last-write-wins; deleting financial evidence; payment inferred from delivery; persistent analytics; duplicate pricing systems.

## Platform and product limits

Web, Windows and macOS are release gates. Mobile code parity remains required but is not a launch gate. Tauri reuses web UI; neither browser tests nor a macOS build qualify installed Windows/WebView behavior. Expo exports prove bundling, not device storage/printing/deep links.

Full statutory accounting, historical inventory valuation/COGS, 3D, automatic updates, MFA and external payment/provider delivery must not be advertised unless subsequently implemented and qualified. AI is disabled-provider, permission-checked navigation scaffolding; no secret-bearing prompts or autonomous business execution.

Historical feature specifications, decision context/rejected options, milestone prompts and evidence are preserved in the consolidation archive described in [development](development.md#documentation-history). Consult them for a specifically requested historical item; do not execute old milestones by default.
