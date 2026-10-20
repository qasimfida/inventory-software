# Data and API conventions

These conventions apply to the current modular monolith and independently updated web, Tauri and Expo clients. Domain features must use them rather than introduce competing representations. Shared validation lives in `packages/contracts`; deterministic decimal arithmetic lives in `packages/domain`, which has no platform/runtime dependencies.

## Identifiers and time

Server-generated record IDs are UUID v4, represented as lowercase UUID strings, never sequential public identifiers. Foreign IDs are not proof of authorization. Audit sequence IDs are decimal strings because JavaScript integers cannot represent all PostgreSQL bigint values. Request correlation IDs are generated server-side. Idempotency keys are client-generated UUIDs and are distinct from business record IDs.

Persist instants as PostgreSQL `timestamptz`, return ISO 8601 UTC strings with `Z`, and never interpret locale-formatted input as an instant. Effective pricing inputs must include an explicit UTC instant. Business settings store an IANA time-zone identifier (default UTC); `businessTime()` displays an explicit business-zone suffix and handles DST through Intl. Business owners can change this in web/desktop/mobile settings. The API does not convert timestamps to a business-local string. Date-only obligations use ISO `YYYY-MM-DD` when introduced; never convert them through device midnight.

## Money, quantities and units

JSON decimal values are **strings**, never JSON numbers. Quantities and unit prices allow 18 integer digits and at most six fractional digits, persisted as `numeric(24,6)`. Exponent notation, NaN, overflow and extra precision are rejected. The pure domain functions use scaled BigInt arithmetic, not binary floating point. Database numeric values remain strings in `pg`; never install a numeric-to-Number parser.

Final currency amounts use integer minor-unit strings with an explicit currency. Supported initial exponents are USD/EUR/GBP/PKR=2, JPY=0, KWD=3 and CLF=4. Unknown codes fail rather than default to two decimals. CLF is a unit of account and is not a promise of payment-provider support. The allowlist was checked against [SIX ISO 4217 List One](https://www.six-group.com/dam/download/financial-information/data-center/iso-currrency/lists/list-one.xml) on 2026-10-19. Changes require reviewed currency metadata and fixtures, never silent updates of historical transactions.

Compute line prices/discounts/taxes exactly, then round half away from zero only at the documented final currency boundary. Sum rounded line amounts for a document; do not independently round an unrounded document aggregate. Refunds reverse the original rounded amounts. A stored currency exponent/price snapshot belongs with historical transactions. Cross-currency operations require an explicit exchange-rate workflow, not an implicit conversion.

Each inventory item has a base unit. Conversion is explicit positive numerator/denominator relative to that base, with no inferred chain or ambiguous path. Convert purchase/sale/count quantities to the base before posting movements. Conversions that exceed six-decimal stock precision fail rather than silently lose quantity. Unit definitions and conversion snapshots used by posted documents are immutable historically. `convertQuantity()` and currency rounding have representative exactness and failure tests.

## Queries and validation

New directory APIs accept allowlisted `limit` (default 25, max 100), `offset` (0–100000), trimmed `search` (max 120), allowlisted `sort` and `direction`. SQL identifiers come only from server maps; bind all values. Apply business/resource permission filters **before** pagination and counting. Stable ordering always includes the primary ID as a tie-breaker. Return items plus limit, offset, total and hasMore; a changing directory is not a snapshot. Audit uses an immutable descending sequence cursor and 50-row pages. Existing small organization directories remain whole-business collections until a separately compatible pagination change; never silently truncate them.

Versioned REST lives under `/api/v1`. Errors consistently return `code`, safe `message`, server `requestId` and `retryable`; validation may add `fields` with path and machine issue code, never the submitted value. Statuses: 400 validation; 401 unauthenticated/expired; 403 forbidden; 404 unavailable/nonmembership; 409 stale version, duplicate identity, idempotency mismatch or illegal transition; 429 throttled; 503 unavailable. Clients must not parse prose. Retry mutations only with the same operation key and unchanged payload; a conflict is not an automatic retry instruction.

## Transactions, concurrency and idempotency

Application services own one transaction and use the transaction's query interface for every write, projection, audit and receipt. No network call inside a database transaction. Organization scope locks the business before reading current permissions, providing a consistent lock order and conservative serialization. This limits parallel write throughput within a business; measure before replacing it with narrower ordered row locks. Never claim this is a tested high-volume architecture.

Edits require the current positive integer record version; increment it on successful mutation and return 409 for stale edits. Clients refresh and ask the user to reconcile; they never retry a stale edit with a fabricated latest version. Archived records cannot be restored unless an explicit domain policy says otherwise.

Retryable domain commands carry required `idempotencyKey` in the validated JSON body. Receipt identity is (business, actor, operation name, key); canonical normalized request payload is SHA-256 hashed. Same key and same payload return the committed result. A different payload or changed role/scope/permissions returns 409. Current authentication, role, resource scope and lifecycle authorization must run before receipt lookup. Receipt, command writes, balance changes and audit commit atomically. Failures leave no receipt; callers retry uncertain outcomes with the same key. Receipts are retained indefinitely in this foundation; deleting them would remove duplicate protection. A future retention/archive policy must preserve key uniqueness and replay safety.

## Migrations and compatibility

Use additive ordered migrations with explicit constraints and indexes. Test fresh install, repeat-up, upgrade with existing records, rollback and forward repair on real PostgreSQL. Production does not auto-run migrations; deploy migrations as a release job before the corresponding backend, using a separate owner role. Destructive down migrations are development/recovery tools and require backups; prefer forward fixes. See [migration workflow](migrations.md).

The current repository is a pre-release foundation with no deployed-client compatibility guarantee. These coordinated v1 changes require rebuilding all clients; older strict response schemas may reject added fields. Before independent public releases, freeze the v1 contract, make response readers tolerate unknown additive fields, and test the oldest supported client against the new API. Breaking field meanings/types, required inputs, permission semantics or removed routes require `/api/v2`, a documented support window, contract fixtures and overlap deployment. Keep v1 available until supported offline/native clients upgrade or explicitly block unsupported clients with a clear upgrade response. Never reinterpret queued old commands against a changed schema or precision rule.

## Indexes and performance

Every business-owned table needs tenant-leading lookup/uniqueness indexes and composite parent constraints. Foreign keys do not automatically create child-side indexes. Index warehouse/location/time filters when introduced; include stable sort keys for paginated queries. Review EXPLAIN ANALYZE using representative tenant sizes before production, and cap input sizes to bound work. No scale benchmark has been run. Avoid unbounded bulk exports, N+1 history reads or global scans that bypass tenant scope. Audit and operation receipt tables need an explicit future operational retention/archive plan.

Impact: contracts/conventions and domain/decimal → schema pipe/error envelope and scoped idempotency → business time-zone settings and audit display on all clients. The API-only packager now includes the portable domain package. No business balances or financial documents are created by this conventions step.
