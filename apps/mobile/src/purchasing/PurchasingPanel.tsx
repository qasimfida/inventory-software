import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  createPurchasingClient,
  createInventoryClient,
  ResourceModel,
  supplierForms,
  purchaseCreateForm,
  purchaseDetailForms,
  purchaseAddLineForm,
} from '@inventory/api-client';
import { hasPermission } from '@inventory/contracts';
import type { Business, Location } from '@inventory/contracts';
import { Text, View } from 'react-native';
import { Action, Choice, Field, styles } from '../organization/Controls';
import { CommandForm } from '../components/CommandForm';
import { authClient } from '../auth/client';
import { operationKey } from '../platform/operation-key';
export function PurchasingPanel({
  business,
  locations,
}: {
  business: Business;
  locations: Location[];
}) {
  const warehouses = locations.filter((l) => l.kind === 'warehouses' && l.state === 'active');
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? ''),
    [search, setSearch] = useState(''),
    [offset, setOffset] = useState(0),
    [supplierId, setSupplierId] = useState(''),
    [orderId, setOrderId] = useState('');
  const client = useMemo(
    () => createPurchasingClient(authClient.organizationRequest, operationKey, business.id),
    [business.id],
  );
  const stock = useMemo(
    () => createInventoryClient(authClient.organizationRequest, operationKey, business.id),
    [business.id],
  );
  const model = useMemo(
    () =>
      new ResourceModel(async () => ({
        workspace: await client.load({
          warehouseId,
          search,
          offset,
          ...(supplierId ? { supplierId } : {}),
        }),
        stock: hasPermission(business, 'stock.read')
          ? await stock.load({ warehouseId, search, offset })
          : null,
        detail: orderId ? await client.detail(orderId) : null,
      })),
    [client, stock, business, warehouseId, search, offset, supplierId, orderId],
  );
  const state = useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot);
  useEffect(() => {
    if (warehouseId) void model.run();
    return model.reset;
  }, [model, warehouseId]);
  const forms =
    state.data && hasPermission(business, 'purchases.write')
      ? [
          ...(state.data.detail?.order.state === 'draft' && state.data.stock
            ? [
                purchaseAddLineForm(
                  client,
                  state.data.workspace,
                  state.data.stock,
                  state.data.detail,
                ),
              ]
            : []),
          ...(!business.scope?.storeId ? supplierForms(client, state.data.workspace) : []),
          ...(state.data.stock
            ? [purchaseCreateForm(client, state.data.workspace, state.data.stock, warehouseId)]
            : []),
          ...(state.data.detail ? purchaseDetailForms(client, state.data.detail) : []),
        ]
      : [];
  return (
    <View style={styles.group}>
      <Text accessibilityRole="header">Purchasing</Text>
      <Text>
        Receipts and returns post stock movements. Invoice references are unallocated obligations;
        payment settlement and accounting are not implemented. After an uncertain request and
        reload, check history before submitting again.
      </Text>
      <Choice
        label="Purchasing warehouse"
        value={warehouseId}
        options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
        onChange={(value: string) => {
          setWarehouseId(value);
          setOrderId('');
          setOffset(0);
        }}
      />
      <Field
        label="Search suppliers / purchase reference / item"
        value={search}
        onChange={(value) => {
          setSearch(value);
          setOffset(0);
        }}
      />
      {state.error && <Text accessibilityRole="alert">{state.error}</Text>}
      <Action
        label="Refresh purchasing"
        onPress={() => void model.run()}
        disabled={state.busy || !warehouseId}
      />
      {state.data && (
        <>
          <Choice
            label="Supplier history"
            value={supplierId}
            options={[
              { value: '', label: 'All suppliers' },
              ...state.data.workspace.suppliers.map((s) => ({ value: s.id, label: s.name })),
            ]}
            onChange={(value: string) => {
              setSupplierId(value);
              setOffset(0);
              setOrderId('');
            }}
          />
          <Choice
            label="Purchase order"
            value={orderId}
            options={[
              { value: '', label: 'Select order' },
              ...state.data.workspace.orders.map((o) => ({
                value: o.id,
                label: `${o.reference} · ${o.state}`,
              })),
            ]}
            onChange={setOrderId}
          />
          <Action
            label="Previous purchasing page"
            onPress={() => setOffset(Math.max(0, offset - 25))}
            disabled={!offset}
          />
          <Action
            label="Next purchasing page"
            onPress={() => setOffset(offset + 25)}
            disabled={!state.data.workspace.hasMore}
          />
          {state.data.detail && (
            <>
              <Text>
                {state.data.detail.order.reference} · {state.data.detail.order.state} ·{' '}
                {state.data.detail.order.currency}
              </Text>
              {state.data.detail.lines.map((l) => (
                <Text key={l.id}>
                  {l.variantId} · ordered {l.quantity} · received {l.received} · cost {l.unitCost}
                </Text>
              ))}
              {state.data.detail.invoices.map((i) => (
                <Text key={i.id}>
                  Invoice {i.reference} · unallocated {i.amountMinor} minor units · due {i.dueDate}
                </Text>
              ))}
              {state.data.detail.returns.map((r) => (
                <Text key={r.id}>
                  Return {r.quantity} · credit reference {r.creditReference} · movement{' '}
                  {r.movementId}
                </Text>
              ))}
            </>
          )}
          {forms.map((form) => (
            <CommandForm key={form.title} definition={form} run={(work) => void model.run(work)} />
          ))}
        </>
      )}
    </View>
  );
}
