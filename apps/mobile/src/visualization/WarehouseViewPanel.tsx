import { RecordCollection } from '../ui/RecordCollection';
import { Surface } from '../ui/Surface';
import { StatusBadge } from '../ui/StatusBadge';
import { View } from 'react-native';
import { WarehouseSelect } from '../ui/WarehouseSelect';
import { Pagination } from '../ui/Pagination';
import { usePageCollection } from '../ui/usePageCollection';
import { IconAction } from '../ui/IconAction';
import { EmptyState, LoadingState, ErrorState } from '../ui/AsyncState';
import { ScreenBody } from '../ui/ScreenHeader';
import { DisclosureTrigger } from '../ui/DisclosureTrigger';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createWarehouseViewClient, ResourceModel } from '@inventory/api-client';
import type { Business, Location } from '@inventory/contracts';
import { authClient } from '../auth/client';
import { Action } from '../ui/Controls';
import { Text } from '../ui/Themed';
export function WarehouseViewPanel({
  business,
  locations,
  warehouseId: selectedWarehouseId,
  page = false,
}: {
  business: Business;
  locations: Location[];
  warehouseId?: string;
  page?: boolean;
}) {
  const warehouses = locations.filter((l) => l.kind === 'warehouses'),
    [localWarehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? ''),
    [locationId, setLocationId] = useState<string>(),
    [offset, setOffset] = useState(0),
    [stockOffset, setStockOffset] = useState(0),
    [open, setOpen] = useState(page);
  const warehouseId = selectedWarehouseId ?? localWarehouseId;
  const client = useMemo(
    () => createWarehouseViewClient(authClient.organizationRequest, business.id),
    [business.id],
  );
  const model = useMemo(
    () => new ResourceModel(() => client.load({ warehouseId, locationId, offset, stockOffset })),
    [client, warehouseId, locationId, offset, stockOffset],
  );
  const rawPageState = useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot);
  const state = usePageCollection(
    rawPageState,
    [business, warehouseId, locationId],
    [offset, stockOffset],
    ['children', 'stock'],
    () => {
      setOffset(0);
      setStockOffset(0);
    },
  );
  useEffect(() => {
    if (open && warehouseId) void model.run();
    return model.reset;
  }, [model, warehouseId, open]);
  function navigate(id?: string) {
    setLocationId(id);
    setOffset(0);
    setStockOffset(0);
  }
  return (
    <ScreenBody>
      {!selectedWarehouseId && (
        <DisclosureTrigger
          expanded={open}
          label="Warehouse hierarchy"
          onPress={() => setOpen(!open)}
        />
      )}
      {open && (
        <>
          {!selectedWarehouseId && (
            <WarehouseSelect
              label="View warehouse"
              value={warehouseId}
              options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
              onChange={(id) => {
                setWarehouseId(id);
                navigate();
              }}
            />
          )}
          {!warehouseId && <EmptyState message="No warehouses in your scope." />}
          {!state.data && state.busy && <LoadingState message="Loading warehouse view…" />}
          {state.error && <ErrorState message={state.error} onRetry={() => void model.run()} />}
          {state.data && (
            <>
              <Surface>
                <Text accessibilityRole="header">{state.data.node.name}</Text>
                <Text tone="muted">
                  {state.data.node.code} · {state.data.node.type}
                </Text>
                <StatusBadge
                  tone={state.data.node.state === 'active' ? 'success' : 'neutral'}
                  label={state.data.node.state}
                />
                <Text tone="muted">
                  Open a child location to explore it. Use Locations to create or edit storage
                  details.
                </Text>
                <RecordCollection
                  showExport={!selectedWarehouseId}
                  label="child locations"
                  onOpen={navigate}
                  toolbar={
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      <Action
                        variant="ghost"
                        label="Parent location"
                        disabled={!state.data.node.parentId}
                        onPress={() => navigate(state.data!.node.parentId ?? undefined)}
                      />
                      <Action
                        variant="ghost"
                        label="Warehouse root"
                        disabled={state.data.node.id === warehouseId}
                        onPress={() => navigate()}
                      />
                      <IconAction
                        label="Refresh warehouse view"
                        icon="↻"
                        disabled={state.busy}
                        onPress={() => void model.run()}
                      />
                    </View>
                  }
                  items={state.data.children.map((node) => ({
                    id: node.id,
                    title: node.name,
                    subtitle: node.code,
                    detail: node.type,
                    status: node.state,
                    tone: node.state === 'active' ? 'success' : 'neutral',
                  }))}
                />
                <Pagination
                  label="locations"
                  offset={offset}
                  pageSize={50}
                  hasMore={state.data.hasMore}
                  busy={state.busy || Boolean(state.error)}
                  onChange={setOffset}
                />
              </Surface>
              <Surface>
                <Text tone="muted">
                  Stock stored directly here; child locations are not included.
                </Text>
                <Text accessibilityRole="header">Stock at {state.data.node.name}</Text>
                {!state.data.stock.length && (
                  <EmptyState message="No recorded stock at this location." />
                )}
                {state.data.stock.map((stock) => (
                  <Surface key={stock.variantId} muted>
                    <Text accessibilityRole="header">
                      {stock.sku} · {stock.unit}
                    </Text>
                    <Text>
                      On hand: {stock.onHand} · Available: {stock.available} · Damaged:{' '}
                      {stock.damaged}
                    </Text>
                    <StatusBadge
                      tone={stock.low ? 'warning' : 'neutral'}
                      label={stock.low ? 'Low stock' : 'Above threshold'}
                    />
                  </Surface>
                ))}

                <Pagination
                  label="location stock"
                  offset={stockOffset}
                  pageSize={50}
                  hasMore={state.data.stockHasMore}
                  busy={state.busy || Boolean(state.error)}
                  onChange={setStockOffset}
                />
              </Surface>
            </>
          )}
        </>
      )}
    </ScreenBody>
  );
}
