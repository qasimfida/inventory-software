# Development data, operational costs, import and recovery

## Local accounts and representative transactions

The guarded local seed owns eight fixture accounts: `superadmin@inv.com`, `admin@inv.com`, `owner@inv.com`, `manager@inv.com`, `cashier@inv.com`, `inventory@inv.com`, `accountant@inv.com`, and `viewer@inv.com`. Their public development password is `asdF@123`. Admin is the existing owner-level fixture; superadmin retains platform administration. Production password requirements are unchanged.

Run `npm run db:seed:dev -- --reset-accounts` to upgrade recognized fixture identities and revoke their old sessions/recovery/offline grants. Unrelated identities are never renamed or reset. Existing pending offline work must be reconciled before resetting its account. Seeds refuse production/nonlocal databases and the deployable API excludes seed code.

With the development API running, run `npm run db:seed:showcase` for businesses, stores, warehouses, catalog and stock, then `npm run db:seed:transactions` for suppliers, purchase orders, partial receipts, supplier returns/invoices/payments, customers, cash shifts, sales/receipts/returns, completed transfers, draft stock counts, salary obligations/payments and expenses. The transaction seed retains exact request payloads and IDs in ignored `.local/transaction-fixtures/`. Repeated successful runs reuse checkpoints; an uncertain unprotected creation requires operator review. Do not remove checkpoints to force a retry. Each seeded warehouse is reconciled against its ledger.

## Staff, salaries and expenses

Web/desktop: Settings → Staff & expenses (`/settings/staff`). Native: the equivalent settings tab. Existing Team/Users & roles continues to own account invitations, permissions and access scopes; a staff record alone grants no login or permission.

Owner-level `users.write` or platform administration is required by the backend. Store-scoped memberships are denied. Staff can belong to a store or the whole business and carry a base salary, currency, employee code and active/inactive status. Editing uses optimistic versions. Salary periods cannot overlap for one employee. Expenses can be business-wide or store-specific.

Obligations and payments are append-only, tenant scoped and audited. Stable command IDs protect retried salary/expense/payment requests; payments cannot exceed the remaining amount. Detail drawers show payment references, dates, amounts and outstanding balances. Use currency minor units in explicitly labelled financial inputs. Search is delayed and previous reads are cancelled; results are paged in batches of 25.

This is an operational cost ledger: no payroll tax, withholding, payslip delivery, bank transfer, cash-till withdrawal, or automatic statutory journal posting. Salary payments represent payments already made outside POS. Do not also enter the same payment into a till without reconciling its source.

## Bulk products and opening inventory

Catalog → Bulk import is available to users with business-wide product-write access. Opening quantities additionally require stock-write access. Web/Tauri uses the file picker/download; native uses the platform document picker and share sheet.

Download the CSV template, replace its example row, and upload CSV or an Excel `.xlsx` file with the same first-sheet columns:

`sku,name,description,price,currency,quantity`

Price is a decimal selling price before tax; quantity is optional opening stock (use zero for catalog-only import). Products use base unit Each. Select an authorized warehouse for nonzero quantities. Preview before confirming. The backend validates all rows and creates products, prices and ledger movements atomically. Any duplicate SKU or invalid row rolls back the whole batch; existing records are never overwritten. This flow does not bulk-edit existing stock balances or create supplier receipts.

Limits: 100 products, 1 MiB file, six columns, first worksheet, values only. Formula cells, entity declarations and oversized spreadsheets are rejected. Legacy `.xls`, macro execution, linked workbooks and formula evaluation are unsupported. XLSX parsing is loaded only when needed. Repeat a failed/uncertain import from the same open form to retain its command ID; after reload, inspect the catalog before retrying.

## Cached POS and recovery

POS offers **Use cached products** with the same product/cart presentation and a native pinned cart drawer. Preparation requires online authentication, an enabled offline policy, an open shift and a bounded grant. Unlock the device vault with its separate passphrase. Cached prices/permissions remain fixed to the grant until pending operations resolve and permission is renewed. Unit/discount options remain available from the cached product name; cart lines show the selected unit as text.

Drafts and outbox entries are encrypted and survive restart. Synchronization retains operation IDs, rechecks identity and permissions, and retries through the existing sync engine. Rejected/conflicted sales require review; locally saved does not mean server-confirmed. Expired grants lock the cart. Cached cash checkout is supported; credit, purchasing, staff costs, payments and arbitrary inventory edits are not queued offline.

Device & Offline exposes encrypted vault export/restore, preserving pending IDs and expiry. Restore requires an unused vault name and the original passphrase. Use only one recovered copy for pending work. Server backup/restore and separate remote/local-network desktop package commands are documented in [release operations](release-operations.md). A local-network installation needs one deployed API/PostgreSQL server; it does not replicate to a separate remote database.

See [verification evidence](../qa/operations-expansion/report.md) for actual platform coverage and unresolved checks.
