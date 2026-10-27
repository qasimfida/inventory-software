import { ErrorState, LoadingState } from '../ui/AsyncState';
import { useCatalogLive } from '../platform/useCatalogLive';
import { useOptionalWorkspace } from '../shell/WorkspaceContext';
import { Choice } from '../ui/Controls';
import { usePageCollection } from '../ui/usePageCollection';
import { SearchControl } from '../ui/SearchControl';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Pressable, View } from 'react-native';
import { createInventoryClient, cancellableResource, stockViews } from '@inventory/api-client';
import { stockStatusSchema, hasPermission } from '@inventory/contracts';
import { authClient } from '../auth/client';
import { operationKey } from '../platform/operation-key';
import { useNavigation } from '../shell/Navigation';
import { useTheme } from '../theme';
import { MetricCard } from '../ui/MetricCard';
import { Text } from '../ui/Themed';
import { Pagination } from '../ui/Pagination';
import { IconAction } from '../ui/IconAction';
import { Surface } from '../ui/Surface';
import { InventoryProducts } from './InventoryProducts';
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
  const { navigate: openProductPage } = useNavigation();
  const scope = useOptionalWorkspace();
  const warehouseKey = scope?.warehouseIds.join(',');
  const { stock, navigate } = useNavigation(),
    theme = useTheme();
  const status = stockStatusSchema.catch('all').parse(stock ?? 'all');
  const [search, setSearch] = useState(''),
    [offset, setOffset] = useState(0);
  const client = useMemo(
    () => createInventoryClient(authClient.organizationRequest, operationKey, businessId),
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
  const rawPageState = useSyncExternalStore(
    request.model.subscribe,
    request.model.snapshot,
    request.model.snapshot,
  );
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
    <View style={{ gap: theme.spacing.medium }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.small }}>
        {stockViews.map((view) => (
          <Pressable
            key={view.status}
            accessibilityRole="button"
            accessibilityLabel={view.label}
            accessibilityState={{ selected: status === view.status }}
            onPress={() => {
              setOffset(0);
              navigate(`/inventory?stock=${view.status}`);
            }}
            style={{
              flexGrow: 1,
              flexBasis: '45%',
              borderWidth: parseFloat(theme.tokens['border-width']),
              borderColor: status === view.status ? theme.colors.primary : 'transparent',
              borderRadius: theme.radius,
            }}
          >
            <MetricCard
              contained
              label={view.label}
              value={String(data?.counts[view.status] ?? '—')}
              unit={view.description}
              primary={view.status === 'all'}
              tone={
                view.status === 'in-stock'
                  ? 'success'
                  : view.status === 'low-stock'
                    ? 'warning'
                    : view.status === 'out-of-stock'
                      ? 'destructive'
                      : undefined
              }
            />
          </Pressable>
        ))}
      </View>
      <Surface>
        <Text accessibilityRole="header">
          {stockViews.find((v) => v.status === status)?.label} · Inventory snapshot
        </Text>
        <Text tone="muted">
          Available base units. Low stock up to {data?.threshold ?? '…'} units.
        </Text>
        <IconAction
          label="Refresh"
          icon="↻"
          disabled={state.busy}
          onPress={() => void request.model.run()}
        />
        {state.busy && <Text accessibilityLiveRegion="polite">Loading stock…</Text>}
        {Boolean(state.error) && (
          <ErrorState message={state.error} onRetry={() => void request.model.run()} />
        )}
        {(state.busy || (!data && !state.error)) && <LoadingState message="Loading stock…" />}
        <InventoryProducts
          onDetails={
            scope?.business && hasPermission(scope.business, 'products.read')
              ? (id) => openProductPage(`/catalog/${id}`)
              : undefined
          }
          showEmpty={!!data && !state.busy && !state.error}
          onEdit={onEdit}
          items={data?.items ?? []}
          onAdjust={onAdjust}
          controls={
            <>
              <View style={{ flex: 1, minWidth: 200 }}>
                <SearchControl
                  label="Search inventory products"
                  value={search}
                  onChange={(value) => {
                    setSearch(value);
                    setOffset(0);
                  }}
                  busy={state.busy || (!state.data && !state.error)}
                  suggestions={
                    data?.items.map((item) => ({
                      value: item.sku,
                      label: `${item.name} · ${item.sku}`,
                    })) ?? []
                  }
                />
              </View>
              <View style={{ flexGrow: 1, minWidth: 160 }}>
                <Choice
                  label="Stock status"
                  value={status}
                  options={stockViews.map((v) => ({ value: v.status, label: v.label }))}
                  onChange={(value) => {
                    setOffset(0);
                    navigate(`/inventory?stock=${value}`);
                  }}
                />
              </View>
            </>
          }
        />

        {data && (
          <Pagination
            label="inventory products"
            offset={offset}
            pageSize={data.limit}
            total={data.total}
            hasMore={offset + data.limit < data.total}
            busy={state.busy || Boolean(state.error)}
            onChange={setOffset}
          />
        )}
      </Surface>
    </View>
  );
}
