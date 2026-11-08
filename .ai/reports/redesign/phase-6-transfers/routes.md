# Phase 6 transfer coverage

Route: `/transfers`. Web/Tauri: `apps/web/src/features/transfers/`; native: `apps/mobile/src/transfers/`. Shared forms/client: `packages/api-client/src/transfer-forms.ts`, `transfers.ts`; contracts: `packages/contracts/src/transfers.ts`. No new route or tab.

| Surface | Treatment | Preserved rules / evidence |
| --- | --- | --- |
| Collection and warehouse scope | TransferPanel uses existing RecordCollection, search/suggestions, list/grid, export, pagination; draft creation moved to collection actions | Same active warehouse options, resets, bounded 25-row pages, 250ms debounce/cancellation. Viewer tests hide writes. Browser captures light/dark and six widths. |
| Refresh/loading/error/empty | Shared IconButton web, existing native IconAction; shared AsyncState | Reload is read-only. Existing errors retain text; no-warehouse state and initial loading now explicit. RecordCollection continues to own empty/no-results presentation. |
| Create draft | Existing CommandForm drawer/native panel | Same reference/source/destination warehouses/locations, optional roots, first variant/unit/quantity. Browser opens form only; no stock written. |
| Draft line editing | Existing Add draft transfer line form | Same draft-only visibility, version, variant/unit and exact quantity. Owner component tests and browser nested drawer. No new line-delete behavior. |
| Detail drawer | TransferDetails inside existing FormSheet/SidePanel | Added loaded warehouse names with explicit reference fallback; source/destination location references, created timestamp and version. No new lookup/request. Web wrapper prevents flex-shrinking evidence rows. |
| Lines | Shared Table/RecordTable | Selected-unit quantity and approved/settled base units remain distinct exact strings. Variant/unit IDs labelled references; no fabricated SKU or conversion. |
| Approval | Existing state-specific command | Draft only; versioned reason and stable uncertain retry identity. Server reserves stock; opening drawer does nothing. Characterization + browser drawer open. |
| Dispatch | Existing state-specific command | Approved only; server owns stock-to-transit transaction. Characterization pins version/reason and no automatic retry; browser opens confirmation. |
| Partial/full receipt | Existing Confirm destination receipt form | Dispatched/partially_received only. Separate base-unit good/damaged/shortage; same selected line/reason/idempotency. Fractional values pinned; browser confirms zero defaults and nested drawer accessibility. Completion remains server-calculated. |
| Cancellation | Existing state-specific command | Draft/approved only; no post-dispatch cancellation added. Existing reason form and backend release behavior retained. Characterization and browser open/Escape. |
| Receipt history | Shared table with explicit empty state | Exact receipt/line IDs, good/damaged/shortage, reason, actor reference. Response has no receipt timestamp; none invented. Synthetic receipt component test covers non-empty history. |
| Event history | Shared table with explicit empty state | Business-timezone timestamp, readable underscores, actor reference and full reason retained. No extra request or actor identity disclosure. |
| Completed/cancelled | Same detail presentation | Characterization confirms no transition forms; browser fixture does not contain these terminal states. No live state transition claimed. |
| Warehouse scanning consumers | Existing `/warehouse` uses warehouseForms | Shared client/forms unchanged; prior warehouse scan confirmation remains intact. No unrelated warehouse redesign this turn. |

State limits: populated, empty evidence, read-only role, writer actions and command drawer opening covered. Live validation failures, race conflicts, large datasets, offline denial and real endpoint isolation were not exercised. Existing CommandForm submission/close/confirmation semantics retained; no destructive confirmation protocol added. Transfers require online authority and both endpoints; client visibility is not backend authorization.
