# Security, data and offline rules

## Identity and authorization

- Invitation onboarding; operator-issued password recovery. Keep established password hashing, session expiry/renewal, rate limits and revocation. Never invent a successful email/SMS verification.
- Browser credentials use HttpOnly cookies with production Secure/SameSite and origin/CSRF checks. Mobile uses SecureStore; desktop credentials remain ephemeral in memory. Client environment variables are public.
- Every protected read/write, export, job, socket and retry resolves authenticated membership, tenant, permission and store/warehouse/resource scope. Client IDs, hidden controls and notification delivery grant no authority.
- Hide inaccessible routes/actions in UI; keep backend checks. Account/business changes, expiry, denial and background lock clear sensitive in-memory state. Do not reset user preferences to work around a session failure.
- Use scoped foreign keys/unique constraints, bounded queries and safe validation. Cross-business trade authorizes each party separately. RLS is not a substitute for existing application checks and must not be claimed universally active.
- Mutations commit source/projection/audit/idempotency/change records atomically where locally transactional. Authorize before replaying an idempotency receipt; reject a reused key with a different payload.
- Generic transports never automatically retry mutations. Protected retries retain their original ID and payload. An unknown response is not proof of failure; inspect/reconcile before creating a new operation.
- Log actor, scope, operation, reason and safe diagnostic context. Never log passwords, cookies, tokens, keys, payment secrets or unnecessary PII. Show actionable safe errors; keep technical correlation IDs secondary.
- Production uses validated config, verified database TLS, HTTPS, narrow CORS/CSP, bounded requests and durable abuse limits. CORS is not authorization. Seeds/mocks stay explicitly development/test-only.

## Stock and money

- LedgerCore owns immutable inventory movements and transactional balance projections. Preserve actor/time/source/reason, base-unit precision and movement references; never overwrite stock silently.
- Reservations, damaged stock, in-transit stock and physical on hand are distinct. Lock affected stock keys consistently; test concurrent allocation, partial transfers/receipts, counts and rollback.
- Counts reconcile against observations/revision and intervening movements. Transfers require both endpoints. Inter-business trade status does not post either party's stock/cash.
- Quantities use exact six-place decimal rules; money uses currency minor units. Preserve currency exponent, original units, rounding/tax/discount order. Never sum currencies or use binary floating-point financial totals.
- Prices/taxes/discounts on posted sales are immutable snapshots. Current product edits affect new quotes; checkout revalidates server-side. Display-currency preference is not FX conversion.
- AR/AP derive from obligations, credits and allocations. Prevent overpayment, over-return, over-refund and negative till cash transactionally. Return credits apply original cumulative rounding and reduce unpaid credit before cash refunds.
- Goods return, credit, refund and replacement sale are separate linked facts. Damaged returns do not increase sellable stock; non-restockable returns do not increase stock. Closed shifts and posted journals are immutable.
- Accounting is limited balanced source posting, not statutory accounting/valuation. Source uniqueness is separate from request identity. Reversing a journal does not reverse its sale/stock/payment.

## Posting boundaries

| Confirmed event                   | Stock                                        | Money / journal intent                                                   |
| --------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------ |
| Online order acceptance (future)  | Reserve real sellable quantity only          | No sale revenue or cash; backordered remainder unallocated               |
| Cancel unfulfilled remainder      | Release hold once                            | Refund any advance separately; no fictitious stock increase              |
| Physical dispatch/pickup          | Deduct fulfilled goods and consume hold once | Recognize fulfilled sale/AR; debit settlement/AR, credit net revenue/tax |
| Cash physically collected         | None                                         | Open-shift cash receipt; debit cash, credit AR or customer advance       |
| Confirmed courier/bank collection | None                                         | Debit relevant clearing, credit AR/advance; no till cash                 |
| Advance applied at fulfillment    | No extra deduction                           | Debit advance, credit AR; no duplicate revenue                           |
| Clearing remitted to bank/till    | None                                         | Debit bank/cash, credit clearing; no second customer payment/revenue     |
| Order complete                    | None beyond fulfillment                      | No extra posting                                                         |
| Authorized return received        | Disposition-specific movement once           | Linked credit: reverse revenue/tax into settlement/AR                    |
| Approved refund actually paid     | None merely from payment                     | Debit settlement/advance, credit actual cash/bank/clearing               |
| POS checkout                      | Existing immediate handover movement         | Existing sale/payment sources, once each                                 |
| Offline captured sale             | Provisional local evidence                   | No confirmed server posting until authorized successful sync             |

Partial events cover only confirmed portions. Future online source posting must persist a durable intent with source/audit effects; pending journals are not posted journals. This table preserves design decisions, not a claim that guest fulfillment or clearing is implemented.

## Offline contract

- Only prepared, encrypted, bounded **cash sales**, carts and catalog/price snapshots may operate offline. Credit, refunds, approvals, purchasing, counts, transfers and online-store administration require online authority.
- Policy defaults off; grants bind account/business/device/warehouse/currency/shift/access fingerprint/policy/immutable price snapshot. Preserve configured 5–480 minute lease, cash/quantity/discount limits and changed-price policy.
- Current preparation is bounded to 250 active variants, one currency and warehouse-root stock. Cached stock is an allowance, never a global reservation; server shortages stay conflicts.
- Vault is an authenticated encrypted document: AES-256-GCM, random 96-bit nonce, independent salt and PBKDF2-HMAC-SHA256 (600,000 iterations). No account password, session token or plaintext customer profiles. Separate passphrase loss has no recovery backdoor.
- Web uses IndexedDB; Tauri and native use transactional SQLite WAL adapters. Origin/account/device partitions, compare-and-swap writes, atomic cart/outbox and projection/cursor commits remain mandatory.
- Lock/background clears in-memory keys. Expiry blocks new sales without deleting pending evidence. Detect backward-clock movement; hostile device clocks remain a known limitation. Revocation discovery is bounded by the original lease, not instantaneous offline.
- Upload reauthorizes current scope/policy/shift/stock and operation time; normal grace is 24 hours for in-grant sales. Older/revoked/conflicting records require authorized reconciliation, not deletion or recreated sales.
- Batches max 20, durable atomic claims before I/O, stable IDs/hashes, exponential jitter backoff capped five minutes, eight failures require review. Late replies never downgrade confirmed results.
- Schema migration/backup/restore must preserve pending work; unknown/tampered versions fail closed. Backup encrypted envelopes and consistent SQLite WAL state. Never advise clearing storage with unsynced sales; outbox retention cap is 1,000 records.
- Readiness recovery triggers eligible sync; polling/backoff recovers missed events. Progress counts server confirmations, not bytes/network availability. Pending/sending/synced/rejected/conflict remain distinct with reviewable receipts.
- Offline shell service worker caches public app assets only, never private API/auth/analytics. Development Vite and Expo web export are not proof of offline browser restart. Do not force updates mid-checkout.
- Revision polling/WebSocket tickets are scoped invalidation hints, never command channels or confirmation. Reconnect rereads authoritative data; delta cursors bind scope/currency and commit with cache updates.

## Public and analytics boundaries

Published reads expose allowlisted fields only, never costs/suppliers/private inventory/customer data. Guest writes/event ingestion require distinct implementation, narrow guards, stable identities and abuse limits. Status tokens must be random, digest-stored, bounded, revocable and scoped to minimal status; redact URL/log/referrer exposure. Staff authority cannot be inherited by a guest endpoint.

Analytics may retain an authorized, timestamped **in-memory** view during transient failure only until session expiry/lock. Partition by account/business/permissions/query/currency/timezone; clear on denial, switch, logout, background or restart. No analytics in SQLite, IndexedDB, vaults, backups or service worker. Intended net reporting counts return credits once, not both credit and refund, with business-timezone/DST boundaries and separate currencies.
