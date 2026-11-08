import { RecordCollection } from '@/components/common/RecordCollection';
import { Panel } from '@/components/common/Layout';
import { IconButton } from '@/components/common/IconButton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { WarehouseSelect } from '@/components/common/WarehouseSelect';
import { Pagination } from '@/components/common/Pagination';
import { usePageCollection } from '@/components/common/usePageCollection';
import { RefreshCw, ArrowLeft, Warehouse } from 'lucide-react';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { Table, TableScroll } from '@/components/ui/Table';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createWarehouseViewClient, ResourceModel } from '@inventory/api-client';
import type { Business, Location } from '@inventory/contracts';
import { authClient } from '@/platform/auth-client';
import { Button } from '@/components/ui/Button';
import { EmptyState, LoadingState, ErrorState } from '@/components/common/AsyncState';
export function WarehouseViewPanel({
  business,
  locations,
  warehouseId: selectedWarehouseId,
}: {
  business: Business;
  locations: Location[];
  warehouseId?: string;
}) {
  const warehouses = locations.filter((l) => l.kind === 'warehouses'),
    [localWarehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? ''),
    [locationId, setLocationId] = useState<string>(),
    [offset, setOffset] = useState(0),
    [stockOffset, setStockOffset] = useState(0);
  const warehouseId = selectedWarehouseId ?? localWarehouseId;
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
      {!selectedWarehouseId && (
        <ScreenHeader
          title="Warehouse hierarchy"
          description="Open a location to browse its children and stock."
        />
      )}
      {!selectedWarehouseId && (
        <WarehouseSelect
          label="View warehouse"
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
      )}
      {!warehouseId && <EmptyState message="No warehouses in your scope." />}
      {!state.data && state.busy && <LoadingState message="Loading warehouse view…" />}
      {state.error && <ErrorState message={state.error} onRetry={() => void model.run()} />}
      {state.data && (
        <>
          <Panel aria-label="Browse locations">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3>{state.data.node.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {state.data.node.code} · {state.data.node.type}
                </p>
              </div>
              <StatusBadge tone={state.data.node.state === 'active' ? 'success' : 'neutral'}>
                {state.data.node.state}
              </StatusBadge>
            </div>
            <p className="text-sm text-muted-foreground">
              Open a child location below to explore it. Use Locations to create or edit storage
              details.
            </p>
            <RecordCollection
              showExport={!selectedWarehouseId}
              label="child locations"
              columns={['Name', 'Code', 'Type']}
              onOpen={navigate}
              toolbar={
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!state.data.node.parentId}
                    onClick={() => navigate(state.data!.node.parentId ?? undefined)}
                  >
                    <ArrowLeft aria-hidden="true" />
                    Parent location
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={state.data.node.id === warehouseId}
                    onClick={() => navigate()}
                  >
                    <Warehouse aria-hidden="true" />
                    Warehouse root
                  </Button>
                  <IconButton
                    label="Refresh warehouse view"
                    icon={RefreshCw}
                    disabled={state.busy}
                    onClick={() => void model.run()}
                  />
                </>
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
          </Panel>
          <Panel aria-label="Location stock">
            <h3>Stock at {state.data.node.name}</h3>
            <p className="text-sm text-muted-foreground">
              Only stock stored directly here. Child locations are not included.
            </p>
            {!state.data.stock.length ? (
              <EmptyState
                message="No stock at this location"
                description="Open a child location to check its stock, or use Move stock in Locations to record a movement."
              />
            ) : (
              <TableScroll label="Location stock table">
                <Table>
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Unit</th>
                      <th className="text-right">On hand</th>
                      <th className="text-right">Available</th>
                      <th className="text-right">Damaged</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.data.stock.map((stock) => (
                      <tr key={stock.variantId}>
                        <th scope="row">{stock.sku}</th>
                        <td>{stock.unit}</td>
                        <td className="text-right tabular-nums">{stock.onHand}</td>
                        <td className="text-right tabular-nums">{stock.available}</td>
                        <td className="text-right tabular-nums">{stock.damaged}</td>
                        <td>
                          <StatusBadge tone={stock.low ? 'warning' : 'neutral'}>
                            {stock.low ? 'Low stock' : 'Above threshold'}
                          </StatusBadge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableScroll>
            )}
            <Pagination
              label="location stock"
              offset={stockOffset}
              pageSize={50}
              hasMore={state.data.stockHasMore}
              busy={state.busy || Boolean(state.error)}
              onChange={setStockOffset}
            />
          </Panel>
        </>
      )}
    </section>
  );
}
