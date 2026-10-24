import { FilterButton } from '../ui/FilterButton';
import { SidePanel } from '../ui/SidePanel';
import { usePageCollection } from '../ui/usePageCollection';
import { Pagination } from '../ui/Pagination';
import { SearchControl } from '../ui/SearchControl';
import { LoadingState, EmptyState, ErrorState } from '../ui/AsyncState';
import { useTheme } from '../theme';
import { Text } from '../ui/Themed';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { cancellableResource, posPriceLabel } from '@inventory/api-client';
import type { createSalesClient, PosItem } from '@inventory/api-client';
import { View, useWindowDimensions } from 'react-native';
import { Action, Choice } from '../organization/Controls';
import { BarcodeScanner } from '../catalog/BarcodeScanner';
export function ProductPicker({
  client,
  warehouseId,
  add,
  disabled,
  revision = 0,
}: {
  client: ReturnType<typeof createSalesClient>;
  warehouseId: string;
  add: (item: PosItem) => void;
  disabled: boolean;
  revision?: number;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const theme = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const columns = width >= 600 && fontScale <= 1.3;
  const [categoryId, setCategoryId] = useState(''),
    [availability, setAvailability] = useState<'all' | 'in-stock' | 'out-of-stock'>('all');
  const [search, setSearch] = useState(''),
    [query, setQuery] = useState({ search: '', code: '', offset: 0 });
  useEffect(() => {
    const timer = setTimeout(
      () =>
        setQuery((previous) =>
          previous.search === search ? previous : { search, code: '', offset: 0 },
        ),
      300,
    );
    return () => {
      clearTimeout(timer);
    };
  }, [search]);
  const [seenRevision, setSeenRevision] = useState(revision);
  if (seenRevision !== revision) {
    setSeenRevision(revision);
    if (query.offset) setQuery({ ...query, offset: 0 });
  }
  const request = useMemo(
    () =>
      cancellableResource(
        (signal) =>
          client.items(
            {
              warehouseId,
              ...query,
              currency: theme.preferences.currency,
              ...(categoryId ? { categoryId } : {}),
              availability,
            },
            signal,
          ),
        () => new AbortController(),
      ),
    [client, warehouseId, query, theme.preferences.currency, categoryId, availability],
  );
  const { model } = request;
  const rawPageState = useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot);
  const state = usePageCollection(
    rawPageState,
    [warehouseId, query.search, query.code, theme.preferences.currency, categoryId, availability],
    query.offset,
    ['items'],
    () => {
      setQuery((previous) => ({ ...previous, offset: 0 }));
    },
  );
  useEffect(() => {
    void model.run();
    return request.cancel;
  }, [model, request]);
  useEffect(() => {
    if (revision) {
      void model.refresh();
    }
  }, [model, revision]);
  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          gap: theme.spacing.small,
          alignItems: 'flex-start',
          flexWrap: 'nowrap',
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <SearchControl
            label="POS product search"
            value={search}
            onChange={setSearch}
            onSelect={(id) => {
              const item = state.data?.items.find((i) => i.id === id);
              if (item) add(item);
            }}
            disabled={disabled}
            busy={state.busy || (!state.data && !state.error)}
            suggestions={
              state.data?.items.map((item) => ({
                value: item.id,
                label: `${item.name} · ${item.sku} · ${posPriceLabel(item)}`,
              })) ?? []
            }
          />
        </View>
        {!disabled && (
          <BarcodeScanner
            compact
            onCode={(value) => {
              setSearch(value);
              setQuery({ search: value, code: '', offset: 0 });
            }}
          />
        )}
        <FilterButton
          active={[
            categoryId &&
              `Category: ${state.data?.categories.find((c) => c.id === categoryId)?.name ?? categoryId}`,
            availability !== 'all' && `Stock: ${availability}`,
          ].filter((value): value is string => Boolean(value))}
          onPress={() => setFiltersOpen(true)}
        />
      </View>
      <SidePanel title="Product filters" open={filtersOpen} onClose={() => setFiltersOpen(false)}>
        <Choice
          label="Product category"
          value={categoryId}
          onChange={(value) => {
            setCategoryId(value);
            setQuery({ ...query, offset: 0 });
          }}
          disabled={disabled}
          options={[
            { value: '', label: 'All categories' },
            ...(state.data?.categories.map((c) => ({ value: c.id, label: c.name })) ?? []),
          ]}
        />
        <Choice
          label="Product availability"
          value={availability}
          onChange={(value) => {
            setAvailability(
              value === 'in-stock' ? 'in-stock' : value === 'out-of-stock' ? 'out-of-stock' : 'all',
            );
            setQuery({ ...query, offset: 0 });
          }}
          disabled={disabled}
          options={['all', 'in-stock', 'out-of-stock'].map((value) => ({ value, label: value }))}
        />
      </SidePanel>
      <Text tone="muted">
        Scan or type a barcode in product search. Search prices: {theme.preferences.currency}.
      </Text>

      {Boolean(state.error) && (
        <ErrorState message={state.error} onRetry={() => void model.run()} />
      )}
      {state.busy && <LoadingState message="Loading products…" />}
      {state.data?.items.length === 0 && (
        <EmptyState
          message="No products match this search."
          description="Try another search, barcode or filter. Your current warehouse may have no matching products."
        />
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.small }}>
        {state.data?.items.map((item) => (
          <View
            key={item.id}
            style={{
              width: columns ? '47%' : '100%',
              flexGrow: 1,
              padding: theme.spacing.small,
              gap: theme.spacing.small,
              borderRadius: theme.radius,
              borderWidth: 1,
              borderColor: theme.tokens.border,
              backgroundColor: theme.colors.card,
            }}
          >
            <View
              style={{
                minHeight: theme.spacing.large * 4,
                padding: theme.spacing.small,
                borderRadius: theme.radius,
                backgroundColor: theme.tokens.muted,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text accessible={false} tone="info" style={{ fontSize: theme.iconSize }}>
                ▧
              </Text>
              <Text tone="muted">{item.sku}</Text>
            </View>
            <Text style={{ fontWeight: '600' }}>{item.name}</Text>
            <Text tone="muted">{item.units.find((unit) => unit.id === item.unitId)?.code}</Text>
            <Action
              variant="outline"
              icon="cart"
              label={`${item.price ? posPriceLabel(item).replace(/ \/ .*$/, '') : 'Check pricing'}`}
              accessibilityLabel={`Add ${item.sku} · ${item.name}`}
              disabled={disabled}
              onPress={() => add(item)}
            />
          </View>
        ))}
      </View>
      <Text tone="muted">Price and availability are verified automatically in your cart.</Text>
      <Pagination
        label="products"
        offset={query.offset}
        hasMore={state.data?.hasMore ?? false}
        busy={disabled || state.busy}
        onChange={(offset) => setQuery({ ...query, offset })}
      />
    </View>
  );
}
