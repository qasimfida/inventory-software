import { ManageProduct } from '../catalog/ManageProduct';
import { StockAdjustment } from './StockAdjustment';
import { CursorPagination } from '../ui/CursorPagination';
import { usePageCollection } from '../ui/usePageCollection';
import { View } from 'react-native';
import { DisclosureTrigger } from '../ui/DisclosureTrigger';
import { Pagination } from '../ui/Pagination';
import { IconAction } from '../ui/IconAction';
import { InventoryOverview } from './InventoryOverview';
import { LoadingState } from '../ui/AsyncState';
import { MovementHistory } from './MovementHistory';
import { ScreenBody, ScreenHeader } from '../ui/ScreenHeader';
import { StockSnapshot } from './StockSnapshot';
import { Text } from '../ui/Themed';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createInventoryClient, cancellableResource, inventoryForms } from '@inventory/api-client';
import { hasPermission } from '@inventory/contracts';
import type { Business, Location } from '@inventory/contracts';
import { authClient } from '../auth/client';
import { operationKey } from '../platform/operation-key';
import { CommandForm } from '../components/CommandForm';
import { Action, Field } from '../organization/Controls';
export function InventoryPanel({
  business,
  locations,
}: {
  business: Business;
  locations: Location[];
}) {
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [adjusting, setAdjusting] = useState('');
  const warehouses = locations.filter((l) => l.kind === 'warehouses' && l.state === 'active');
  const warehouseId = warehouses[0]?.id ?? '';
  const [search, setSearch] = useState(''),
    [offset, setOffset] = useState(0),
    [cursor, setCursor] = useState<string | undefined>(undefined),
    [reconciliation, setReconciliation] = useState('');
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const client = useMemo(
    () => createInventoryClient(authClient.organizationRequest, operationKey, business.id),
    [business.id],
  );
  const request = useMemo(
    () =>
      cancellableResource(
        (signal) =>
          client.load({ warehouseId, search, offset, ...(cursor ? { cursor } : {}) }, signal),
        () => new AbortController(),
      ),
    [client, warehouseId, search, offset, cursor],
  );
  const { model } = request;
  const rawPageState = useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot);
  const state = usePageCollection(
    rawPageState,
    [business, warehouseId, search],
    [offset, cursor],
    ['items', 'balances', 'reservations', 'movements'],
    () => {
      setOffset(0);
      setCursor(undefined);
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
  return (
    <ScreenBody>
      <ScreenHeader title="Inventory" description="Monitor available stock by warehouse." />
      {!warehouses.length ? (
        <Text>Create an active warehouse to manage stock.</Text>
      ) : (
        <>
          {hasPermission(business, 'stock.write') && (
            <StockAdjustment
              sku={adjusting}
              data={state.data ?? null}
              client={client}
              warehouseId={warehouseId}
              error={state.error}
              busy={state.busy}
              run={(work) => void model.run(work)}
              onClose={() => setAdjusting('')}
            />
          )}
          {editingProduct && (
            <ManageProduct
              business={business}
              locations={locations}
              productId={editingProduct}
              onClose={() => setEditingProduct(null)}
            />
          )}
          <InventoryOverview
            onEdit={
              hasPermission(business, 'products.write') && !business.scope?.storeId
                ? setEditingProduct
                : undefined
            }
            key={warehouseId}
            businessId={business.id}
            warehouseId={warehouseId}
            revision={state.data}
            onAdjust={
              hasPermission(business, 'stock.write')
                ? (sku) => {
                    setSearch(sku);
                    setOffset(0);
                    setAdjusting(sku);
                  }
                : undefined
            }
          />
          <DisclosureTrigger
            label="Stock operations and movement history"
            expanded={ledgerOpen}
            onPress={() => setLedgerOpen(!ledgerOpen)}
          />
          <View
            style={{ display: ledgerOpen ? 'flex' : 'none' }}
            accessibilityElementsHidden={!ledgerOpen}
            importantForAccessibility={ledgerOpen ? 'auto' : 'no-hide-descendants'}
          >
            <Text tone="muted">
              Available = on hand − reserved − damaged. In transit is separate. After an uncertain
              request followed by reload or sign-in, inspect history before creating another
              command.
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Search stock item / SKU"
                  value={search}
                  onChange={(value) => {
                    setSearch(value);
                    setOffset(0);
                  }}
                  maxLength={120}
                />
              </View>
              <IconAction
                label="Refresh inventory"
                disabled={state.busy}
                onPress={() => void model.run()}
                icon="↻"
              />
            </View>
            {Boolean(state.error) && <Text accessibilityRole="alert">{state.error}</Text>}
            {state.busy && <LoadingState message="Loading inventory…" />}

            {state.data && (
              <>
                <Text>
                  {state.data.totals.balances} balance records; negative stock{' '}
                  {state.data.policy.allowNegative ? 'allowed' : 'blocked'}.
                </Text>
                <StockSnapshot stock={state.data} />
                <Pagination
                  label="stock records"
                  offset={offset}
                  pageSize={state.data.limit}
                  total={Math.max(...Object.values(state.data.totals))}
                  hasMore={state.data.hasMore}
                  busy={state.busy || Boolean(state.error)}
                  onChange={setOffset}
                />
                {hasPermission(business, 'stock.write') &&
                  inventoryForms(client, state.data, warehouseId).map((form) => (
                    <CommandForm
                      key={form.title}
                      definition={form}
                      run={(work) => void model.run(work)}
                    />
                  ))}
                {hasPermission(business, 'business.write') && (
                  <CommandForm
                    definition={{
                      title: 'Save inventory policy',
                      fields: [
                        {
                          name: 'allowNegative',
                          label: 'Allow negative stock',
                          kind: 'boolean',
                          value: state.data.policy.allowNegative,
                        },
                      ],
                      submit: (v) =>
                        client.policy({
                          allowNegative: v.allowNegative === true,
                          version: state.data!.policy.version,
                        }),
                    }}
                    run={(work) => void model.run(work)}
                  />
                )}
                <Action
                  label="Reconcile inventory"
                  onPress={() =>
                    void model.run(async () => {
                      const result = await client.reconcile(warehouseId);
                      setReconciliation(
                        result.consistent
                          ? 'Ledger and balances reconcile.'
                          : `${result.mismatches.length} mismatches require investigation.`,
                      );
                    })
                  }
                />
                {Boolean(reconciliation) && (
                  <Text accessibilityLiveRegion="polite">{reconciliation}</Text>
                )}
                <Text accessibilityRole="header">Movement history</Text>
                <MovementHistory stock={state.data} timeZone={business.timeZone} />
                {state.data && (
                  <CursorPagination
                    label="stock movements"
                    previous={Boolean(cursor)}
                    hasMore={Boolean(state.data.nextCursor)}
                    busy={state.busy || Boolean(state.error)}
                    onReset={() => setCursor(undefined)}
                    onNext={() => setCursor(state.data?.nextCursor ?? undefined)}
                  />
                )}
              </>
            )}
          </View>
        </>
      )}
    </ScreenBody>
  );
}
