import { useDisplayMoney } from '../ui/useDisplayMoney';
import { Choice } from '../ui/Controls';
import { PayableDetails } from './PayableDetails';
import { PayableEvidence } from './PayableEvidence';
import { SidePanel } from '../ui/SidePanel';
import { RecordTable } from '../ui/RecordTable';
import { WarehouseSelect } from '../ui/WarehouseSelect';
import { Pagination } from '../ui/Pagination';
import { usePageCollection } from '../ui/usePageCollection';
import { IconAction } from '../ui/IconAction';
import { EmptyState, ErrorState, LoadingState } from '../ui/AsyncState';
import { ScreenBody, ScreenHeader } from '../ui/ScreenHeader';
import { Text } from '../ui/Themed';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createPayableClient, payableForms, ResourceModel } from '@inventory/api-client';
import type { Business, Location } from '@inventory/contracts';
import { CommandForm } from '../components/CommandForm';
import { Action } from '../organization/Controls';
import { authClient } from '../auth/client';
import { operationKey } from '../platform/operation-key';
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
    () => createPayableClient(authClient.organizationRequest, operationKey, business.id),
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
    <ScreenBody>
      <ScreenHeader
        title="Supplier balances"
        actions={
          <>
            <Choice
              label="Supplier balances store"
              value={storeId}
              options={[
                ...stores.map((s) => ({ value: s.id, label: s.name })),
                ...(warehouses.some((w) => !w.storeId)
                  ? [{ value: '', label: 'Business warehouses' }]
                  : []),
              ]}
              onChange={(value) => {
                setStoreId(value);
                setWarehouseId(warehouses.find((w) => (w.storeId ?? '') === value)?.id ?? '');
                setSupplierId('');
                resetSelection();
              }}
            />{' '}
            <WarehouseSelect
              label="Supplier balances warehouse"
              value={warehouseId}
              options={scopedWarehouses.map((w) => ({ value: w.id, label: w.name }))}
              onChange={(value) => {
                setWarehouseId(value);
                setSupplierId('');
                resetSelection();
              }}
            />{' '}
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

      {Boolean(state.error) && (
        <ErrorState message={state.error} onRetry={() => void model.run()} />
      )}
      {!warehouseId && (
        <EmptyState
          message="No accessible warehouse"
          description="Select or request warehouse access to view supplier balances."
        />
      )}
      {Boolean(warehouseId) && !state.data && !state.error && (
        <LoadingState message="Loading supplier balances…" />
      )}
      <IconAction
        label="Refresh supplier balances"
        onPress={() => void model.run()}
        disabled={!warehouseId || state.busy}
        icon="↻"
      />
      {Boolean(supplierId) && (
        <Action
          label="Show all suppliers"
          onPress={() => {
            setSupplierId('');
            resetSelection();
          }}
        />
      )}
      {state.data && (
        <>
          <Text>
            Totals cover {supplierId ? 'the selected supplier' : 'all suppliers'} in this warehouse,
            across all pages. Currencies are separate.
          </Text>
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
            <RecordTable
              label="Supplier invoices"
              columns={['Invoice', 'Supplier', 'Due date', 'Outstanding', 'Currency', 'Actions']}
              rows={state.data.page.invoices.map((i) => ({
                id: i.id,
                cells: [
                  <Action
                    key="invoice"
                    variant="ghost"
                    label={`View invoice ${i.reference}`}
                    onPress={() => {
                      setInvoiceId(i.id);
                      setHistoryOffset(0);
                    }}
                  />,
                  i.supplierName,
                  i.dueDate,
                  formatMinorUnits(i.outstandingMinor, i.currency),
                  i.currency,
                  <Action
                    key="supplier"
                    variant="ghost"
                    label={`Filter supplier ${i.supplierName}`}
                    onPress={() => {
                      setSupplierId(i.supplierId);
                      resetSelection();
                    }}
                  />,
                ],
              }))}
            />
          )}
          <Pagination
            label="invoices"
            offset={offset}
            pageSize={25}
            hasMore={state.data.page.hasMore}
            busy={state.busy || Boolean(state.error)}
            onChange={setOffset}
          />
          {state.data.detail && (
            <SidePanel
              title={`Supplier invoice ${state.data.detail.invoice.reference}`}
              open
              onClose={() => {
                if (!state.busy) setInvoiceId('');
              }}
            >
              {state.error && <ErrorState message={state.error} onRetry={() => void model.run()} />}
              <PayableDetails
                detail={state.data.detail}
                timeZone={business.timeZone}
                warehouse={
                  warehouses.find((w) => w.id === state.data?.detail?.invoice.warehouseId)?.name ??
                  state.data.detail.invoice.warehouseId
                }
              />
              <Pagination
                label="invoice history"
                offset={historyOffset}
                pageSize={25}
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
            </SidePanel>
          )}
        </>
      )}
    </ScreenBody>
  );
}
