import { WarehouseSelect } from '../ui/WarehouseSelect';
import { Pagination } from '../ui/Pagination';
import { usePageCollection } from '../ui/usePageCollection';
import { IconAction } from '../ui/IconAction';
import { EmptyState } from '../ui/AsyncState';
import { RecordDetails } from '../ui/RecordDetails';
import { ScreenBody, ScreenHeader } from '../ui/ScreenHeader';
import { Text } from '../ui/Themed';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { View } from 'react-native';
import { createPayableClient, payableForms, ResourceModel } from '@inventory/api-client';
import type { Business, Location } from '@inventory/contracts';
import { CommandForm } from '../components/CommandForm';
import { Action, styles } from '../organization/Controls';
import { authClient } from '../auth/client';
import { operationKey } from '../platform/operation-key';
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
        description={
          <>
            Online cash only. Confirm actual cash paid or received before recording. Open your cash
            shift for this warehouse and currency first. Return credits require a confirmed supplier
            credit note; returning stock alone does not settle an invoice.
          </>
        }
      />
      <WarehouseSelect
        label="Supplier balances warehouse"
        value={warehouseId}
        options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
        onChange={(value) => {
          setWarehouseId(value);
          setSupplierId('');
          resetSelection();
        }}
      />
      {Boolean(state.error) && <Text accessibilityRole="alert">{state.error}</Text>}
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
            <View key={i.id} style={styles.group}>
              <Text>
                {i.supplierName} · {i.reference} · due {i.dueDate} · outstanding{' '}
                {i.outstandingMinor} {i.currency} minor units
              </Text>
              <Action
                label={`View invoice ${i.reference}`}
                onPress={() => {
                  setInvoiceId(i.id);
                  setHistoryOffset(0);
                }}
              />
              <Action
                label={`Filter supplier ${i.supplierName}`}
                onPress={() => {
                  setSupplierId(i.supplierId);
                  resetSelection();
                }}
              />
            </View>
          ))}

          <Pagination
            label="invoices"
            offset={offset}
            pageSize={25}
            hasMore={state.data.page.hasMore}
            busy={state.busy || Boolean(state.error)}
            onChange={setOffset}
          />
          {state.data.detail && (
            <>
              <Text accessibilityRole="header">
                Supplier invoice {state.data.detail.invoice.reference}
              </Text>
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
              <Text>
                Negative outstanding means the supplier owes cash back. Latest 100 uncredited
                returns are listed; older return IDs are available in purchase history.
              </Text>
              {state.data.detail.returns.map((r) => (
                <Text key={r.id}>
                  Return {r.id} · quantity {r.quantity} · {r.creditReference}
                </Text>
              ))}
              {state.data.detail.events.map((e) => (
                <Text key={e.id}>
                  {e.kind} · {e.amountMinor} · {e.reference} · {e.reason} · actor {e.actorId} ·{' '}
                  {e.createdAt} · {e.returnId ? `return ${e.returnId}` : `shift ${e.shiftId}`}
                </Text>
              ))}

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
            </>
          )}
        </>
      )}
    </ScreenBody>
  );
}
