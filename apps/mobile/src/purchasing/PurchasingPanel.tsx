import { View } from 'react-native';
import { WarehouseSelect } from '../ui/WarehouseSelect';
import { usePageCollection } from '../ui/usePageCollection';
import { Pagination } from '../ui/Pagination';
import { SearchControl } from '../ui/SearchControl';
import { IconAction } from '../ui/IconAction';
import { PurchaseDetails } from './PurchaseDetails';
import { ScreenBody, ScreenHeader } from '../ui/ScreenHeader';
import { Text } from '../ui/Themed';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  createPurchasingClient,
  createInventoryClient,
  cancellableResource,
  supplierForms,
  purchaseCreateForm,
  purchaseDetailForms,
  purchaseAddLineForm,
} from '@inventory/api-client';
import { hasPermission } from '@inventory/contracts';
import type { Business, Location } from '@inventory/contracts';
import { Choice } from '../organization/Controls';
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
  const request = useMemo(
    () =>
      cancellableResource(
        async (signal) => ({
          workspace: await client.load(
            {
              warehouseId,
              search,
              offset,
              ...(supplierId ? { supplierId } : {}),
            },
            signal,
          ),
          stock: hasPermission(business, 'stock.read')
            ? await stock.load({ warehouseId, search, offset }, signal)
            : null,
          detail: orderId ? await client.detail(orderId) : null,
        }),
        () => new AbortController(),
      ),
    [client, stock, business, warehouseId, search, offset, supplierId, orderId],
  );
  const { model } = request;
  const rawPageState = useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot);
  const state = usePageCollection(
    rawPageState,
    [business, warehouseId, search, supplierId],
    offset,
    ['workspace.suppliers', 'workspace.orders'],
    () => {
      setOffset(0);
    },
  );
  useEffect(() => {
    const timer = setTimeout(() => {
      if (warehouseId) void model.run();
    }, 250);
    return () => {
      clearTimeout(timer);
      request.cancel();
    };
  }, [model, request, warehouseId]);
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
    <ScreenBody>
      <ScreenHeader
        title="Purchasing"
        description={
          <>
            Receipts and returns post stock movements. Use Supplier balances to record invoice
            credits and cash settlements. After an uncertain request and reload, check history
            before submitting again.
          </>
        }
      />
      <WarehouseSelect
        label="Purchasing warehouse"
        value={warehouseId}
        options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
        onChange={(value: string) => {
          setWarehouseId(value);
          setOrderId('');
          setOffset(0);
        }}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <SearchControl
            suggestions={
              state.data?.workspace.suppliers.map((item) => ({
                value: item.name,
                label: item.name,
              })) ?? []
            }
            busy={state.busy || (!state.data && !state.error)}
            label="Search suppliers / purchase reference / item"
            value={search}
            onChange={(value) => {
              setSearch(value);
              setOffset(0);
            }}
          />
        </View>
        <IconAction
          label="Refresh purchasing"
          onPress={() => void model.run()}
          disabled={state.busy || !warehouseId}
          icon="↻"
        />
      </View>
      {Boolean(state.error) && <Text accessibilityRole="alert">{state.error}</Text>}
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
          <Pagination
            label="purchasing"
            offset={offset}
            pageSize={25}
            hasMore={state.data?.workspace.hasMore ?? false}
            busy={state.busy || (!state.data && !state.error)}
            onChange={setOffset}
          />
          {state.data.detail && <PurchaseDetails detail={state.data.detail} />}
          {forms.map((form) => (
            <CommandForm key={form.title} definition={form} run={(work) => void model.run(work)} />
          ))}
        </>
      )}
    </ScreenBody>
  );
}
