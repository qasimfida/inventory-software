# Phase 6 sales-cash coverage

Web/Tauri owners: `apps/web/src/features/pos/`; native equivalents: `apps/mobile/src/pos/`. Shared definitions remain `packages/api-client/src/cash-forms.ts`, `return-forms.ts`, `cash.ts`, `sales.ts`, `receipt-text.ts`.

| Route / surface | Presentation / ownership | Preserved behavior and evidence |
| --- | --- | --- |
| `/sales` collection | ReceiptPanel; shared collection/search/list-grid/export/pagination | Same warehouse scope, 250ms debounce/cancellation, bounded 25-row paging, receipt selection and date/currency formatting. Shared retry/loading feedback; page title now matches shell. |
| Receipt details | Existing FormSheet/SidePanel and exact receiptText | Original lines/tax/total/tender/change/payments/footer retained. Natural-height web content prevents clipping. No extra detail request. Browser opens receipt in 12 theme/viewport cases. |
| Print/reprint | Existing platform printReceipt adapter | Same literal receiptText input and print-failure feedback. Web/native viewer tests assert unchanged print input and no API write; existing web printer adapter test passes. Browser does not trigger a physical print. |
| Settlement evidence | New feature-local ReceiptFinance | Exact reconciled flag/outstanding/due date and original currency; separate return credit/cash refund and confirmed refund tables. Explicit empty histories. Tests cover reconciliation warning and non-empty synthetic return/refund data. |
| Selected-line return | Existing returnForms + CommandForm | Existing eligible remaining quantity, reason/disposition and validation. Browser opens nested form and verifies initial quantity. No refund submitted. |
| Full remaining return | Existing returnForms | Exact remaining quantity pinned (2.000001 − 0.250001 = 1.75), no float conversion. Same server command, disposition and stable identity. |
| Void | Existing permission/state-specific form | No corrections for returned/voided sales; existing no-prior-return void gate retained. Browser opens void form at 1440px in both themes. No void posted. |
| Exchange | Existing selected-line correction choice + replacement POS link | Still refund/return first, then separate replacement checkout in same warehouse/customer scope. No combined financial event invented. POS transaction model unchanged. |
| `/cash` collection | CashPanel + feature-local CashRecords | Shared reconciliation table, exact currency minor units, open/refresh toolbar, same 25-row paging. No unsupported API search/filter invented. |
| Shift details | Loaded-record drawer/native panel | State, opening/expected/counted/discrepancy, timestamps and terminal/actor references; null count/discrepancy explicit. Selection does not request or post anything. Closed-shift/read-only evidence tests. |
| Open shift | Existing cashForms | Same active scoped terminals/currency/opening float, permission and single-attempt protected command. Action retained in first toolbar. |
| Close shift | Existing selected-shift command | Only open shifts; same counted cash input and backend reconciliation. Characterization pins stable uncertain retry identity; browser opens nested command at 1440px. Closed shifts immutable. |
| Cash adjustment | Existing selected-shift command | Same payments.cash requirement, in/out choice, exact amount/reason. Browser opens form only. No new cash-entry history API. |
| Confirmation/action hierarchy | Existing CommandForm confirmation drawers retained | Read-only evidence/printing separated from labelled stock/settlement corrections. No permission/state/approval bypass or new mutation semantics. |
| Embedded POS consumers | Existing CashPanel/ReceiptPanel consumers retained | Props unchanged. Cash/receipt view changes shared by web/Tauri/native; checkout/cart/held/offline/printing integrations not rebuilt. |

States reviewed: loading, retry/error, empty collection/evidence, populated, read-only, open/closed shift, terminal-sale command eligibility and nested drawers. Browser data uses an open shift and completed sales; synthetic tests cover closed shifts and non-empty financial histories. Live validation, pending/unsaved state, tenant denial, failed/duplicate refunds, rollback and production-scale histories remain integration/device work. No business workflow added.
