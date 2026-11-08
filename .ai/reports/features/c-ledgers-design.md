# Feature C — Account ledgers design

Status: design proposal, awaiting approval. Inspected 7 November 2026. No implementation authorized by this report.

## Existing implementation and gaps

| Area                 | Evidence                                                                                                                                | Reuse and required addition                                                                                                                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chart and contracts  | `packages/contracts/src/accounting.ts`                                                                                                  | Eight fixed system account codes; no editable chart. Add account records without changing existing account meanings.                                                                                              |
| Journals and periods | `apps/api/src/accounting/accounting.service.ts`, `accounting.repository.ts`; `apps/api/migrations/1794600000000_trading_accounting.sql` | Balanced immutable journals, open-period checks, source uniqueness, reversal linkage, audit and idempotency exist. Missing ledger queries, party/store dimensions and cursor pagination.                          |
| Source posting       | `apps/api/src/accounting/sources.ts`                                                                                                    | Sale, return, cash payment/refund, supplier invoice/credit/settlement mappings exist. Posting is a separate command with a pending-source list; transaction occurrence does not prove journal inclusion.          |
| Customer khata       | `apps/api/src/customers/customer-statements.ts`, `receivable-core.ts`                                                                   | Receivables, allocations, credits, credit limits and warehouse scope exist. Statements are separate paginated collections, not a chronological journal-derived statement with opening/running balances and aging. |
| Customer collection  | `apps/api/src/payments/customer-payments.ts`                                                                                            | Existing collection allocates to one specified receivable and records cash transactionally. Multi-sale/oldest-first allocation requires an atomic orchestration, not repeated independent client requests.        |
| Supplier ledger      | `apps/api/src/purchasing/payable.repository.ts`, `payable.service.ts`; `packages/api-client/src/payables.ts`                            | Invoice balances, credits, cash settlements/refunds and warehouse checks exist. Need chronological journal view, aging and multi-invoice allocation. Negative outstanding represents supplier credit, not zero.   |
| Cash book            | `apps/api/src/payments/shift-service.ts`, `shift-core.ts`                                                                               | Shift opening/count/adjustment and expected cash exist. These are not all accounting source types. No complete manual-bank book is provided by the accounting source mappings.                                    |
| Approvals            | `apps/api/src/notifications/approval-queue.ts`                                                                                          | Queue currently assembles purchase, transfer and count items. Financial adjustments need a new typed approval item and execution rules; a generic journal approval engine does not already exist.                 |
| Web and desktop      | `apps/web/src/features/accounting/AccountingPanel.tsx`, `AccountingTable.tsx`, `JournalDetails.tsx`, `AccountingSummary.tsx`            | Existing Accounting screen shows periods, journals, pending sources and all-time trial totals. Tauri consumes the web frontend. Extend this screen rather than create a parallel finance application.             |
| Native mobile        | `apps/mobile/src/accounting/AccountingPanel.tsx`, `AccountingTable.tsx`, `JournalDetails.tsx`, `AccountingSummary.tsx`                  | Native accounting equivalents exist. Add the same ledger queries/workflows with native presentation, not DOM imports.                                                                                             |
| Shared coordination  | `packages/api-client/src/accounting-forms.ts`, `stage6.ts`, `payable-forms.ts`                                                          | Reuse forms, transport, money conventions and permission models. Current manual-journal form permits general balanced entries.                                                                                    |
| Print/export         | `apps/web/src/platform/receipt-printer.ts`, `apps/mobile/src/platform/receipt-printer.ts`; Feature B design                             | Receipt adapters exist; a production cross-platform statement PDF renderer is not established by them. Feature B's central PDF proposal remains unimplemented and approval-dependent.                             |

Existing controller route: `businesses/:businessId/accounting`, with `periods`, `journals`, `sources` and reversal commands (`apps/api/src/accounting/accounting.controller.ts`). The proposed Ledgers tabs are additions within Accounting, not evidence of existing routes.

## Decisions requested

1. **Chart:** seed and lock the eight system accounts. Permit audited custom account creation, renaming and deactivation. Code/type can change only before first use; used accounts retain historical identity. No deletion of used accounts. Inactive accounts reject new ordinary postings but remain visible and available to authorized exact reversals. Reject duplicate business account codes.
2. **Manual journals:** recommend v1 opening balances and approved adjustments only. This restricts the existing general manual-journal capability and therefore needs explicit approval. Never post directly to AR/AP controls without the corresponding party/source adjustment. Preserve historical general entries and surface exceptions rather than manufacture subledger records.
3. **Aging:** recommend five unambiguous columns: Current (not overdue), 1–30, 31–60, 61–90 and 91+ overdue days. This clarifies the prompt's overlapping “current, 30, 60, 90+” labels. Age remaining invoice amounts at the selected business-local as-of date; show unapplied credits separately, never erase overdue invoices by arbitrary netting.
4. **Statements:** chronological, currency-specific opening, debit, credit and running balance, followed by closing, aging and reconciliation status. Include business/party identity, date/timezone, readable source reference, generation/as-of time and page numbering. Offer screen, CSV and printable/PDF versions of the same authorized dataset.
5. **Posting and reconciliation:** preserve explicit source posting initially. A ledger displays posted facts; operational unpaid amounts and pending/unattributed entries are separately labeled. “Reconciled” is allowed only when source coverage and control checks pass. Automatic posting is a separate decision; requiring an open accounting period during every existing checkout would change business behavior and is not recommended silently.
6. **Manual bank:** include a genuinely confirmed bank-payment path, accounts and allocation/source mappings; payment instructions or an uploaded reference alone are not confirmation. No provider integration, imported bank feeds or automatic reconciliation in v1. If this extension is deferred, Cash and bank must explicitly identify bank support as unavailable.
7. **PDF:** align with Feature B's shared document model. Approve its production renderer/deployment dependency before promising identical downloadable PDFs; otherwise ship platform printing only and record PDF parity as incomplete.

## Integrity and reconciliation contract

- Journals remain the sole source for displayed accounting balances. Existing receivable/payable records continue enforcing operational credit/settlement rules; do not replace those rules with potentially incomplete posted journals.
- For account and currency: closing = opening + debits − credits. Display normal-balance semantics clearly (customer owes versus supplier owed); never sum currencies. Trial balance retains debit/credit signs.
- Sale posts receivable/revenue/tax once; cash receipt posts cash/receivable once. Returns and cash refunds are separate events. Supplier invoice, credit and settlement likewise retain separate immutable sources.
- Reconcile AR control 1100 against attributable customer balances plus explicitly identified non-customer settlement balances. Cash sales also traverse 1100; do not assume every line has a customer or represents credit sales.
- Reconcile AP control 2000 against attributable supplier balances. Compare journal and operational balances only over identical currency, cutoff, scope and source coverage. Report pending sources, unmatched controls, legacy manual entries and reversal mismatches as distinct differences.
- A journal reversal alone does not undo a sale, payment, inventory movement or customer allocation. Source corrections must invoke the authorized compensating source workflow and corresponding accounting posting, with one effect per source. Never allow a generic control-account reversal to masquerade as a reconciled customer adjustment.
- Cash shift opening is a physical starting count, not new cash income each shift. Counts/discrepancies compare tills and book cash; only explicit authorized adjustments create new journal effects. Do not journal every repeated opening count.
- Bank collection confirmation and bank supplier payment each create their source, allocations and balanced posting atomically in an open period. Pending instructions have no cash effect. Reversals restore allocations through linked compensating records, not deletion.
- Period closure must reject unposted required sources and unresolved posting work. Existing close checks are reused and extended for approved new source types.

## Data model and migration proposal

- Add tenant-owned chart records keyed by stable account identity/code, with type, name, system flag, state and audited version. Seed the existing eight accounts. Replace fixed-code validation/checks with tenant-safe account lookup/FKs; preserve original journal line values.
- Add immutable journal attribution metadata alongside existing immutable journals: line/source reference, party kind/id where proven, store/warehouse where proven and provenance. Do not update historical monetary evidence to attach guesses.
- Backfill attribution by deterministic joins to authoritative sources. Mark ambiguous or missing lineage unresolved. Business-wide reconciliation can show these exceptions; scoped users must not receive unassigned lines or business-wide totals.
- Add a committed posting sequence under a business-scoped transaction lock to support stable snapshots. Backfill legacy ordering deterministically during migration, then assign all new postings through the same mechanism. Do not use an ordinary sequence MAX as proof that lower sequence transactions have committed.
- Add typed adjustment requests (draft, pending approval, approved, posted, rejected/cancelled), immutable payload/version, requester, approver and execution reference. Approval binds the exact amount/accounts/party/scope/currency; editing invalidates approval. No self-approval, and posting rechecks access and period status.
- Reuse payment, receipt, allocation, settlement and idempotency storage where possible. Extend with a parent collection/disbursement command and explicit allocation links only where existing records cannot represent one payment across invoices. Never post both parent and child amounts as separate economic effects.
- Bank accounts reference chart accounts and currency; confirmed transfer sources need durable evidence/reference, actor and audit metadata. No payment secrets or provider credentials.
- Forward migrations preserve records and constraints. Rollout is additive first, backfill with reconciliation evidence, then enable reads/commands. Operational rollback disables new commands/UI and uses compatible prior reads; do not drop new accounts, allocations, journals or evidence after use. No automatic balancing plugs.

## API and permissions proposal

Paths below are proposed, not implemented, under `businesses/:businessId/accounting`.

| Surface                                              | Contract                                                                                                                                 |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `GET/POST accounts`, `PATCH accounts/:id`            | Bounded chart list and validated audited changes with expected version.                                                                  |
| `GET ledgers/accounts/:id`                           | Date range, currency, authorized scope, source filters, cursor; opening/closing, rows and next cursor.                                   |
| `GET ledgers/customers/:id`, `ledgers/suppliers/:id` | Unified statement, aging, operational comparison and reconciliation status; customer credit summary only with permission.                |
| `GET ledgers/cash-bank`, `reconciliation`            | Daily account summaries and explicit reconciliation exceptions, with bounded drill-down.                                                 |
| `POST collections`, `disbursements`                  | Stable command ID, party, currency, method, amount and allocation choice; server computes and locks eligible outstanding records.        |
| `POST adjustments` and approval actions              | Typed draft/approval/execution state machine; no generic bypass of control accounts.                                                     |
| Statement export/print                               | Same filters, scope, currency and snapshot as the screen, server-side bounded generation; CSV formula protection and safe document text. |

- Reuse existing authenticated context, scope runner, SchemaPipe, transactional idempotency and source uniqueness. Client-supplied business/party/store IDs never authorize access.
- Proposed capabilities: `accounting.read`, `accounting.manage`, `accounting.adjust`, `accounting.approve`, `accounting.export`; collection still requires existing payment/cash/party capabilities. Exact names must be registered in shared permissions and role defaults during implementation.
- Owner/admin receive business-authorized defaults; managers receive explicitly assigned scoped reads/collections; cashiers gain no broad accounting access. Super-admin status alone must not expose tenant statements without the existing tenant-access mechanism.
- Existing accountingAccess rejects store scope and requires multiple finance read permissions. Preserve that legacy endpoint boundary; introduce explicit scoped ledger checks only after reliable attribution exists. Party access cannot widen warehouse/store visibility, including opening balances, aging and exports.
- All mutation IDs remain stable on protected retries; mismatched payload reuse fails. Export/print and source links recheck authorization; inaccessible source details do not leak via labels or totals.

## Payment allocation and concurrency

- Oldest first means due date, then issue date and stable ID; selected invoices use explicit allocations. Both operate only on eligible authorized records in the same business, party and currency.
- Lock invoice/receivable rows in deterministic order, recalculate outstanding, validate total allocations equals received/paid amount and reject overpayment in v1. No invented on-account balance.
- Record one economic receipt/disbursement and its allocations transactionally; source journal effects must sum to that amount exactly. Reuse existing cash shift requirements and evidence, not an unrelated cash ledger.
- Concurrent collection, refund, return and allocation must serialize without over-allocation. Lost responses recover using the original command identity/status; generic mutations do not auto-retry.
- Available credit uses the existing exposure rule and whole-customer scope permitted by that rule. A filtered statement balance must not be relabeled as total available credit.

## Time, performance and paging

- Existing sources derive UTC posting dates and periods are date-based. Preserve historical posted_on and period locks. Business-local date filters apply to events with real timestamps; legacy date-only journals retain explicit book-date semantics. Do not invent midnight timestamps or rewrite closed periods.
- Establish a documented cutover for newly posted business-local book dates, with source-pending/period-close queries using the same basis. Historical statement/reconciliation views disclose legacy date boundaries until evidence supports migration. This is a prerequisite for claiming full business-timezone parity.
- Cursor binds query, business/scope, currency, order, timezone and committed posting watermark. Order rows by posting date, journal ID and line ID; backdated new postings appear only after refresh into a new snapshot.
- Compute opening over all qualifying rows before the date range, then cumulative movements across the full filtered sequence before slicing a page (or a validated prefix sum plus page window). Never reset the running balance at each page or rely on client totals.
- Index account lines by business/account/journal/line, journals by business/date/order and attribution by business/party/scope/journal; add due-date indexes for aging. Confirm plans against realistic data before finalizing indexes.
- Start with SQL aggregates/windows over immutable data, not a parallel balance cache. Bounded export streams the same snapshot with row/time limits and cancellation. If measured volume requires snapshots later, they are rebuildable derived projections with reconciliation, not authoritative balances.

## Platform UX and states

- Accounting > Ledgers: Accounts, Customers, Suppliers, Cash and bank tabs. Reuse existing tab, collection toolbar, date controls, badges, money formatting and drawer primitives. Show one currency selector, scope and as-of marker; breadcrumb links retain filters on return.
- Opening/closing and reconciliation summary precede compact chronological rows. Source links open existing authorized details; payment and adjustment drawers expose server errors at fields and preserve drafts after recoverable failures.
- Native uses equivalent tabs/lists/detail screens and native print/share adapters; Tauri uses shared web UI with desktop file/print adapters. Desktop printing and native statement rendering still require runtime testing.
- Honor theme, font, density, radius, animation and accessibility preferences. Keyboard navigation, focus restoration, numeric alignment, accessible table headers and mobile touch targets remain mandatory.
- Define loading, empty chart, empty statement, no filter results, denied, failed/retry, offline, pending posting, mismatch, success, confirmation, validation and unsaved-change states. Distinguish “no activity” from a nonzero opening balance.
- Online-only financial reads/commands. A permitted transient in-memory statement is labeled as-of and cleared on scope/auth expiry/lock; no SQLite/IndexedDB/vault financial cache and no offline payment queue.
- Fixtures/showcase cover mixed currencies, overdue/unapplied credits, pending source, partial payment, reversal, long names, denied store scope and large statement. No mock records are used in live statements.

## Options rejected and conflicts

- Separate balance tables or client-computed totals: violate journal authority and create divergent accounting.
- Treat all existing source transactions as posted: hides missing journals and gives false reconciliation.
- Automatically post everything synchronously without a rollout decision: changes checkout/period prerequisites and can block existing operations.
- General GL adjustments against AR/AP controls: bypass existing allocations and credit rules. Restrict new commands; preserve and report legacy exceptions.
- Reinterpret historic UTC dates as business-local dates: changes period membership without evidence. Use explicit cutover and honest historical limitations.
- Persist financial statements for offline use: conflicts with SEC-031/SEC-044; retain online-only authority and bounded in-memory as-of views.
- Assume the approval queue or Feature B PDF renderer already supports journals/statements: neither capability is established. Extend the queue explicitly and gate new renderer dependencies on approval.
- Account-code rename after posting or destructive rollback: breaks historical references/evidence. Use stable identities and forward corrective migrations.

## Implementation order after approval

1. **L — Integrity foundation:** chart migration, attribution/backfill exceptions, posting snapshot sequence, permission model and reconciliation tests. Resolve historical coverage/timezone boundaries first.
2. **M — Read ledgers:** account/party views, opening/running balances, aging, scoped cursor/export queries and UI across all platforms.
3. **L — Authorized commands:** atomic multi-invoice allocation, bank confirmation, opening/adjustment approvals and compensating corrections; retain existing cash behavior.
4. **M — Statements and qualification:** approved print/PDF path, fixtures/showcase, accessible states, large-data benchmarks and web/Windows/macOS/native runtime evidence.

Acceptance tests must cover exact minor-unit arithmetic, all currency/type signs, opening and cursor continuity, backdated inserts during paging, concurrent allocations, duplicate requests, reversals, closed periods, DST boundaries, tenant/store/party denial, export parity and control reconciliation. Include genuine PostgreSQL constraints/rollback tests, not mocks alone. Device gates remain distinct from code parity.

## Verification in this design step

- Ran `npx vitest run apps/api/src/accounting/sources.test.ts packages/api-client/src/accounting-characterization.test.ts packages/api-client/src/payables-characterization.test.ts packages/api-client/src/payables.test.ts --maxWorkers=2`: **4 files, 22 tests passed**.
- These are existing foundation tests, not proof of the proposed ledgers or allocation extensions.
- No feature code, schema, dependencies or canonical rules changed. No database migration/integration run, builds, full lint/typecheck, browser, Windows/macOS or native runtime qualification in this documentation-only step.
- Stop for design approval as required by `.ai/prompts/features/c-ledgers.md` and `00-rules.md`. Approval should explicitly settle manual-journal restrictions, aging labels, staged posting/reconciliation, bank scope and PDF dependency choice.
