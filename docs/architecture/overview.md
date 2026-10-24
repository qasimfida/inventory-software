# Target architecture

Status: web/API/mobile/desktop foundations include invitation onboarding, online session management and shared validated transport. Online [organization management](../development/organization-management.md) is implemented. Online catalog/pricing, stock ledger, purchasing, storage and transfers are also implemented; see [domain rollout](../development/domain-rollout.md). Online POS, customer receivables, cash collection/shifts and corrections are implemented; see [commerce rollout](../development/commerce-rollout.md). Bounded offline cash, durable sync, live invalidations, stock counts and scanning are implemented; see [offline rollout](../development/offline-rollout.md). Supplier settlement is implemented; external payments remain disabled. Stage 6 adds limited double-entry journals/source posting and explicitly shared business orders; see the [Stage 6 scope](../development/stage-6.md). [Decisions](decisions.md) distinguishes commitments from proposals. [Module map](../ai/architecture-map.md) owns directory and dependency details.

## Responsibilities and data flow

| Layer                | Responsibility                                                                                                   |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| React web client     | Browser UI, local operation capture, IndexedDB adapter; versioned production app-shell cache for offline startup |
| Desktop shell        | Reuse React UI; native SQLite, printing, filesystem and secure-storage adapters                                  |
| Native mobile client | Platform UI/navigation, scanning and native storage; reuse domain and contracts                                  |
| Shared packages      | Pure domain calculations/invariants, transport schemas, client application use cases and adapter ports           |
| NestJS API           | Authoritative validation, tenant authorization, business transactions, durable sync endpoints                    |
| PostgreSQL           | Confirmed business records, ledgers/projections, idempotency receipts, durable change feed                       |

Client UI → application use case → local transaction (data + pending operation) → REST synchronization → authorized server transaction → durable acknowledgement/change feed → local projection → subscribed consumers. An online-only command uses the same server validation boundary. The UI must disclose operation status.

The backend is a modular monolith with one transactional database initially. Modules expose application interfaces; only their owning repositories write their tables. A workflow may coordinate multiple modules within one explicit database transaction. No microservices, broker, Redis, or Kubernetes without measured need.

## Frontend and contracts

React + Vite + strict TypeScript + React Router; Tailwind and shadcn/ui for DOM primitives. Component state and reducers/context are the initial local-state choice. TanStack Query handles remote queries when introduced; it is not the durable pending-operation store. Offline business screens observe local projections so local data, query caches, and transient state do not become competing authorities.

API wire contracts and runtime validation schemas belong in `packages/contracts`; domain invariants in `packages/domain`. Share deterministic rules, not database entities, authorization decisions, or framework decorators. JSON transports money/quantity decimals as strings with explicit currency/unit and versioned timestamps/IDs. REST errors carry stable code, safe message, field details where applicable, correlation ID, and retryability; clients do not parse prose.

Lazy-load reporting, analytics, administration, and warehouse visualization. Establish a bundle baseline with the first web build; require justification for added libraries and heavy entry-point dependencies. Public SEO pages are a separate future requirement, not a reason to default POS to Next.js.

## Persistence and evolution

Backend migrations live in `apps/api/migrations`; use `node-pg-migrate` for reviewed SQL and `pg` for connections; see [migration workflow](../development/migrations.md). Commit ordered migrations, review locking/data impact, test clean installation and upgrades, and use expand/migrate/contract for compatible rollout. Never use automatic schema synchronization in production. Local database migrations are versioned separately per adapter and must preserve unsent operations.

Prices are owned by catalog; sales snapshots the agreed values, currency, tax and price version. Checkout validates authoritative prices and policy; offline deviations require explicit reconciliation. Inventory owns quantities and reservations; other modules never update balances directly. [Domain rules](../domain/inventory-and-finance.md) define the invariants.

## Optional industries and future extensions

Use one core with server-enforced capability flags, typed configuration, and versioned workflow policies. Core quantities, money, ownership, and relationships use typed relational fields. JSONB is reserved for validated flexible attributes with schema/version and indexing decisions. Industry modules extend public interfaces without forks or arbitrary executable configuration. Flags are not permission checks.

Add visualization, integrations, and AI through bounded interfaces when required. Reports and AI read authorized projections; AI-generated mutations must use ordinary commands, permissions, approvals, and audit. No direct ledger edits. Add new platforms through adapter conformance and native acceptance checks, not browser API assumptions.
