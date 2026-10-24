Read AGENTS.md and docs/product/gap-analysis.md. Milestone 1 only: decisions and documentation, no feature code.

Launch-gated platforms: web, Windows, macOS. All features must still exist on mobile (parity rule in AGENTS.md).

Write docs/decisions/milestone-1.md with one record per decision (context, decision, consequences, rejected options):
1. PO "sent" state: keep `ordered`, add sentAt and method, relabel UI "Ordered / Sent". No new state.
2. Price lists: no named price lists for now. The storefront follows the existing price resolver (default store price).
3. Adjustment reason codes: fixed built-in list plus optional custom codes per business.
4. Refund approvals: threshold-based through the existing approval queue.
5. Undo: only as authorized compensating transactions, never deletion.
6. Public API: separate published-only projection, narrow guest commands, event ingestion, opaque status tokens, anti-abuse limits.
7. Sellable stock = on hand − reserved − damaged − buffer. Backorder flag means an identified backorder, never a fake reservation.
8. Readiness rules split in two: content/price rules (failures auto-delist) and availability rules (zero stock stays active as "Sold out" or hidden per setting).
9. Storefront v1 payments: pickup, cash on delivery, manual bank transfer with a clearing account. COD stays unpaid until collection is confirmed. Card providers stay disabled.
10. Order, payment and fulfillment are separate events. State exactly when stock, cash and journal effects post, once each.
11. Analytics: online-only, in-memory cache with an "as of" label for v1. Reports use the business timezone, net of returns, from one shared aggregation for POS and online.

Create docs/release/qualification.md (new file): a checklist per platform: web, Windows, macOS (launch-gated) and Android, iOS (feature parity required, qualification status tracked separately). Cover build/installer, runtime smoke test, offline vault storage, printing, deep links/protocol handler, remote image CSP, updates, and what needs real hardware. Include a CI plan to build web, Windows and macOS artifacts.

Then reconcile conflicting statements in docs/security/*.md, docs/offline/synchronization.md and docs/domain/inventory-and-finance.md. List every doc created or changed and any conflict you couldn't resolve. Don't commit. Stop after writing.