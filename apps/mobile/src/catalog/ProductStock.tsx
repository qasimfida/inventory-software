import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { View } from 'react-native';
import { createInventoryClient, cancellableResource } from '@inventory/api-client';
import { businessTime } from '@inventory/contracts';
import type { Business, Location } from '@inventory/contracts';
import { authClient } from '../auth/client';
import { Text } from '../ui/Themed';
import { Choice, Action } from '../ui/Controls';
import { LoadingState, EmptyState } from '../ui/AsyncState';
import { useTheme } from '../theme';
function warehouseFor(locations: Location[], selected: string): string | undefined {
  return locations.find((w) => w.id === selected)?.id ?? locations[0]?.id;
}
export function ProductStock({
  business,
  locations,
  productId,
  history,
}: {
  business: Business;
  locations: Location[];
  productId: string;
  history: boolean;
}) {
  const theme = useTheme(),
    warehouses = locations.filter((l) => l.kind === 'warehouses' && l.state === 'active');
  const [selected, setSelected] = useState('');
  const warehouseId = warehouseFor(warehouses, selected);
  if (!warehouseId)
    return (
      <EmptyState message="No accessible active warehouse. Create or request access to a warehouse to view stock." />
    );
  return (
    <View style={{ gap: theme.spacing.medium }}>
      <Choice
        label="Warehouse"
        value={warehouseId}
        options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
        onChange={setSelected}
      />
      <ProductStockData
        key={warehouseId}
        business={business}
        warehouseId={warehouseId}
        productId={productId}
        history={history}
      />
    </View>
  );
}
function ProductStockData({
  business,
  warehouseId,
  productId,
  history,
}: {
  business: Business;
  warehouseId: string;
  productId: string;
  history: boolean;
}) {
  const theme = useTheme();
  const [offset, setOffset] = useState(0),
    [cursor, setCursor] = useState<string | undefined>();
  const request = useMemo(
    () =>
      cancellableResource(
        (signal) =>
          createInventoryClient(authClient.organizationRequest, () => '', business.id).load(
            { warehouseId: warehouseId ?? '', productId, offset, ...(cursor ? { cursor } : {}) },
            signal,
          ),
        () => new AbortController(),
      ),
    [business.id, warehouseId, productId, offset, cursor],
  );
  const state = useSyncExternalStore(request.model.subscribe, request.model.snapshot);
  useEffect(() => {
    if (warehouseId) void request.model.run();
    return request.cancel;
  }, [request, warehouseId]);
  return (
    <View style={{ gap: theme.spacing.medium }}>
      {state.error ? (
        <>
          <Text accessibilityRole="alert">{state.error}</Text>
          <Action label="Retry product stock" onPress={() => void request.model.run()} />
        </>
      ) : !state.data ? (
        <LoadingState message="Loading product stock…" />
      ) : (
        <>
          {history ? (
            state.data.movements.length ? (
              state.data.movements.map((m) => (
                <View key={m.id} style={{ gap: theme.spacing.small }}>
                  <Text>
                    {businessTime(m.createdAt, business.timeZone)} · {m.type}
                  </Text>
                  <Text>{m.reason}</Text>
                  <Text>
                    Quantity: {m.quantityDelta} · Reserved: {m.reservedDelta} · Damaged:{' '}
                    {m.damagedDelta} · Transit: {m.transitDelta}
                  </Text>
                  <Text>Actor: {m.actorId}</Text>
                  <Text>
                    Source: {m.sourceKind} · {m.sourceId}
                  </Text>
                  <Text>
                    Location: {m.locationId} · Variant: {m.variantId}
                  </Text>
                </View>
              ))
            ) : (
              <EmptyState message="No ledger movements for this product in this warehouse." />
            )
          ) : state.data.balances.length ? (
            state.data.balances.map((b) => (
              <View key={`${b.variantId}-${b.locationId}`} style={{ gap: theme.spacing.small }}>
                <Text>
                  {b.sku} · {b.locationName}
                </Text>
                <Text>
                  Unit:{' '}
                  {state.data!.units.find(
                    (u) => u.id === state.data!.items.find((i) => i.id === b.variantId)?.baseUnitId,
                  )?.code ?? 'Base unit'}
                </Text>
                <Text>
                  On hand: {b.onHand} · Reserved: {b.reserved}
                </Text>
                <Text>
                  Damaged: {b.damaged} · Available: {b.available} · Transit: {b.inTransit}
                </Text>
              </View>
            ))
          ) : (
            <EmptyState message="No stock balances for this product in this warehouse." />
          )}
          {history ? (
            <>
              {cursor && <Action label="Latest movements" onPress={() => setCursor(undefined)} />}
              {state.data.nextCursor && (
                <Action
                  label="Older movements"
                  onPress={() => setCursor(state.data!.nextCursor!)}
                />
              )}
            </>
          ) : (
            <>
              {offset > 0 && (
                <Action
                  label="Previous locations"
                  onPress={() => setOffset(Math.max(0, offset - 25))}
                />
              )}
              {offset + state.data.limit < state.data.totals.balances && (
                <Action label="Next locations" onPress={() => setOffset(offset + 25)} />
              )}
            </>
          )}
        </>
      )}
    </View>
  );
}
