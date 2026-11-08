Build account ledgers as views over the existing double-entry journals. No parallel balances. Design first, then stop.

Inspect: accounting module (journals, periods, trial views, source posting), customer credit and statements, payables subledger, cash shifts, chart of accounts, existing reports and export.

DESIGN STEP decisions: chart of accounts editing rules (system accounts locked); whether manual journals are in v1 (recommend: only opening balances and approved adjustments); aging buckets; statement format; reconciliation rules.

Scope:
1. Chart of accounts: list, create and edit non-system accounts (code, name, type), deactivate, with guardrails.
2. Account ledger: per account, date range, opening balance, debit and credit, running balance, source document links (sale, purchase, payment, adjustment), filters, cursor pagination, export. Respect period locks and currency separation (never sum currencies).
3. Customer ledger (khata): statement with opening balance, sales, returns, payments received, adjustments, running balance, aging (current, 30, 60, 90+), credit limit and available credit, record payment received with allocation (oldest first or chosen sales), printable statement.
4. Supplier ledger: same shape on the payables subledger, with payments made.
5. Cash and bank book: cash and manual-bank-transfer accounts with daily summaries.
6. Integrity: every balance derives from immutable journals; customer and supplier balances reconcile to their control accounts (add a reconciliation check and tests); corrections only by reversing entries; business-timezone boundaries; permissions scoped by business, store and party.
7. UI: Accounting > Ledgers with tabs Accounts, Customers, Suppliers, Cash and bank; drill-down and breadcrumbs; empty, loading, error and permission states; reuse the statement print and PDF approach.
8. Performance: indexes, window-function or snapshot strategy for running balances, tests with large ledgers.

Acceptance: ledger and statement balances equal journal totals and subledger balances; payments allocate correctly; all platforms covered; reconciliation tests pass.