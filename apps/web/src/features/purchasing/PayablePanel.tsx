import { WarehouseSelect } from '@/components/common/WarehouseSelect';
import { usePageCollection } from '@/components/common/usePageCollection';
import { RefreshCw } from 'lucide-react';
import { EmptyState } from '@/components/common/AsyncState';
import { RecordDetails } from '@/components/common/RecordDetails';
import { Grid } from '@/components/common/Layout';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { Pagination } from '@/components/common/Pagination';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createPayableClient, payableForms, ResourceModel } from '@inventory/api-client';
import type { Business, Location } from '@inventory/contracts';
import { CommandForm } from '@/components/common/CommandForm';
import { Button } from '@/components/ui/Button';
import { authClient } from '@/platform/auth-client';
export function PayablePanel({
  business,
  locations,
}: {
  business: Business;
  locations: Location[];
}) {
  const warehouses = locations.filter((l) => l.kind === 'warehouses');
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? '');
  const [supplierId, setSupplierId] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [offset, setOffset] = useState(0);
  const [historyOffset, setHistoryOffset] = useState(0);
  const client = useMemo(
    () =>
      createPayableClient(authClient.organizationRequest, () => crypto.randomUUID(), business.id),
    [business.id],
  );
  const model = useMemo(
    () =>
      new ResourceModel(async () => ({
        page: await client.load({ warehouseId, offset, ...(supplierId ? { supplierId } : {}) }),
        detail: invoiceId ? await client.detail(invoiceId, historyOffset) : null,
      })),
    [client, warehouseId, supplierId, invoiceId, offset, historyOffset],
  );
  const rawPageState = useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot);
  const state = usePageCollection(
    rawPageState,
    [business, warehouseId, supplierId, invoiceId],
    [offset, historyOffset],
    ['page.invoices', 'detail.events'],
    () => {
      setOffset(0);
      setHistoryOffset(0);
    },
  );
  useEffect(() => {
    if (warehouseId) void model.run();
    return model.reset;
  }, [model, warehouseId]);
  function resetSelection() {
    setInvoiceId('');
    setOffset(0);
    setHistoryOffset(0);
  }
  return (
    <section aria-label="Supplier balances" className="screen-section">
      <ScreenHeader
        title="Supplier balances"
        description={
          <>
            Online cash only. Confirm actual cash paid or received before recording. Open your cash
            shift for this warehouse and currency first. Return credits require a confirmed supplier
            credit note; returning stock alone does not settle an invoice.
          </>
        }
      />
      <Grid className="screen-filters">
        <div>
          <WarehouseSelect
            label="Supplier balances warehouse"
            id="payable-warehouse"
            value={warehouseId}
            onChange={(e) => {
              setWarehouseId(e.target.value);
              setSupplierId('');
              resetSelection();
            }}
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </WarehouseSelect>
        </div>
        <Button
          onClick={() => void model.run()}
          disabled={!warehouseId || state.busy}
          variant="ghost"
          size="icon"
          aria-label="Refresh supplier balances"
          title="Refresh"
        >
          <RefreshCw aria-hidden="true" />
        </Button>
      </Grid>
      {state.error && <p role="alert">{state.error}</p>}
      {supplierId && (
        <Button
          onClick={() => {
            setSupplierId('');
            resetSelection();
          }}
        >
          Show all suppliers
        </Button>
      )}
      {state.data && (
        <>
          <p>
            Totals cover {supplierId ? 'the selected supplier' : 'all suppliers'} in this warehouse,
            across all pages. Currencies are separate.
          </p>
          {state.data.page.totals.map((t) => (
            <RecordDetails
              key={t.currency}
              label="Supplier totals"
              items={[
                { label: 'Currency', value: t.currency },
                { label: 'Payable (minor units)', value: t.payableMinor },
                { label: 'Supplier owes (minor units)', value: t.supplierOwesMinor },
              ]}
            />
          ))}
          {!state.data.page.invoices.length && (
            <EmptyState message="No supplier invoices in this selection." />
          )}
          {state.data.page.invoices.map((i) => (
            <div key={i.id} className="border p-2">
              <p>
                {i.supplierName} · {i.reference} · due {i.dueDate} · outstanding{' '}
                {i.outstandingMinor} {i.currency} minor units
              </p>
              <Button
                onClick={() => {
                  setInvoiceId(i.id);
                  setHistoryOffset(0);
                }}
              >
                View invoice {i.reference}
              </Button>
              <Button
                onClick={() => {
                  setSupplierId(i.supplierId);
                  resetSelection();
                }}
              >
                Filter supplier {i.supplierName}
              </Button>
            </div>
          ))}
          <Pagination
            label="invoices"
            offset={offset}
            hasMore={state.data.page.hasMore}
            busy={state.busy || Boolean(state.error)}
            onChange={setOffset}
          />
          {state.data.detail && (
            <>
              <h3>Supplier invoice {state.data.detail.invoice.reference}</h3>
              <RecordDetails
                label="Invoice balances"
                items={[
                  { label: 'Currency', value: `${state.data.detail.invoice.currency} minor units` },
                  { label: 'Original', value: state.data.detail.invoice.amountMinor },
                  { label: 'Credits', value: state.data.detail.invoice.creditMinor },
                  { label: 'Cash paid', value: state.data.detail.invoice.paidMinor },
                  { label: 'Cash refunded', value: state.data.detail.invoice.refundedMinor },
                  { label: 'Outstanding', value: state.data.detail.invoice.outstandingMinor },
                ]}
              />
              <p>
                Negative outstanding means the supplier owes cash back. Latest 100 uncredited
                returns are listed; older return IDs are available in purchase history.
              </p>
              {state.data.detail.returns.map((r) => (
                <p key={r.id}>
                  Return {r.id} · quantity {r.quantity} · {r.creditReference}
                </p>
              ))}
              {state.data.detail.events.map((e) => (
                <p key={e.id}>
                  {e.kind} · {e.amountMinor} · {e.reference} · {e.reason} · actor {e.actorId} ·{' '}
                  {e.createdAt} · {e.returnId ? `return ${e.returnId}` : `shift ${e.shiftId}`}
                </p>
              ))}
              <Pagination
                label="supplier events"
                offset={historyOffset}
                hasMore={state.data.detail.hasMore}
                busy={state.busy || Boolean(state.error)}
                onChange={setHistoryOffset}
              />
              {payableForms(client, business, state.data.detail).map((form) => (
                <CommandForm
                  key={`${invoiceId}-${form.title}`}
                  definition={form}
                  run={(work) => void model.run(work)}
                />
              ))}
            </>
          )}
        </>
      )}
    </section>
  );
}
