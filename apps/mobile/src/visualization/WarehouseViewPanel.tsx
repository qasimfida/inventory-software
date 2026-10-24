import { WarehouseSelect } from '../ui/WarehouseSelect';
import { Pagination } from '../ui/Pagination';
import { usePageCollection } from '../ui/usePageCollection';
import { IconAction } from '../ui/IconAction';
import { EmptyState, LoadingState } from '../ui/AsyncState';
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
  page = false,
}: {
  business: Business;
  locations: Location[];
  page?: boolean;
}) {
  const warehouses = locations.filter((l) => l.kind === 'warehouses'),
    [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? ''),
    [locationId, setLocationId] = useState<string>(),
    [offset, setOffset] = useState(0),
    [stockOffset, setStockOffset] = useState(0),
    [open, setOpen] = useState(page);
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
      <DisclosureTrigger
        expanded={open}
        label="Warehouse hierarchy"
        onPress={() => setOpen(!open)}
      />
      {open && (
        <>
          <Text>
            Actual storage relationships, not physical coordinates. Stock is for the selected
            location only, excluding children. Native view uses an accessible list.
          </Text>
          <WarehouseSelect
            label="View warehouse"
            value={warehouseId}
            options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
            onChange={(id) => {
              setWarehouseId(id);
              navigate();
            }}
          />
          {!warehouseId && <EmptyState message="No warehouses in your scope." />}
          <IconAction
            label="Refresh warehouse view"
            disabled={!warehouseId || state.busy}
            onPress={() => void model.run()}
            icon="↻"
          />
          {state.busy && <LoadingState message="Loading warehouse view…" />}
          {!!state.error && <Text accessibilityRole="alert">{state.error}</Text>}
          {state.data && (
            <>
              <Text accessibilityRole="header">
                {state.data.node.name} · {state.data.node.type} · {state.data.node.state}
              </Text>
              <Action
                label="Warehouse root"
                disabled={state.data.node.id === warehouseId}
                onPress={() => navigate()}
              />
              <Action
                label="Parent location"
                disabled={!state.data.node.parentId}
                onPress={() => navigate(state.data!.node.parentId ?? undefined)}
              />
              {!state.data.children.length && <EmptyState message="No child locations." />}
              {state.data.children.map((node) => (
                <Action
                  key={node.id}
                  label={`${node.code} · ${node.name} · ${node.type} · ${node.state}`}
                  onPress={() => navigate(node.id)}
                />
              ))}

              <Pagination
                label="locations"
                offset={offset}
                pageSize={50}
                hasMore={state.data.hasMore}
                busy={state.busy || Boolean(state.error)}
                onChange={setOffset}
              />
              <Text accessibilityRole="header">Stock at {state.data.node.name}</Text>
              {!state.data.stock.length && (
                <EmptyState message="No recorded stock at this location." />
              )}
              {state.data.stock.map((stock) => (
                <Text key={stock.variantId}>
                  {stock.sku}: {stock.onHand} on hand · {stock.available} available ·{' '}
                  {stock.damaged} damaged {stock.unit}
                  {stock.low ? ' · At or below low-stock threshold' : ''}
                </Text>
              ))}

              <Pagination
                label="location stock"
                offset={stockOffset}
                pageSize={50}
                hasMore={state.data.stockHasMore}
                busy={state.busy || Boolean(state.error)}
                onChange={setStockOffset}
              />
            </>
          )}
        </>
      )}
    </ScreenBody>
  );
}
