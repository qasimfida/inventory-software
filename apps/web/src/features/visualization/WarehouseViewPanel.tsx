import { WarehouseSelect } from '@/components/common/WarehouseSelect';
import { Pagination } from '@/components/common/Pagination';
import { usePageCollection } from '@/components/common/usePageCollection';
import { RefreshCw } from 'lucide-react';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { Table, TableScroll } from '@/components/ui/Table';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createWarehouseViewClient, ResourceModel } from '@inventory/api-client';
import type { Business, Location } from '@inventory/contracts';
import { authClient } from '@/platform/auth-client';
import { Button } from '@/components/ui/Button';
import { useAppearance } from '@/theme/Appearance';
import { EmptyState, LoadingState, ErrorState } from '@/components/common/AsyncState';
export function WarehouseViewPanel({
  business,
  locations,
}: {
  business: Business;
  locations: Location[];
}) {
  const warehouses = locations.filter((l) => l.kind === 'warehouses'),
    [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? ''),
    [locationId, setLocationId] = useState<string>(),
    [offset, setOffset] = useState(0),
    [stockOffset, setStockOffset] = useState(0),
    [cards, setCards] = useState(false);
  const { preferences } = useAppearance();
  const client = useMemo(
    () => createWarehouseViewClient(authClient.organizationRequest, business.id),
    [business.id],
  );
  const model = useMemo(
    () => new ResourceModel(() => client.load({ warehouseId, locationId, offset, stockOffset })),
    [client, warehouseId, locationId, offset, stockOffset],
  );
  const rawPageState = useSyncExternalStore(model.subscribe, model.snapshot);
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
    if (warehouseId) void model.run();
    return model.reset;
  }, [model, warehouseId]);
  function navigate(id?: string) {
    setLocationId(id);
    setOffset(0);
    setStockOffset(0);
  }
  return (
    <section aria-label="Warehouse hierarchy" className="screen-section">
      <ScreenHeader
        title="Warehouse hierarchy"
        description={
          <>
            Browse actual zones, aisles, racks, shelves and bins. This schematic shows
            relationships, not physical positions or dimensions. Stock belongs to the selected
            location; child locations are not included in its totals.
          </>
        }
      />
      <WarehouseSelect
        label="View warehouse"
        aria-label="View warehouse"
        value={warehouseId}
        onChange={(e) => {
          setWarehouseId(e.target.value);
          navigate();
        }}
      >
        {warehouses.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name}
          </option>
        ))}
      </WarehouseSelect>
      {!warehouseId && <EmptyState message="No warehouses in your scope." />}
      <Button
        disabled={!warehouseId || state.busy}
        onClick={() => void model.run()}
        variant="ghost"
        size="icon"
        aria-label="Refresh warehouse view"
        title="Refresh"
      >
        <RefreshCw aria-hidden="true" />
      </Button>
      {state.busy && <LoadingState message="Loading warehouse view…" />}
      {state.error && <ErrorState message={state.error} onRetry={() => void model.run()} />}
      {state.data && (
        <>
          <h3>
            {state.data.node.name} · {state.data.node.type} · {state.data.node.state}
          </h3>
          <div className="flex flex-wrap gap-2">
            <Button disabled={state.data.node.id === warehouseId} onClick={() => navigate()}>
              Warehouse root
            </Button>
            <Button
              disabled={!state.data.node.parentId}
              onClick={() => navigate(state.data!.node.parentId ?? undefined)}
            >
              Parent location
            </Button>
            {preferences.visualizations === 'enhanced' && (
              <Button aria-pressed={cards} onClick={() => setCards(!cards)}>
                {cards ? 'Use table view' : 'Use 2D hierarchy cards'}
              </Button>
            )}
          </div>
          {!state.data.children.length ? (
            <EmptyState message="No child locations." />
          ) : cards && preferences.visualizations === 'enhanced' ? (
            <div
              aria-label="Schematic child locations"
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            >
              {state.data.children.map((node) => (
                <button
                  type="button"
                  key={node.id}
                  className="min-h-24 rounded-lg border p-4 text-left hover:bg-accent"
                  onClick={() => navigate(node.id)}
                >
                  <span className="block font-semibold">
                    {node.code} · {node.name}
                  </span>
                  <span>
                    {node.type} · {node.state}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <TableScroll label="Child locations table">
              <Table>
                <caption>Child locations</caption>
                <thead>
                  <tr>
                    <th scope="col">Location</th>
                    <th scope="col">Type</th>
                    <th scope="col">State</th>
                  </tr>
                </thead>
                <tbody>
                  {state.data.children.map((node) => (
                    <tr key={node.id}>
                      <th scope="row">
                        <Button variant="ghost" size="sm" onClick={() => navigate(node.id)}>
                          {node.code} · {node.name}
                        </Button>
                      </th>
                      <td>{node.type}</td>
                      <td>{node.state}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableScroll>
          )}
          <div className="flex flex-wrap gap-2">
            <Pagination
              label="locations"
              offset={offset}
              pageSize={50}
              hasMore={state.data.hasMore}
              busy={state.busy || Boolean(state.error)}
              onChange={setOffset}
            />
          </div>
          <h3>Stock at {state.data.node.name}</h3>
          {!state.data.stock.length && <EmptyState message="No recorded stock at this location." />}
          <ul className="record-list">
            {state.data.stock.map((stock) => (
              <li key={stock.variantId}>
                {stock.sku}: {stock.onHand} on hand · {stock.available} available · {stock.damaged}{' '}
                damaged {stock.unit}
                {stock.low ? ' · At or below low-stock threshold' : ''}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Pagination
              label="location stock"
              offset={stockOffset}
              pageSize={50}
              hasMore={state.data.stockHasMore}
              busy={state.busy || Boolean(state.error)}
              onChange={setStockOffset}
            />
          </div>
        </>
      )}
    </section>
  );
}
