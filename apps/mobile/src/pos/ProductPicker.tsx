import { useDisplayMoney } from '../ui/useDisplayMoney';
import { Pressable } from 'react-native';
import { CartThumbnail } from './CartThumbnail';
import { IconAction } from '../ui/IconAction';
import { FilterButton } from '../ui/FilterButton';
import { SidePanel } from '../ui/SidePanel';
import { usePageCollection } from '../ui/usePageCollection';
import { Pagination } from '../ui/Pagination';
import { SearchControl } from '../ui/SearchControl';
import { LoadingState, EmptyState, ErrorState } from '../ui/AsyncState';
import { useTheme } from '../theme';
import { Text } from '../ui/Themed';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { cancellableResource, isPosSoldOut } from '@inventory/api-client';
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
  onManage,
}: {
  client: ReturnType<typeof createSalesClient>;
  warehouseId: string;
  add: (item: PosItem) => void;
  disabled: boolean;
  revision?: number;
  onManage?: ((productId: string) => void) | undefined;
}) {
  const { posPriceLabel } = useDisplayMoney();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const theme = useTheme();
  const [detail, setDetail] = useState<PosItem | null>(null);
  const [actions, setActions] = useState<PosItem | null>(null);
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
              ...(categoryId ? { categoryId } : {}),
              availability,
            },
            signal,
          ),
        () => new AbortController(),
      ),
    [client, warehouseId, query, categoryId, availability],
  );
  const { model } = request;
  const rawPageState = useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot);
  const state = usePageCollection(
    rawPageState,
    [warehouseId, query.search, query.code, categoryId, availability],
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
              if (item && !isPosSoldOut(item)) add(item);
            }}
            disabled={disabled}
            busy={state.busy || (!state.data && !state.error)}
            suggestions={
              state.data?.items.map((item) => ({
                value: item.id,
                label: `${item.name} · ${item.sku} · ${isPosSoldOut(item) ? 'Sold' : posPriceLabel(item)}`,
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
        Scan or type a barcode in product search. Products use their configured currency.
      </Text>

      {Boolean(state.error) && (
        <ErrorState message={state.error} onRetry={() => void model.run()} />
      )}
      {state.busy && !state.data && <LoadingState message="Loading products…" />}
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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`View details for ${item.name}`}
              onPress={() => setDetail(item)}
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
                <CartThumbnail
                  key={item.images?.[0] ?? 'missing'}
                  expanded
                  uri={item.images?.[0]}
                  name={item.name}
                />
                <Text tone="muted">{item.sku}</Text>
              </View>
              <Text>{item.name}</Text>
              <Text tone="muted">{item.units.find((unit) => unit.id === item.unitId)?.code}</Text>
            </Pressable>
            <IconAction
              label={`Actions for ${item.name}`}
              icon="⋮"
              onPress={() => setActions(item)}
            />
            <Action
              variant="outline"
              icon="cart"
              label={`${isPosSoldOut(item) ? 'Sold' : item.price ? posPriceLabel(item).replace(/ \/ .*$/, '') : 'Check pricing'}`}
              accessibilityLabel={`${isPosSoldOut(item) ? 'Sold' : 'Add'} ${item.sku} · ${item.name}`}
              disabled={disabled || isPosSoldOut(item)}
              onPress={() => add(item)}
            />
          </View>
        ))}
      </View>
      <Text tone="muted">Price and availability are verified automatically in your cart.</Text>
      <SidePanel title="Product actions" open={!!actions} onClose={() => setActions(null)}>
        <Action
          label="View details"
          onPress={() => {
            setDetail(actions);
            setActions(null);
          }}
        />
        <Action
          label="Edit product / manage listing"
          disabled={disabled || !onManage || !actions?.productId}
          onPress={() => {
            if (actions?.productId) onManage?.(actions.productId);
            setActions(null);
          }}
        />
      </SidePanel>
      <SidePanel title="Product details" open={!!detail} onClose={() => setDetail(null)}>
        {detail && (
          <>
            <Text accessibilityRole="header">{detail.name}</Text>
            <Text>SKU: {detail.sku}</Text>
            <Text>Price: {posPriceLabel(detail)}</Text>
            <Text>
              Selected unit: {detail.units.find((unit) => unit.id === detail.unitId)?.code}
            </Text>
            <Action
              label={isPosSoldOut(detail) ? 'Sold' : 'Add to cart'}
              disabled={disabled || isPosSoldOut(detail)}
              onPress={() => {
                add(detail);
                setDetail(null);
              }}
            />
          </>
        )}
      </SidePanel>
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
