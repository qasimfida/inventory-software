import { useDisplayMoney } from '@/theme/useDisplayMoney';
import { Select } from '@/components/ui/FormControls';
import { PayableDetails } from './PayableDetails';
import { PayableEvidence } from './PayableEvidence';
import { FormSheet } from '@/components/common/FormSheet';
import { Table, TableScroll } from '@/components/ui/Table';
import { IconButton } from '@/components/common/IconButton';
import { WarehouseSelect } from '@/components/common/WarehouseSelect';
import { usePageCollection } from '@/components/common/usePageCollection';
import { RefreshCw, Filter } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/AsyncState';
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
  const { formatMinorUnits } = useDisplayMoney();

  const warehouses = locations.filter((l) => l.kind === 'warehouses');
  const [storeId, setStoreId] = useState(warehouses[0]?.storeId ?? '');
  const stores = locations.filter((l) => l.kind === 'stores');
  const scopedWarehouses = warehouses.filter((w) => (w.storeId ?? '') === storeId);
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
        actions={
          <>
            <Select
              aria-label="Supplier balances store"
              value={storeId}
              onChange={(e) => {
                const value = e.target.value;
                setStoreId(value);
                setWarehouseId(warehouses.find((w) => (w.storeId ?? '') === value)?.id ?? '');
                setSupplierId('');
                resetSelection();
              }}
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
              {warehouses.some((w) => !w.storeId) && <option value="">Business warehouses</option>}
            </Select>
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
              {scopedWarehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </WarehouseSelect>
          </>
        }
        description={
          <>
            Online cash only. Confirm actual cash paid or received before recording. Open your cash
            shift for this warehouse and currency first. Return credits require a confirmed supplier
            credit note; returning stock alone does not settle an invoice.
          </>
        }
      />
      <div className="collection-toolbar">
        <IconButton
          label="Refresh supplier balances"
          icon={RefreshCw}
          onClick={() => void model.run()}
          disabled={!warehouseId || state.busy}
        />
        {supplierId && (
          <Button
            variant="ghost"
            onClick={() => {
              setSupplierId('');
              resetSelection();
            }}
          >
            Show all suppliers
          </Button>
        )}
      </div>
      {state.error && <ErrorState message={state.error} onRetry={() => void model.run()} />}
      {!warehouseId && (
        <EmptyState
          message="No accessible warehouse"
          description="Select or request warehouse access to view supplier balances."
        />
      )}
      {warehouseId && !state.data && !state.error && (
        <LoadingState message="Loading supplier balances…" />
      )}
      {state.data && (
        <>
          <p>
            Totals cover {supplierId ? 'the selected supplier' : 'all suppliers'} in this warehouse,
            across all pages. Currencies are separate.
          </p>
          <PayableEvidence
            title="Supplier totals"
            columns={['Currency', 'Payable', 'Supplier owes']}
            numeric={[1, 2]}
            empty="No supplier balances in this selection"
            rows={state.data.page.totals.map((t) => ({
              id: t.currency,
              cells: [
                t.currency,
                formatMinorUnits(t.payableMinor, t.currency),
                formatMinorUnits(t.supplierOwesMinor, t.currency),
              ],
            }))}
          />
          {!state.data.page.invoices.length && (
            <EmptyState message="No supplier invoices in this selection." />
          )}
          {state.data.page.invoices.length > 0 && (
            <TableScroll label="Supplier invoices">
              <Table>
                <thead>
                  <tr>
                    {['Invoice', 'Supplier', 'Due date', 'Outstanding', 'Currency', 'Actions'].map(
                      (label) => (
                        <th
                          key={label}
                          scope="col"
                          data-numeric={label.startsWith('Outstanding') || undefined}
                          data-actions={label === 'Actions' || undefined}
                        >
                          {label}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {state.data.page.invoices.map((i) => (
                    <tr key={i.id}>
                      <th scope="row">
                        <Button
                          variant="link"
                          aria-label={`View invoice ${i.reference}`}
                          onClick={() => {
                            setInvoiceId(i.id);
                            setHistoryOffset(0);
                          }}
                        >
                          {i.reference}
                        </Button>
                      </th>
                      <td>{i.supplierName}</td>
                      <td className="whitespace-nowrap">{i.dueDate}</td>
                      <td data-numeric>{formatMinorUnits(i.outstandingMinor, i.currency)}</td>
                      <td>{i.currency}</td>
                      <td data-actions>
                        <IconButton
                          icon={Filter}
                          label={`Filter supplier ${i.supplierName}`}
                          onClick={() => {
                            setSupplierId(i.supplierId);
                            resetSelection();
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableScroll>
          )}
          <Pagination
            label="invoices"
            offset={offset}
            hasMore={state.data.page.hasMore}
            busy={state.busy || Boolean(state.error)}
            onChange={setOffset}
          />
          {state.data.detail && (
            <FormSheet
              title={`Supplier invoice ${state.data.detail.invoice.reference}`}
              description="Review recorded balances and history before recording cash or credit."
              open
              onOpenChange={(open) => {
                if (!open && !state.busy) setInvoiceId('');
              }}
            >
              <div className="space-y-3 shrink-0 min-w-0">
                {state.error && (
                  <ErrorState message={state.error} onRetry={() => void model.run()} />
                )}
                <PayableDetails
                  detail={state.data.detail}
                  timeZone={business.timeZone}
                  warehouse={
                    warehouses.find((w) => w.id === state.data?.detail?.invoice.warehouseId)
                      ?.name ?? state.data.detail.invoice.warehouseId
                  }
                />
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
              </div>
            </FormSheet>
          )}
        </>
      )}
    </section>
  );
}
