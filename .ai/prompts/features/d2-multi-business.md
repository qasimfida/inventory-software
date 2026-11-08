Bills with items from several BUSINESSES owned by the same user (hardware, furniture, coffee shop), on all platforms. Design first, then stop.

Inspect: the multi-business membership model, tenant isolation mechanism (application scoping or RLS), customers, credit limits, tax registration per business, receipts, cash shifts, the ledger and intercompany capabilities from c, the combined bill model from d1.

DESIGN STEP decisions:
- How a user qualifies: hold the sales permission in each involved business and store, or a dedicated delegated permission. Recommend the first; never widen access across tenants.
- Customer identity: link per-business customer records (match by phone with confirmation) or a group-level customer.
- Intercompany: cash goes into the collecting store's shift; the other businesses record a receivable from the collector and the collector a payable, with a settlement action. Credit sales split per business, each checked against its own limit.
- Receipts: one combined customer summary plus a legal receipt per business with its own tax number and numbering.
- Consolidated group reports: read-only, only for businesses the user can access, currencies kept separate.

Build (after approval):
- Cross-business search and cart: results only from permitted businesses, labeled with a business badge; cart sections per business with subtotals and tax; server quote per child, aggregated for display.
- Atomic checkout in one transaction, per-business authorization and per-business idempotency keys; no partial bills.
- Intercompany entries and a settlement flow in the ledgers.
- Returns and voids per child sale under the parent.
- Online only in v1.
- Tests proving a user can't include a business or store they lack permission for, no cross-tenant reads, rollback on a failure in any child, intercompany balances reconcile, and audit entries exist on both sides.

Acceptance: a bill with hardware, furniture and coffee shop items posts correctly to each business, intercompany balances settle, and tenant isolation tests pass on all platforms.