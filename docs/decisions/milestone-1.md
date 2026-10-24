# Milestone 1 decisions

Date: 2026-10-24. Status: **accepted design; implementation pending**. Source: [milestone prompt](../prompts/milestone-1-decisions.md) and [gap analysis](../product/gap-analysis.md). These records supersede conflicting proposed behavior in the feature spec/gap backlog, not historical implementation evidence. This milestone changes documentation only.

Web, Windows desktop and macOS desktop are launch-gated. Mobile feature parity remains required in the same implementation change; Android/iOS runtime qualification is tracked separately and is not a first-launch gate. The public storefront remains web-only; its management screens are cross-platform. See [qualification](../release/qualification.md).

## D01 — PO ordered/sent metadata

**Context.** Purchasing currently uses `ordered`; the spec asks for `sent`. Sending a document and supplier receipt are not the same fact.

**Decision.** Keep `ordered`; introduce nullable `sentAt` and `method` metadata in a later migration. Display the stage as **Ordered / Sent** on all management clients, but show “Not sent” when metadata is absent. `sentAt` is an instant; `method` identifies manual delivery, email or another explicitly supported delivery channel. Manual marking requires an authorized user, reason/evidence and audit. Automated marking requires successful handoff to the configured delivery provider, not a click or PDF download. Provider acceptance does not assert supplier receipt. Keep an append-only delivery-attempt history; the summary fields identify the latest confirmed send. Failed attempts do not change them. Do not backfill old ordered rows with invented send dates.

**Consequences.** Existing state transitions remain compatible. Partial receipts and cancellation rules remain owned by Purchasing. Email delivery is still unimplemented; metadata alone does not provide it. Retries need a stable send-attempt identity.

**Rejected options.** A new `sent` state; treating every ordered PO as delivered; marking sent when a file is merely generated.

## D02 — Existing price resolver, no named lists

**Context.** Existing pricing supports effective dates, variant/unit/currency, store overrides and private customer prices, but no named list entity.

**Decision.** Defer named price lists. Storefront v1 follows the existing resolver in its configured default store context, using the default store price (including the resolver's business-default fallback). Public resolution has no employee or customer-specific price identity. Use the existing unit, tax and promotion rules; no parallel calculator. An explicitly configured online override, if implemented, is an input to the same authoritative pricing path and never a client-supplied checkout price. Missing/expired/nonpositive prices fail content/price readiness. Checkout revalidates the resolved version and amounts.

**Consequences.** A06's named-list gap is deliberately deferred, not implemented. Storefront enablement must identify a valid store and currency. Store-specific/private prices must not leak through public projection or shared caches. Offline snapshots retain their original grant price policy.

**Rejected options.** New named lists in v1; deriving prices in UI; arbitrary “first store” selection; exposing customer-specific pricing to anonymous visitors.

## D03 — Adjustment reason codes

**Context.** Ledger adjustments currently preserve free-text reasons; controlled reporting requires stable codes.

**Decision.** Use built-in codes `opening_balance`, `count_correction`, `damage`, `loss`, `found_stock`, `data_correction`, and `other`, plus optional business-owned custom codes. `other` requires explanatory text. Built-ins have immutable identifiers; custom codes have stable tenant-scoped identifiers, labels, active/inactive status and applicable adjustment directions. Only authorized business administrators manage codes; stock authority is still required to adjust stock. Deactivation prevents new use without deleting history. Preserve code and description snapshots on each movement. Existing free-text movements remain intact and explicitly legacy/unclassified; do not infer their code. Purchasing/returns/counts keep their owning document workflows rather than using codes to bypass them.

**Consequences.** A later migration, shared validation, management controls and audit are required. Code lookup is tenant-scoped; the code does not grant permission or authorize a quantity change.

**Rejected options.** Free text only; deleting used codes; one business editing another's codes; direct balance overwrites.

## D04 — Threshold-based refund approval

**Context.** Refund permission exists, but the existing approval queue only covers other document types.

**Decision.** Extend that queue with refund requests; execute through the owning sales/refund command. A business policy defines a nonnegative threshold in each transaction currency's minor units. Require approval when the requested refund plus already committed and pending refunds against the original sale is **greater than or equal to** the threshold. This prevents splitting to bypass review. Zero means all refunds require approval; missing currency policy fails closed to required approval. Credit-reducing return value also counts, not only immediate cash payout. Validate aggregate remaining refundable amounts under the existing transaction lock.

A requester must have refund authority. An approver must have separately delegated refund-approval authority and the relevant business/location scope; no self-approval. The request snapshots amount, currency, lines, reason, source versions and policy version. Recheck authority, policy, remaining amount and cash availability on execution. Changed terms invalidate approval; unchanged retries reuse the original operation identity. Approval alone posts no refund, stock or journal effect. A sole operator must arrange an authorized second approver when required; there is no owner bypass.

**Consequences.** Queue/contracts/policy/permission extensions and all-platform UI are future work. Request, approve/reject and execute are audited separately. Pending/refused requests retain evidence. Defaulting missing policy to approval requires configuring approvers before rollout.

**Rejected options.** Frontend-only thresholds; automatic owner/self-approval; an approval notification granting authority; paying immediately and seeking retrospective approval.

## D05 — Undo is compensation

**Context.** Inventory and finance are immutable ledgers. An apparent UI reversal must not erase a completed event.

**Decision.** Undo of committed business data means an authorized, idempotent compensating command referencing the original, with reason, scope and any required approval. It appends ledger/financial effects; it never deletes or rewrites them. Unsubmitted form edits may still be discarded locally. Toast actions may open the compensating review flow, but may not silently execute privileged reversals. Where reversal is prohibited (closed shift, consumed stock, ineligible return), explain the failure and offer the supported correction workflow.

**Consequences.** Original receipts, audit and journal sources remain traceable. Reversing a journal alone does not reverse its source stock/cash event. No generic “undo any mutation” API.

**Rejected options.** Deletion, balance rewrites, restoring an old JSON snapshot, or UI-only removal that misrepresents server state.

## D06 — Public and guest API boundaries

**Context.** Internal APIs require staff sessions/membership; the proposed “read-only public API” also needs guest checkout and telemetry writes.

**Decision.** Define three separately guarded surfaces: published-only reads resolved by enabled storefront slug; narrow guest checkout/status commands; anonymous event ingestion. They do not expose internal controllers or inherit staff cookies as public authority. Publish an allowlisted DTO/projection that excludes cost, suppliers, internal notes, exact stock and customer records. Cache keys include business, publication/rule version, currency and price context; disabling/delisting invalidates reads and blocks new checkout even if a stale page is visible.

Guest commands validate server prices, enabled state, stock, fulfillment and idempotency. Status links use established cryptographically random opaque tokens, stored as digests, scoped to one business/order and read-only minimal status, with expiry, revocation and rotation. Tokens are secrets: redact URLs/logs, prevent referrer leakage, avoid third-party assets on token pages, and never use predictable order IDs as authorization. Token lifetime is finite and must be configured/tested before launch; expiry must not require making staff accounts for guests.

Apply durable rate limits per surface, business and abuse principal, bounded payloads and bot controls, plus reviewed trusted-proxy handling. Use origin/CSRF defenses suitable for any guest cookie flow; do not relax internal SameSite/CSRF policy. Event payloads contain no PII, honor DNT/consent requirements, use bounded retention and strip sensitive free-text search terms. Customer notification delivery needs its own configured provider and durable retry history.

**Consequences.** Public route metadata, DTOs, projection invalidation and guest identity policy are future additions. Staff invitation-only authentication is unchanged. Returning an error must not disclose another tenant or guest order.

**Rejected options.** Making existing catalog/sales controllers public; granting guests staff memberships; long-lived employee tokens in storefront JavaScript; trusting slug or a client business ID alone; public exact inventory.

## D07 — Sellable stock and backorders

**Context.** Existing available stock subtracts reserved and damaged stock. The spec's initial formula omitted damaged stock.

**Decision.** Authoritative sellable stock is **on hand − reserved − damaged − buffer**, in base units for the same tenant, SKU and eligible location scope. Transit is not on hand. Buffer is nonnegative, default zero, and subtracted once after aggregating the intended allocation pool; a channel cap may further bound the result but may not create stock. Public availability clamps negative sellable amounts to Sold out; internal diagnostics retain the actual deficit. The rule gates new allocation, not consumption of an already valid reservation (which would double-count it).

A backorder is an explicit unallocated order quantity with customer-visible status. The flag permits accepting that quantity, not fabricating a reservation, negative fulfillment or overriding damaged stock. Allocate only real sellable stock transactionally. Expiry/cancellation release existing holds once; fulfillment consumes the held quantity and physically deducts once. Late offline sales remain retained conflicts for review if stock is no longer available; neither channel silently wins.

**Consequences.** Allocation, expiry and buffer policies need implementation and concurrency tests. Existing negative-stock policy is not permission for storefront backorder fulfillment or offline sync bypass. Pending offline cash evidence cannot be deleted to repair an online shortage.

**Rejected options.** Omitting damaged stock; treating cached quantities as global reservations; negative/fictional holds; last-write-wins reconciliation.

## D08 — Content readiness versus availability

**Context.** Auto-delisting every zero-stock item contradicts active Sold out listings and sold-out analytics.

**Decision.** Use two versioned evaluations. Content/price readiness includes required title/description/media/category/SKU/unit, positive authoritative price, delivery measurements where needed and every variant's inherited/effective values. Failure prevents publishing or moves an active listing to needs_changes, removes it from public projection and queues an owner alert. Optional brand/SEO/extra-image checks remain warnings.

Availability uses D07. Zero sellable stock does not invalidate content readiness or remove the listing from active management state: display Sold out publicly or hide according to the business setting. Backorder-enabled listings identify backorders explicitly. A content-ready zero-stock item can be published as active-but-unavailable; stock is not a content publication blocker. Price/media/stock/rule changes cause the appropriate durable revalidation; checkout checks again rather than trusting a stale projection.

**Consequences.** Distinguish lifecycle status, readiness issues and availability in contracts/analytics. Public cache invalidation and owner alerts must be durable and tenant-scoped. A warning never blocks publishing unless a later version explicitly upgrades it.

**Rejected options.** Auto-delisting solely on zero quantity; hiding invalid prices only in UI; duplicating unrelated validation rules on clients/server.

## D09 — Storefront v1 settlement methods

**Context.** Current POS is cash/authorized credit; no card provider or bank integration is enabled.

**Decision.** Offer pay at pickup, cash on delivery and manual bank transfer. Pickup/COD create unpaid obligations until actual collection is confirmed by an authorized operator. “Shipped,” “ready” or customer upload of a transfer slip is not payment confirmation. Physical till receipts require an active appropriate shift; courier collections are a separate auditable courier/settlement clearing balance until remitted, never invented till cash.

For manual bank transfer, an authorized operator verifies evidence and records a unique settlement reference, amount, currency, date and actor against a clearing account. Reconciliation moves clearing to bank only when matched; no automated verification claim. Reject duplicates/over-allocation and use compensating corrections. D10 defines prepayment handling. Card providers remain disabled and outside this milestone.

**Consequences.** Add clearing/bank/advance source mappings and restricted confirmation/reconciliation workflows before enabling these methods. Amounts and currency remain exact; payment confirmation is online-only. Provider credentials are not needed for manual entry, but staff verification is still required.

**Rejected options.** Marking COD paid at placement/dispatch; treating a transfer slip as bank confirmation; recording all payments as cash-shift deposits; adding a card provider implicitly.

## D10 — Separate order, payment and fulfillment effects

**Context.** Existing POS checkout posts stock/sale/cash together; existing Stage 6 journals are explicitly source-posted. Online placement must not reuse immediate POS deduction. The following is the future posting contract, not a claim that automatic posting exists today.

**Decision.** Each confirmed domain event has a stable tenant-scoped identity and immutable amounts/quantity. Commit its domain effects, audit, command receipt and a durable journal-posting intent in one database transaction. The authorized posting executor uses the existing unique business/source-kind/source-ID boundary; retries cannot create a second journal. Pending or blocked intents are visible and do not pretend to be posted. Closed-period corrections use an authorized open period with original effective instant preserved; never rewrite a closed journal. Manual source posting and the future executor must share the same uniqueness key.

| Event (when confirmed)                                                          | Stock effect                                                                                                                                                 | Money/obligation effect                                                                                                             | Journal effect when its durable intent is posted                                                                                                 |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Online order placed                                                             | Reserve only allocatable quantities; backorder remainder explicitly unallocated; no on-hand deduction                                                        | Payment due/pending only                                                                                                            | None: no revenue/cash at placement                                                                                                               |
| Confirmed/packed/ready for pickup                                               | No physical deduction; maintain valid holds                                                                                                                  | None merely from status                                                                                                             | None                                                                                                                                             |
| Reservation expires or pre-fulfillment cancellation                             | Release remaining reservation once; no on-hand increase                                                                                                      | Cancel unpaid remainder; confirmed prepayments require a separate refund                                                            | No sales journal for unfulfilled goods; refund event handles paid amounts                                                                        |
| Physical dispatch to delivery or physical pickup handover, per fulfillment line | LedgerCore deducts on hand and releases/consumes matching reservation in the same transaction                                                                | Recognize that fulfilled portion's immutable sale/receivable; advance allocation may settle it                                      | Debit customer settlement/AR; credit net revenue and sales tax, once per fulfillment-source sale                                                 |
| Confirmed cash collection into till                                             | No stock effect                                                                                                                                              | Record receipt and allocate to receivable, or retain as advance if not yet fulfilled; increase that open shift's expected cash once | Debit cash; credit AR for fulfilled amount or customer advances liability for unfulfilled amount                                                 |
| Confirmed courier collection or manually verified transfer                      | No stock effect                                                                                                                                              | Record collection against courier/bank clearing; allocate to AR or advance; no till movement                                        | Debit relevant clearing; credit AR or customer advances                                                                                          |
| Advance applied at fulfillment                                                  | No additional stock effect                                                                                                                                   | Reduce held advance and corresponding receivable exactly once                                                                       | Debit customer advances; credit AR. Never recognize revenue a second time                                                                        |
| Clearing reconciled to bank/till                                                | No stock effect                                                                                                                                              | Transfer between settlement accounts; till movement only if cash physically enters a valid shift                                    | Debit bank/cash; credit clearing. No new revenue or second customer payment                                                                      |
| Order completed                                                                 | No new stock effect after fulfillment                                                                                                                        | Close lifecycle when required delivery/payment conditions are satisfied                                                             | None merely from completion                                                                                                                      |
| Authorized returned goods received                                              | Append disposition-specific LedgerCore return movement once; damaged receipt increases damaged balance; non-restockable goods do not increase sellable stock | Accepted return creates a linked credit/reduced obligation at original apportioned amounts                                          | Debit sales returns and reverse original sales tax; credit AR/customer settlement. Goods receipt itself is not a cash payout                     |
| Approved refund actually paid/confirmed                                         | No stock effect solely from payment                                                                                                                          | Reduce refundable credit or unapplied advance; cash payout requires valid shift and available funds                                 | Debit AR/customer settlement or customer advances; credit cash/bank/clearing as actually paid                                                    |
| Existing POS completed checkout                                                 | Immediate LedgerCore sale at handover, as today                                                                                                              | Confirm sale and cash allocation/residual authorized credit, as today                                                               | Existing sale and cash-payment source mappings, distinct source IDs; no additional online fulfillment posting                                    |
| Offline cash sale captured locally                                              | Local encrypted provisional record only; no global reservation or server stock posting yet                                                                   | Cash physically collected must be preserved as evidence; not server-confirmed                                                       | No confirmed server journal. Successful sync/reconciliation creates the server sale/payment sources once; unresolved conflicts remain unresolved |

For partial fulfillment, payment, return or refund, each source covers only its confirmed portion; aggregate constraints prevent over-fulfillment/refund and reused payload IDs. Retrying the same payload returns its existing result; changing it requires a new authorized business action. A cancellation after fulfillment uses return/correction workflows, not reservation release masquerading as a stock reversal. Fulfillment and advance application share a transaction where local; external cash/bank facts are recorded only on confirmation, not assumed atomic with provider systems. Order state is derived/validated against these facts, never used as an extra posting trigger.

**Consequences.** Add missing order/fulfillment/payment/clearing/advance source models and posting intents. Existing historical POS journals are not rewritten or automatically reposted. Historical COGS/inventory valuation remains unsupported; do not invent inventory-asset postings. This is an application posting design, not statutory accounting/tax certification; jurisdiction-specific recognition requirements remain a qualification dependency.

**Rejected options.** Deduction at both checkout and shipment; payment status derived from shipment; journal writes that mutate source records; one retry key regenerated on failure; posting revenue again at collection/completion; deleting local conflicts.

## D11 — Analytics, report semantics and cache

**Context.** Current dashboards/reports use UTC periods and some gross-before-return values. Storefront requires cross-channel reconciliation without weakening offline authorization.

**Decision.** Analytics fetch/refresh is online-only. V1 may retain the last successfully authorized aggregate response in process memory, labelled **Cached — as of [server timestamp]** during an outage. No persistent analytics cache in service workers, browser storage, SQLite, offline vaults or backups. Cache identity includes account, business, permission/scope fingerprint, currency, timezone and query. Clear on logout, expiry, explicit denial, account/business/access change, visibility/background lock or process restart; reconnect reauthorizes before refresh. No cached response authorizes mutations.

POS and online Reports use one server aggregation with business IANA timezone calendar boundaries (inclusive local start, exclusive next-day local end converted to UTC, including DST). Keep currencies separate. Net sales revenue is fulfilled/confirmed net merchandise revenue after discounts, excluding sales tax, **less accepted return/void net credits effective in the selected period**. Cash refunds settle those credits and must not subtract revenue twice. Pending orders, backorders, advances and transfers between clearing accounts are not revenue. Return-period reporting leaves original historical sale records intact; original-sale cohort metrics, if added, must be separately labelled. Order counts and payment totals are separate measures, not revenue proxies.

Dashboard/Reports/channel exports consume these same facts and definitions; show posting/reconciliation lag when journals are pending. Traffic/funnel values remain approximate and separate from financial amounts. Date labels/as-of values and timezone are explicit. Business-timezone changes must invalidate caches and disclose changed period groupings; they do not mutate original instants or closed journals.

**Consequences.** Shared aggregation, timezone migration/tests and new analytics surfaces remain future work. A display currency preference does not convert historical currency. Cached analytics cannot be restored after restart, and financial report totals cannot be calculated from event tracking or current product cost.

**Rejected options.** Persistent offline analytics in v1; UTC-only calendar grouping presented as local; summing currencies; counting payment and fulfillment as two revenues; subtracting both credit and refund; using tracking events for finance.

## Reconciliation, remaining decisions and changed documents

This milestone resolves the requested design contradictions; it does not close implementation gaps. The [gap analysis](../product/gap-analysis.md) remains a historical static audit, with a decision addendum. Current code still lacks the new metadata, refund queue extension, storefront, posting intents and shared net/local-time reports.

Remaining configuration/qualification dependencies, not silently chosen facts:

- Refund threshold values and eligible approvers per business/currency must be configured; D04 defines the fail-closed default and no-self-approval behavior.
- Production hostnames, approved media hosts, status-token lifetime, public rate-limit budgets, bot controls, telemetry retention/consent and customer-delivery provider must be configured and security-reviewed before storefront launch. No credentials or invented domains are recorded here.
- Tax/accounting recognition may depend on jurisdiction; D10/D11 state operational semantics, not legal certification. A conflicting jurisdictional requirement needs an explicit later decision, not a silent implementation exception. Business tax/currency/receipt-footer configuration details remain Milestone 2 work; named price lists are explicitly deferred.
- Base desktop CSP blocks remote images while `scripts/desktop-profile.mjs` permits all HTTPS images. Qualification requires a narrow trusted-media policy in the emitted artifact. No CSP code is changed here.
- Signing/notarization identities, supported OS/CPU/browser versions, update delivery and physical-device evidence remain release gates. Android/iOS qualification is separately tracked while parity remains mandatory.

Created: `docs/decisions/milestone-1.md`, `docs/release/qualification.md`.

Changed: `docs/security/authentication.md`, `docs/security/authorization.md`, `docs/offline/synchronization.md`, `docs/domain/inventory-and-finance.md`, `docs/product/gap-analysis.md`.

Checks for this milestone: documentation formatting, local links and record/checklist completeness only. No migration, test, build, installer, device run or CI workflow was executed/created. No feature code or commit.
