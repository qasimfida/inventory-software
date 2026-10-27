import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createInventoryClient, cancellableResource } from '@inventory/api-client';
import type { Business, Location } from '@inventory/contracts';
import { authClient } from '@/platform/auth-client';
import { Select } from '@/components/ui/FormControls';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/AsyncState';
import { StockTable } from '../inventory/StockTable';
import { MovementHistory } from '../inventory/MovementHistory';
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
  const warehouses = locations.filter((l) => l.kind === 'warehouses' && l.state === 'active');
  const [selected, setSelected] = useState('');
  const warehouseId = warehouseFor(warehouses, selected);
  if (!warehouseId)
    return (
      <EmptyState message="No accessible active warehouse. Create or request access to a warehouse to view stock." />
    );
  return (
    <section className="space-y-3">
      <label htmlFor="product-warehouse">Warehouse</label>
      <Select
        id="product-warehouse"
        value={warehouseId}
        onChange={(e) => setSelected(e.target.value)}
      >
        {warehouses.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name}
          </option>
        ))}
      </Select>
      <ProductStockData
        key={warehouseId}
        business={business}
        warehouseId={warehouseId}
        productId={productId}
        history={history}
      />
    </section>
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
  const [offset, setOffset] = useState(0),
    [cursor, setCursor] = useState<string | undefined>();
  const request = useMemo(
    () =>
      cancellableResource(
        (signal) =>
          createInventoryClient(
            authClient.organizationRequest,
            () => crypto.randomUUID(),
            business.id,
          ).load(
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
    <section className="space-y-3">
      {state.error ? (
        <ErrorState message={state.error} onRetry={() => void request.model.run()} />
      ) : !state.data ? (
        <LoadingState message="Loading product stock…" />
      ) : (
        <>
          {history ? (
            state.data.movements.length ? (
              <MovementHistory stock={state.data} timeZone={business.timeZone} />
            ) : (
              <EmptyState message="No ledger movements for this product in this warehouse." />
            )
          ) : (
            <StockTable stock={state.data} />
          )}
          {history ? (
            <>
              {cursor && <Button onClick={() => setCursor(undefined)}>Latest movements</Button>}
              {state.data.nextCursor && (
                <Button onClick={() => setCursor(state.data!.nextCursor!)}>Older movements</Button>
              )}
            </>
          ) : (
            <>
              {offset > 0 && (
                <Button onClick={() => setOffset(Math.max(0, offset - 25))}>
                  Previous locations
                </Button>
              )}
              {offset + state.data.limit < state.data.totals.balances && (
                <Button onClick={() => setOffset(offset + 25)}>Next locations</Button>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
