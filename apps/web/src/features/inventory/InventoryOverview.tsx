import { useNavigate } from 'react-router-dom';
import { useCatalogLive } from '@/platform/useCatalogLive';
import { useOptionalWorkspace } from '@/shell/WorkspaceContext';
import { Select } from '@/components/ui/FormControls';
import { usePageCollection } from '@/components/common/usePageCollection';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Package, ArrowUpRight, ArrowDownRight, PackageX, RefreshCw } from 'lucide-react';
import { createInventoryClient, cancellableResource, stockViews } from '@inventory/api-client';
import { stockStatusSchema, hasPermission } from '@inventory/contracts';
import { authClient } from '@/platform/auth-client';
import { MetricCard } from '@/components/common/MetricCard';
import { Pagination } from '@/components/common/Pagination';
import { ErrorState, LoadingState } from '@/components/common/AsyncState';
import { Button } from '@/components/ui/Button';
import { InventoryProducts } from './InventoryProducts';
import { SearchControl } from '@/components/common/SearchControl';
const icons = [Package, ArrowUpRight, ArrowDownRight, PackageX];
export function InventoryOverview({
  businessId,
  warehouseId,
  revision,
  onAdjust,
  onEdit,
}: {
  businessId: string;
  warehouseId: string;
  revision?: unknown;
  onEdit?: ((productId: string) => void) | undefined;
  onAdjust?: ((sku: string) => void) | undefined;
}) {
  const openProductPage = useNavigate();
  const scope = useOptionalWorkspace();
  const warehouseKey = scope?.warehouseIds.join(',');
  const [params, setParams] = useSearchParams();
  const status = stockStatusSchema.catch('all').parse(params.get('stock') ?? 'all');
  const [search, setSearch] = useState(''),
    [offset, setOffset] = useState(0);
  const client = useMemo(
    () =>
      createInventoryClient(authClient.organizationRequest, () => crypto.randomUUID(), businessId),
    [businessId],
  );
  const request = useMemo(
    () =>
      cancellableResource(
        (signal) =>
          client.overview(
            {
              warehouseId,
              search,
              status,
              offset,
              warehouseIds:
                warehouseKey === undefined ? undefined : warehouseKey.split(',').filter(Boolean),
            },
            signal,
          ),
        () => new AbortController(),
      ),
    [client, warehouseId, search, status, offset, warehouseKey],
  );
  const rawPageState = useSyncExternalStore(request.model.subscribe, request.model.snapshot);
  const state = usePageCollection(
    rawPageState,
    [businessId, warehouseId, search, status],
    offset,
    ['items'],
    () => {
      setOffset(0);
    },
  );
  useEffect(() => {
    const timer = setTimeout(() => void request.model.run(), 250);
    return () => {
      clearTimeout(timer);
      request.cancel();
    };
  }, [request, revision]);
  useCatalogLive(businessId, () => {
    if (offset > 0) setOffset(0);
    else void request.model.refresh();
  });
  const data = state.data;
  return (
    <section className="space-y-5" aria-label="Inventory overview">
      <div className="metric-grid">
        {stockViews.map((view, i) => {
          const Icon = icons[i]!;
          return (
            <button
              key={view.status}
              type="button"
              className={`stock-metric stock-metric-${view.status}`}
              aria-pressed={status === view.status}
              onClick={() => {
                setOffset(0);
                setParams((old) => {
                  const next = new URLSearchParams(old);
                  next.set('stock', view.status);
                  return next;
                });
              }}
            >
              <Icon aria-hidden="true" />
              <MetricCard
                label={view.label}
                value={data?.counts[view.status] ?? '—'}
                unit={view.description}
                primary={view.status === 'all'}
              />
            </button>
          );
        })}
      </div>
      <div className="inventory-snapshot space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3>{stockViews.find((v) => v.status === status)?.label} · Inventory snapshot</h3>
            <p className="text-sm text-muted-foreground">
              Available units by SKU across the selected workspace locations. Low-stock threshold:{' '}
              {data?.threshold ?? '…'} base units (positive availability only).
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Refresh"
            disabled={state.busy}
            onClick={() => void request.model.run()}
          >
            <RefreshCw />
          </Button>
        </div>
        {state.error && (
          <ErrorState message={state.error} onRetry={() => void request.model.run()} />
        )}
        {(state.busy || (!data && !state.error)) && <LoadingState message="Loading stock…" />}
        <InventoryProducts
          onDetails={
            scope?.business && hasPermission(scope.business, 'products.read')
              ? (id) => {
                  void openProductPage(`/catalog/${id}`);
                }
              : undefined
          }
          showEmpty={!!data && !state.busy && !state.error}
          onEdit={onEdit}
          items={data?.items ?? []}
          onAdjust={onAdjust}
          controls={
            <>
              <SearchControl
                label="Search inventory products"
                value={search}
                onChange={(value) => {
                  setSearch(value);
                  setOffset(0);
                }}
                suggestions={
                  data?.items.map((item) => ({
                    value: item.sku,
                    label: `${item.name} · ${item.sku}`,
                  })) ?? []
                }
                busy={state.busy || (!state.data && !state.error)}
              />
              <Select
                aria-label="Stock status"
                value={status}
                onChange={(e) => {
                  setOffset(0);
                  setParams((old) => {
                    const next = new URLSearchParams(old);
                    next.set('stock', e.target.value);
                    return next;
                  });
                }}
              >
                {stockViews.map((v) => (
                  <option key={v.status} value={v.status}>
                    {v.label}
                  </option>
                ))}
              </Select>
            </>
          }
        />
        {data && (
          <>
            <Pagination
              label="inventory products"
              offset={offset}
              pageSize={data.limit}
              total={data.total}
              hasMore={offset + data.limit < data.total}
              busy={state.busy || (!state.data && !state.error)}
              onChange={setOffset}
            />
          </>
        )}
      </div>
    </section>
  );
}
