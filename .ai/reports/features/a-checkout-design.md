# Feature A — checkout and POS grid-card design

Status: **design only; approval pending**. No feature/test implementation, schema changes, dependencies or commits. Scope: web, Windows/macOS shared Tauri renderer, native mobile. Public storefront checkout is excluded.

## Instruction checkpoint

The `/feature` command says “Start with the design step and stop for my approval before implementing.” `00-rules.md` step 2 also says STOP. `a-checkout.md` instead says skip approval unless blocked. This design honors the explicit command approval boundary. There are also real decisions: all-credit shift requirements, a missing read-only command-status API, and visibility of credit exposure across warehouse scopes. Characterization additions will be the first implementation change after approval, before altering behavior.

## Existing implementation and gaps

| Area                | Evidence                                                                                                                          | Reuse / missing work                                                                                                                                                                                                                             |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Platform entry      | `apps/web/src/features/pos/PosPanel.tsx`, `PosCheckout.tsx`; `apps/mobile/src/pos/PosPanel.tsx`, `PosCheckout.tsx`, `PosCart.tsx` | Existing online/offline selection, retained drafts, warehouse locks and native cart dock. Keep them.                                                                                                                                             |
| Cart and quote      | `packages/api-client/src/pos-model.ts`, `cart-lines.ts`, `auto-quote.ts`, `pos-types.ts`                                          | Merges compatible lines; server quotes; generation/revision guards; separate quoting and mutation locks. Extend current model, no second checkout store.                                                                                         |
| Retry identity      | `packages/api-client/src/sales.ts`, `retryable-commands.ts`                                                                       | Stable key retained by path + canonical payload on failure, deleted after successful parsed response. Identity is memory-only and currently hidden from PosModel. No read-only lookup method.                                                    |
| Atomic checkout     | `apps/api/src/sales/checkout.service.ts`, `sales.controller.ts`; `apps/api/src/database/idempotency.ts`                           | Repricing/fingerprint check, ledger movements, cash/AR, audit and operation receipt in authorized transaction. Reuse without duplicating calculations.                                                                                           |
| Payment UI          | Web/native `pos/PaymentReview.tsx`; shared `checkout-form.ts`, `payment-allocation.ts`                                            | Cash/full-credit/split already work with exact minor strings. Missing guided steps, quick amounts, eligibility context and shift recovery.                                                                                                       |
| Credit              | `apps/api/src/customers/receivable-core.ts`, `customer-access.ts`, `customer-statements.ts`                                       | Server checks active customer, currency, credit hold/limit and authorized reason. Warehouse-scoped statement balance is not necessarily the same as credit-limit exposure. Do not sum paginated rows or show a scoped balance as total exposure. |
| Cash shift          | `apps/api/src/payments/shift-core.ts`, `cash-core.ts`; `packages/api-client/src/cash.ts`                                          | Cash requires current actor/warehouse/currency open shift with active terminal. Full credit currently does not call CashCore and does not require a shift.                                                                                       |
| Completion          | Web `PosCheckout.tsx`; native `PosCart.tsx`                                                                                       | Currently a text success message; model already clears sold lines and keeps receipt. Missing complete receipt UI, New sale, focus handling and actions.                                                                                          |
| Receipts            | Web/native `pos/ReceiptPanel.tsx`, `ReceiptFinance.tsx`; `packages/api-client/src/receipt-text.ts`; platform `receipt-printer.ts` | Existing safe receipt text, history, printing and corrections. Reuse formatting/printing; never create another payment on printing.                                                                                                              |
| Product grid        | Web/native `pos/ProductPicker.tsx`, `CartThumbnail.tsx`                                                                           | Title is a separate details button; card body is not the details target. Keep current filters/search/price/availability and authorized menus.                                                                                                    |
| Regression evidence | `.ai/reports/redesign/phase-10.md`, `tests/shell/workflow-refinement.spec.ts`                                                     | Rapid three-click quantity test previously yielded 2 instead of 4. Must diagnose/fix with a regression test; not bless this known defect as desired characterization.                                                                            |

## Recommended checkout UX

One retained workflow: **Cart → Review → Payment → Processing → Complete**. Use existing tokenized sections, FormSheet/SidePanel where needed and an always-reachable primary action. No new routes are needed for the steps.

- Review: full accessible line summary (name, SKU, unit, quantity, discounts), selected customer, net/tax/total from current server quote. Editing goes back to cart and invalidates review. Repricing never remounts cart or hides input controls.
- Payment: clear Cash / Customer credit / Split selection using existing controls. No active card/provider controls. Present amounts in the transaction currency with exact parsing to minor units; retain current wire fields. Default Cash applied = total; full-credit applied/tendered = zero; split lets user choose cash applied and tendered independently.
- Quick amounts: Exact amount plus currency-aware rounded-up suggestions for tendered cash; do not assume US banknote denominations for every currency. These only fill the field; authoritative change is in the confirmed receipt. Preserve `paymentAllocation` for exact provisional feedback.
- Credit panel: customer, eligibility/hold, limit, current exposure and projected exposure only when the caller may see those amounts. Server-produced eligibility is authoritative; label the read as a preview and revalidate at commit. Over-limit requires existing `customers.override` and a nonblank valid reason. No client permission bypass.
- Shift recovery: for cash-bearing sales, show missing/closed/ineligible shift with an Open shift action for `payments.write`; reuse existing open-shift form with terminal/currency/warehouse. Never create a shift automatically or discard the cart. No authorized terminal: explain and offer existing management navigation only if allowed.
- Processing: one explicit submission, disabled payment controls and navigation protections; status announcement. Never submit again from a rerender, key repeat, focus return or receipt print action.
- Complete: “Sale confirmed”, existing receipt ID (do not invent a sequential sale number), total, large server-confirmed change, cash/credit summary and receipt preview. Actions: New sale (primary), Print receipt, View sale; PDF/share only where supported. Printing failure leaves sale confirmed and retryable printing only.
- New sale clears the completed sale/customer/payment draft, preserves unrelated held carts and current warehouse, then focuses product search/scanner. Do not call the current broad `reset()` if it would erase held carts. Retain completion until explicit New sale; do not auto-focus search while the operator is using receipt actions.
- Desktop Enter confirms only from the valid, visible final payment form, never globally from barcode input, menus, dialogs or repeated/IME events. Esc returns to the prior step only when neither submitting nor uncertain; it never abandons an unknown sale.

## State machine and failure handling

| State                       | Allowed action / transition                                                                                                                                                                                                             |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Editing / quoting           | Edit lines/customer; latest valid server quote permits Review. Stale quote responses are discarded.                                                                                                                                     |
| Reviewing                   | Continue to Payment only while quote fingerprint remains current; any cart/price change requires renewed review.                                                                                                                        |
| Payment / readiness pending | Validate amounts and permissions, load shift/credit readiness. Cannot confirm while missing/stale/denied.                                                                                                                               |
| Submitting                  | Freeze exact payload and stable command ID; no second command.                                                                                                                                                                          |
| Definitive rejection        | Keep cart, show safe field/action guidance; refresh quote or reopen shift as required. Changed payload gets appropriate retry identity under existing rules.                                                                            |
| Uncertain                   | “We couldn't confirm this sale.” Lock edits; Check status is read-only. Never silently create a new sale/key.                                                                                                                           |
| Checking status             | Confirmed receipt → Complete; unavailable → remain uncertain; not found → explain “Not confirmed yet” and permit an explicit retry of exactly the original command. Missing receipt is not proof the first request cannot still commit. |
| Complete                    | Show immutable receipt. Print/share/view are independent of checkout; New sale starts a new intent.                                                                                                                                     |
| Offline local confirmation  | Existing encrypted granted cash-only outbox; “Saved locally, not yet confirmed.” Credit remains unavailable. Server sync confirmation is a separate event.                                                                              |

Map known public errors (`QUOTE_CHANGED`, `STOCK_UNAVAILABLE`, `CASH_SHIFT_REQUIRED`, `PAYMENT_ALLOCATION_INVALID`, currency/price errors) to targeted actions. Add narrowly allowlisted credit-limit/hold codes where current generic Conflict prevents guidance; never inspect arbitrary server exception strings. Preserve technical reference IDs as secondary support details. After an uncertain attempt, a later error must not unlock the cart as if the original definitely failed.

## Data model and API proposal

No new sales, payments, journal or ledger tables. Existing persisted sale/line/cash/AR/operation-receipt records remain authoritative. Extend presentation state in the shared model with step, frozen intent identity, status-read state and readiness; use current observable subscription and invalidation mechanisms.

1. Keep existing `POST /businesses/:businessId/pos/quotes` and `POST /businesses/:businessId/sales` payload semantics. Keep exact `cashAppliedMinor`, `cashReceivedMinor`, customer, override reason, quote fingerprint and stable UUID.
2. Add a read-only `GET /businesses/:businessId/pos/checkouts/:commandId/status` (under existing API prefix). Reauthorize membership, `sales.write`, original actor, current access fingerprint and warehouse scope before returning an allowlisted confirmed receipt. Query existing `operation_receipts` for `sale.checkout`, not the public sales search. Never expose another actor's command or raw stored JSON. A caller with checkout authority can recover their own checkout response; this is not general `sales.read` access.
3. Return a typed discriminated result: `confirmed` with validated receipt or `not_found`. Permission/auth failures use existing safe error envelope; network/5xx stays unresolved. Existing storage cannot reliably expose a durable `processing` state, so do not invent one. Read and retry must tolerate the original transaction still being in flight.
4. Extend retryable command infrastructure compatibly to expose the frozen checkout key and acknowledge a confirmed recovery. Existing callers keep their behavior. Receipt lookup must clear the corresponding retained key after success; otherwise a later identical legitimate sale could accidentally reuse the old key. Test this explicitly.
5. Add a read-only `POST /businesses/:businessId/pos/checkout-readiness` for validated cart/quote and cash-allocation intent. It computes shift eligibility and credit eligibility using existing domain services; writes nothing, does not reserve stock and does not guarantee checkout. Return currency, quote fingerprint, as-of and structured reasons/capabilities. Never use generic mutation retry for it. Final checkout repeats all validations in its transaction.
6. Credit privacy: existing full-customer exposure can exceed the visible warehouse statement. Recommend returning numeric exposure/limit/projection only to sufficiently scoped customer readers; restricted staff receive eligible/blocked and safe explanation, not hidden financial data. No new financial visibility permission by accident. If exact figures for every cashier are required, that needs an explicit scoped permission decision.
7. Keep online pending identity/payload memory-only for this feature, matching current security scope. Reload/session-lock recovery remains sale-history review; do not put customer data or long-lived sensitive payloads in localStorage. Durable online-uncertainty recovery would require a separate approved encrypted-storage design. Offline already has its own durable vault/outbox; don't merge an unknown online request into a new offline sale.

No migration is expected. If implementation discovers a schema requirement, stop and propose a forward migration/backfill plus data-preserving rollback before changing schema. Do not edit applied migrations or resolve the unrelated Phase 10 downgrade failure here.

## Permissions and concurrency

- `sales.write`: discover POS items, quote and submit; own-command status/readiness remains tenant and warehouse scoped.
- `payments.write`: cash recording and shift open/close under existing service guards. `payments.read`: existing shift listings. Avoid requiring broad list access merely to return a minimal readiness flag.
- `customers.read`: customer selection and permitted customer details; do not broaden statement scope. `customers.override`: existing audited override. `customers.credit` manages credit policy; do not incorrectly add it as a new prerequisite to ordinary credit checkout.
- `sales.read`: general View sale/history. Hide that action if missing while keeping the current transaction's confirmation available.
- Product writes/manage listing retain existing authorization. Sold-out/locked Add remains disabled but the read-only details target works.
- Owner/manager/cashier/custom/viewer tests use permission sets and scopes, not hardcoded role labels. Viewer cannot checkout; cashier may use authorized credit but cannot override by default.
- Reuse organization transaction serialization, ledger locking, credit validation and idempotent response record. Concurrent duplicate requests and status/retry races must post once. Readiness never replaces commit-time checks.

## Grid-card design, all platforms

Web/Tauri: a noninteractive card container with one accessible sibling details button whose pseudo-element stretches over the card; heading becomes ordinary text. Raised Add/menu siblings remain separate focusable controls, not children of the details button. Enter/Space on details opens the existing drawer. Focus ring outlines the card; no scaling animation. Preserve sold-out read access, disabled purchase actions and exact formatted price on Add.

Native: sibling Pressable details region and Action/menu touch targets, with an overlay/stretched hit area only if touch routing and accessibility stay reliable. No nested actionable parent that swallows Add. Minimum native target follows existing 48px convention (exceeds requested 44px). Open SidePanel, restore focus/accessibility context on dismissal. List view remains unchanged.

Reuse `Button`, `Input`, `FormField`, `StatusBadge`, `AsyncState`, `FormSheet`, `Hint`, `RowActions`, `MoneyValue` and their native equivalents. New checkout-specific Review/Payment/Completion stay in the POS feature. Any extraction shared beyond POS gets an actual showcase example and tests. Respect account theme/density/controlSize/radius/font/text/icon/motion/effects choices and 320px layouts.

## Platform receipt actions

- Web: reuse safe print iframe and browser/OS “Save as PDF” if available. Do not promise direct PDF download or silent printer delivery; no new PDF library.
- Tauri: current renderer uses the print adapter; qualify actual WKWebView/WebView2 printing before exposing an unsupported PDF capability. Capability-specific guidance/disabled actions are honest fallbacks; native integration additions require separate review if existing adapter cannot support the host.
- Native: existing `expo-print`, `expo-sharing`, `expo-file-system` are installed. Extend the existing receipt adapter for PDF creation/share using those dependencies, escape receipt content, capability-check sharing, keep temporary files app-private and clean them up safely. Do not mark a sale failed when sharing is cancelled.
- Real Windows/macOS printing/scanners and native emulator/device checks remain mandatory; build/export alone cannot satisfy acceptance.

## Options considered and recommendations

| Decision                    | Recommended                                                                   | Rejected / tradeoff                                                                                                                                  |
| --------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shift for full-credit sales | Preserve current behavior: require shift only when cash applied > 0           | Requiring a shift for all-credit is a business-rule change; feature text asks “open shift required” without this distinction. Needs explicit choice. |
| Recovery                    | Own-command read-only status + same-ID explicit retry                         | Retrying POST under a “Check status” label performs a write; new key on timeout risks duplicates.                                                    |
| Credit preview              | Minimal readiness endpoint reusing domain logic and scoped numeric disclosure | Deriving global exposure from paginated/scoped statements gives wrong eligibility or leaks other warehouses.                                         |
| Checkout architecture       | Extend existing PosModel/clients and compose native/web feature screens       | New payment engine/state library or client-side money authority duplicates working code.                                                             |
| PDF                         | Existing print/save and native installed adapters                             | New PDF library or fake “download” that exports text as PDF.                                                                                         |
| Completion navigation       | Explicit New sale, preserving held carts                                      | Broad reset destroys unrelated drafts; automatic navigation interrupts receipt actions.                                                              |

## Implementation order after approval

1. Extend characterization first: current request paths/payloads, line identity/merging, late quote races/invalidation, cash/credit/split exactness, busy guard, retries/key lifecycle, reset/hold/resume, receipt effects. Existing tests remain passing; desired bug fixes receive separately named regressions.
2. Implement scoped status/readiness contracts and service tests; preserve original checkout transaction and posting. Add status concurrency/isolation/hash tests and deterministic mocks.
3. Extend current model with reviewed steps/recovery; fix rapid increments against latest model quantity with web/native regression coverage, without binary-float quantities.
4. Compose review/payment/completion and shift recovery on web/Tauri/native; then grid hit targets and keyboard/focus flow. No unrelated catalog/list redesign.
5. Add demo scenarios: cash/full-credit/split success, missing/closed shift, credit hold/limit/override, stale quote, insufficient stock, permission denial, offline local, lost response, confirmed/not-found/unavailable status, print/share failure.
6. Verify shared model/unit, real DB API concurrency/rollback/isolation, web/native components, Playwright cash/credit/split/status/card flows, preferences/touch/accessibility, parity/design checks, lint/typecheck and builds. Qualify runtime platforms honestly; retain hardware blockers.
7. Update existing four canonical guides only for accepted new rules and append implementation evidence to this feature report. No documentation consolidation or other features in this task.

## Approval requested

Approve the recommended design, especially (1) cash-only shift requirement versus a new all-sale requirement, (2) the two read-only backend capabilities and scoped credit disclosure, and (3) existing print/PDF capability boundaries. Online reload recovery stays limited to existing history review; approve a separate durable recovery design only if that is required now.

## Verification of this design stage

Source and existing tests were inspected; no feature behavior has been implemented. Existing targeted model-test results are recorded below after execution. No build, migration, real-DB or device qualification is claimed for a Markdown design change.

Targeted baseline command: `npx vitest run packages/api-client/src/pos-model.test.ts packages/api-client/src/pos-characterization.test.ts packages/api-client/src/cart-lines.test.ts packages/api-client/src/payment-allocation.test.ts packages/api-client/src/retryable-commands.test.ts packages/api-client/src/held-carts.test.ts --maxWorkers=2` — **6 files / 20 tests passed** (657 ms). These existing tests do not prove the proposed additions or negate the known browser rapid-increment regression. Design Markdown formatted and checked with Prettier.
