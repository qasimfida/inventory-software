# Architecture and decisions

## Ownership

- **ARC-001** [review] Area: Web and Windows/macOS presentation; Source of truth: `apps/web/src`; Tauri host/adapters in `apps/desktop`
- **ARC-002** [review] Area: Native presentation; Source of truth: `apps/mobile/src`; Expo, native controls, no DOM imports
- **ARC-003** [review] Area: Independently deployable API; Source of truth: `apps/api/src`; NestJS, PostgreSQL, module-owned services
- **ARC-004** [review] Area: Runtime contracts and settings; Source of truth: `packages/contracts/src`; strict schemas at trust boundaries
- **ARC-005** [review] Area: Client models, transport and navigation; Source of truth: `packages/api-client/src`; injected platform adapters
- **ARC-006** [review] Area: Portable business rules; Source of truth: `packages/domain/src`; no app/UI/server/native imports
- **ARC-007** [review] Area: Design tokens; Source of truth: `packages/design-tokens/tokens.css`; generated native exports
- **ARC-008** [review] Area: Workspace scripts/dependencies; Source of truth: Root and workspace `package.json`, root npm lockfile
- **ARC-009** [review] Controllers validate requests; application services authorize and orchestrate transactions; domain rules own invariants; repositories/adapters own persistence/external calls. Shared packages never import applications. Keep native integrations outside browser code. Do not introduce another state, settings, styling or component framework without a demonstrated need.

## Finding every screen

- **ARC-010** [review] Use `packages/api-client/src/workspace-navigation.ts`, `apps/web/src/app/router.tsx`, and the registries inspected by `scripts/check-parity.mjs`. Run `npm run check:parity` for shared/web/native coverage. Public storefront is web-only; its management screens require native parity. The component showcase is `/#/design-system`; it operates on local examples, not business records.
- **ARC-011** [review] Implemented areas include organization/access management, catalog/pricing, inventory ledger/counts/storage/transfers, purchasing/suppliers, customers/credit, POS/shifts/receipts/returns, staff/expenses, reporting, notifications/approvals/audit, settings, trading/accounting foundations, bounded offline cash and storefront publication management. Inspect the owning module and tests before calling a sub-feature complete. A route existing is not proof that every workflow works.

## Accepted decisions

- **ARC-012** [review] These rules preserve prior decisions; future behavior is not implicitly implemented by documenting it.
- **ARC-013** [review] Accepted product/domain decisions are owned by [security and data](security-and-data.md#accepted-product-decisions); preserve them during redesign.
- **ARC-014** [review] Publication management is implemented; guest checkout/fulfillment is not established by that implementation. Store-scoped `onlineStore.view` supports authorized read; business-wide `onlineStore.manage` controls writes. Manager read supersedes older “owners only” documentation. Readiness and availability revalidate on server; hints only invalidate clients. Media previews require authenticated scope, trusted hosts, public-address pinning, no redirects/credential forwarding, byte/time/rate caps and post-fetch authorization.
- **ARC-015** [review] Rejected designs remain rejected: client-only authorization; exposing internal APIs publicly; new PO sent state; fake stock reservations; blind last-write-wins; deleting financial evidence; payment inferred from delivery; persistent analytics; duplicate pricing systems.

## Platform and product limits

- **ARC-016** [review] Web, Windows and macOS are release gates. Mobile code parity remains required but is not a launch gate. Tauri reuses web UI; neither browser tests nor a macOS build qualify installed Windows/WebView behavior. Expo exports prove bundling, not device storage/printing/deep links.
- **ARC-017** [review] Full statutory accounting, historical inventory valuation/COGS, 3D, automatic updates, MFA and external payment/provider delivery must not be advertised unless subsequently implemented and qualified. AI is disabled-provider, permission-checked navigation scaffolding; no secret-bearing prompts or autonomous business execution.
- **ARC-018** [review] Historical feature specifications, decision context/rejected options, milestone prompts and evidence are preserved in the consolidation archive described in [development](development.md#documentation-history). Consult them for a specifically requested historical item; do not execute old milestones by default.

- **ARC-019** [review] Retained web/native screens keep draft models alive; visibility controls optional read polling, never transaction recovery or authorization. Tauri reuses web presentation, not browser credential/storage adapters. Route and component inventories are generated evidence, not completion claims.

- **ARC-025** [review] Import mappings are business-owned reusable metadata, not account appearance preferences. Versioned product_import_templates stores at most 50 named mappings per business; business-wide products.write controls CRUD and import. Settings policy replacement/inheritance is unsuitable for shared supplier column maps. Templates never contain uploaded rows. The existing six-field create-only import contract and atomic/idempotent posting are unchanged.

- **ARC-026** [review] Team owns membership, access and the employment directory; `/salaries` owns compensation management. Existing `/staff` remains Expenses. Company owns legal/contact/logo and receipt details; account Preferences owns interface colors. Legacy company palette and cosmetic policy values are retained unchanged but no longer edited or rewritten by Company Profile; no public brand-color renderer currently consumes that palette.

- **ARC-027** [review] Display FX uses server-only Open Exchange Rates with one USD-base snapshot and refresh attempt/hour shared across API replicas in exchange_rate_cache. Each original record currency selects its pair; company.transactionCurrency is only the operational default (USD fallback), not a universal currency. Account currency selects indicative display estimates; dashboard recorded-currency filtering is explicit and independent. Named price lists/valuation are not invented. Public storefront and payment/receipt/journal evidence retain authoritative currencies.
