# Inventory and financial invariants

These are design requirements, not existing tables or code. Server application services own validation and explicit PostgreSQL transactions. Client rules improve feedback but never replace authoritative checks.

## Inventory

- Immutable movements record tenant, item/variant, base unit, location, signed quantity, source, actor, operation ID and timestamps. Corrections append linked reversals/adjustments with reason and approval; never rewrite history.
- Balances are transactionally maintained projections of movements. Define the stock key (business/warehouse/location/item and lot/serial where required); lock affected keys consistently or use versioned conditional updates. Retry serialization/deadlock failures with the same idempotency key. Unique constraints prevent duplicate source movements.
- Reservations are distinct from physical stock. Available-to-sell derives from on-hand minus active reservations and other explicit policy holds. Reservation creation, consumption, release and expiry must be concurrency-safe and auditable.
- A bin move changes location balances but not warehouse ownership or total. A warehouse transfer has dispatch, in-transit and receipt states; support partial receipt and discrepancies without creating stock twice.
- Separate-business trade requires independent sale/purchase and financial documents with explicit bilateral authorization. A correlation ID does not grant access to the other business. Partial failure follows a recoverable workflow; never assume one unauthorized cross-tenant write transaction.
- Counts record observations and a reference revision/cutoff. Reconciliation creates approved adjustments and accounts for movements since counting began; never overwrite a live quantity.
- Offline devices cannot guarantee global availability independently. Choose conservative quotas/reservations or explicit oversell/review policy before offline checkout ships. Negative stock is a policy decision, not a lost-update workaround.

## Money, credit and pricing

- Use fixed precision decimal or currency-scaled integers, never binary floating-point totals. Define currency exponent, quantity precision, unit conversion, tax rounding and discount order with tests. No arbitrary mixing of currencies.
- Catalog owns price versions; sale lines preserve applied prices, taxes, discounts, currency and provenance. Checkout revalidates price/availability atomically under documented policy. Offline price mismatch becomes an explicit accepted exception or review conflict; never silently change a completed receipt.
- Receivables/payables derive from immutable obligations, credit notes and payment allocations. Customer/supplier balances are projections, never independently editable fields. Partial payments leave traceable remaining obligations; prevent over-allocation in the same transaction.
- Return authorization, goods receipt, credit note and cash/provider refund are distinct linked actions. Partial returns/refunds must not exceed remaining eligible quantities/amounts; restocking depends on disposition, not just a payment reversal.
- Corrections use linked compensating entries and audit reasons, preserving original documents. Full double-entry accounting is a future module unless separately required; do not imply statutory accounting compliance from a subledger.
- External payment calls cannot share a PostgreSQL transaction. Persist an intent and stable provider idempotency key, reconcile unknown outcomes and authenticate/deduplicate webhooks. Never retry an ambiguous charge with a new identity. Offline card acceptance depends on provider support and explicit policy.

For each mutation, commit business records, projections, audit, idempotency result and durable change records together where locally transactional. If the operation fails, roll back all participating database writes. Test competing updates, retries after lost responses, compensation and unauthorized resource IDs.
