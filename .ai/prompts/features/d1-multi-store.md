Bills with items from several stores (branches) of ONE business, on all platforms. Design first, then stop.

Inspect: store and warehouse model, sale and checkout services, cash shifts, tax and receipt numbering per store, permissions with store scope, POS cart.

DESIGN STEP decisions (options with a recommendation):
- Recommended: a combined bill (parent) with one child sale per store. Revenue, tax, receipt numbers and stock come from the child's store; cash is collected into the collecting store's open shift, with inter-store settlement entries (needs the ledger work, so coordinate with c).
- Alternative: revenue stays with the selling store, and lines are fulfilled from other warehouses. Compare effects on branch reports, returns and tax.

Build (after approval):
- Data: Bill group (number, customer, totals, collecting store, status), links to child sales, per-line store and warehouse, payment allocation.
- Checkout: one server transaction creates all child sales and payment allocations; idempotent; all or nothing; per-store permission checks.
- POS: store badge on products and cart lines, cart grouped by store with subtotals, a scope selector (this store, my stores), combined receipt plus per-store receipts.
- Returns and voids per child sale, shown under the parent. Reports unchanged per store.
- Online only in v1 (explain offline behavior to the user).

Acceptance: a sale across two Gilgit branches posts correct stock, cash, tax and receipts per branch; failure leaves no partial data; permissions and audit tested on all platforms.