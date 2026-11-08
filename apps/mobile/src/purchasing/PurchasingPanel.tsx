import { SidePanel } from '../ui/SidePanel';
import { RecordDetails } from '../ui/RecordDetails';
import { EmptyState, ErrorState, LoadingState } from '../ui/AsyncState';
import { RecordCollection } from '../ui/RecordCollection';
import { FilterButton } from '../ui/FilterButton';
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
  const [filtersOpen, setFiltersOpen] = useState(false);
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
  const selectedSupplier = state.data?.workspace.suppliers.find(
    (supplier) => supplier.id === supplierId,
  );
  const supplierAction = (title: string) =>
    title === 'Create supplier' || title.startsWith('Save supplier ');
  const renderCommand = (form: (typeof forms)[number]) => (
    <CommandForm key={form.title} definition={form} run={(work) => void model.run(work)} />
  );
  return (
    <ScreenBody>
      <ScreenHeader
        title="Purchasing & suppliers"
        description={
          <>
            Receipts and returns post stock movements. Use Supplier balances to record invoice
            credits and cash settlements. After an uncertain request and reload, check history
            before submitting again.
          </>
        }
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
        <FilterButton
          active={[
            supplierId && 'Supplier selected',
            warehouseId &&
              `Warehouse: ${warehouses.find((w) => w.id === warehouseId)?.name ?? warehouseId}`,
          ].filter((v): v is string => !!v)}
          onPress={() => setFiltersOpen(true)}
        />
        <SidePanel
          title="Purchasing filters"
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
        >
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
          {state.data && (
            <>
              {' '}
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
            </>
          )}
        </SidePanel>
        <IconAction
          label="Refresh purchasing"
          onPress={() => void model.run()}
          disabled={state.busy || !warehouseId}
          icon="↻"
        />
      </View>
      {!warehouseId && (
        <EmptyState
          message="No active warehouse"
          description="Select or request access to an active warehouse to view purchasing."
        />
      )}
      {Boolean(state.error) && (
        <ErrorState message={state.error} onRetry={() => void model.run()} />
      )}
      {Boolean(warehouseId) && !state.data && !state.error && (
        <LoadingState message="Loading purchasing…" />
      )}
      {state.data && (
        <>
          <Pagination
            label="purchasing"
            offset={offset}
            pageSize={25}
            hasMore={state.data?.workspace.hasMore ?? false}
            busy={state.busy || (!state.data && !state.error)}
            onChange={setOffset}
          />
          <Text accessibilityRole="header">Purchase orders</Text>
          <RecordCollection
            label="purchase orders"
            actions={forms.filter((f) => f.title === 'Create purchase order').map(renderCommand)}
            onOpen={setOrderId}
            items={state.data.workspace.orders.map((o) => ({
              id: o.id,
              title: o.reference,
              subtitle:
                state.data!.workspace.suppliers.find((supplier) => supplier.id === o.supplierId)
                  ?.name ?? 'Supplier outside this page',
              detail: o.currency,
              status: o.state.replaceAll('_', ' '),
              tone:
                o.state === 'completed'
                  ? 'success'
                  : o.state === 'partially_received'
                    ? 'warning'
                    : 'neutral',
            }))}
          />
          <Text accessibilityRole="header">Suppliers</Text>
          <RecordCollection
            label="suppliers"
            actions={forms
              .filter(
                (f) =>
                  f.title === 'Create supplier' ||
                  (selectedSupplier && f.title === `Save supplier ${selectedSupplier.code}`),
              )
              .map(renderCommand)}
            onOpen={(id) => {
              setSupplierId(id);
              setOrderId('');
              setOffset(0);
            }}
            items={state.data.workspace.suppliers.map((supplier) => ({
              id: supplier.id,
              title: supplier.name,
              subtitle: supplier.code,
              detail: supplier.email || supplier.phone || 'No contact details',
              status: supplier.state,
              tone: supplier.state === 'active' ? 'success' : 'neutral',
            }))}
          />
          {selectedSupplier && (
            <RecordDetails
              label="Supplier details"
              items={[
                { label: 'Supplier', value: selectedSupplier.name },
                { label: 'Code', value: selectedSupplier.code },
                { label: 'Email', value: selectedSupplier.email || 'Not provided' },
                { label: 'Phone', value: selectedSupplier.phone || 'Not provided' },
                { label: 'Notes', value: selectedSupplier.notes || 'None' },
                { label: 'Status', value: selectedSupplier.state },
              ]}
            />
          )}
          {state.data.detail && (
            <SidePanel
              title={`Purchase ${state.data.detail.order.reference}`}
              open
              onClose={() => {
                if (!state.busy) setOrderId('');
              }}
            >
              <PurchaseDetails detail={state.data.detail} timeZone={business.timeZone} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {forms
                  .filter((f) => !supplierAction(f.title) && f.title !== 'Create purchase order')
                  .map(renderCommand)}
              </View>
            </SidePanel>
          )}
        </>
      )}
    </ScreenBody>
  );
}
