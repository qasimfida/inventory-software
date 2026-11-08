import { useDisplayMoney } from '@/theme/useDisplayMoney';
import { CartThumbnail } from './CartThumbnail';
import { RowActions } from '@/components/common/RowActions';
import { FormSheet } from '@/components/common/FormSheet';
import { FilterButton } from '@/components/common/FilterButton';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/Popover';
import { usePageCollection } from '@/components/common/usePageCollection';
import { ShoppingCart, ScanBarcode } from 'lucide-react';
import { EmptyState, LoadingState, ErrorState } from '@/components/common/AsyncState';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { cancellableResource, isPosSoldOut } from '@inventory/api-client';
import type { createSalesClient, PosItem } from '@inventory/api-client';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/FormControls';
import { SearchControl } from '@/components/common/SearchControl';
import { Pagination } from '@/components/common/Pagination';
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

  const [detail, setDetail] = useState<PosItem | null>(null);
  const lookup = useRef<HTMLDivElement>(null);
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
    <div className="pos-products space-y-4">
      <div className="pos-lookup" ref={lookup}>
        <SearchControl
          label="POS product search"
          value={search}
          onChange={setSearch}
          onSubmit={() => setQuery({ search, code: '', offset: 0 })}
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
        <Button
          variant="ghost"
          size="icon"
          aria-label="Look up barcode in product search"
          disabled={disabled || !search}
          onClick={() => {
            setQuery({ search, code: '', offset: 0 });
            lookup.current?.querySelector('input')?.focus();
          }}
        >
          <ScanBarcode />
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <FilterButton
              active={[
                categoryId &&
                  `Category: ${state.data?.categories.find((c) => c.id === categoryId)?.name ?? categoryId}`,
                availability !== 'all' && `Stock: ${availability}`,
              ].filter((value): value is string => Boolean(value))}
            />
          </PopoverTrigger>
          <PopoverContent align="end" className="space-y-3">
            <h3>Product filters</h3>
            <span className="text-sm text-muted-foreground">
              Product prices use their configured currency
            </span>
            <Select
              aria-label="Product category"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setQuery({ ...query, offset: 0 });
              }}
              disabled={disabled}
            >
              <option value="">All categories</option>
              {state.data?.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Product availability"
              value={availability}
              onChange={(e) => {
                setAvailability(
                  e.target.value === 'in-stock'
                    ? 'in-stock'
                    : e.target.value === 'out-of-stock'
                      ? 'out-of-stock'
                      : 'all',
                );
                setQuery({ ...query, offset: 0 });
              }}
              disabled={disabled}
            >
              <option value="all">All stock</option>
              <option value="in-stock">In stock</option>
              <option value="out-of-stock">Out of stock</option>
            </Select>
          </PopoverContent>
        </Popover>
      </div>
      {state.error && <ErrorState message={state.error} onRetry={() => void model.run()} />}
      {state.busy && !state.data && <LoadingState message="Loading products…" />}
      {state.data?.items.length === 0 && (
        <EmptyState
          message="No products match this search."
          description="Try another search, barcode or filter. Your current warehouse may have no matching products."
        />
      )}
      <ul className="product-grid">
        {state.data?.items.map((item) => (
          <li key={item.id} className="product-card product-card-link">
            <div className="product-art" aria-hidden="true">
              <CartThumbnail
                key={item.images?.[0] ?? 'missing'}
                uri={item.images?.[0]}
                name={item.name}
              />
              <span>{item.sku}</span>
            </div>
            <div className="space-y-1">
              <Button
                variant="ghost"
                className="product-card-title"
                onClick={() => setDetail(item)}
              >
                {item.name}
              </Button>
              <div className="product-card-actions">
                <RowActions
                  label={item.name}
                  actions={[
                    { label: 'View details', onSelect: () => setDetail(item) },
                    {
                      label: 'Edit product / manage listing',
                      disabled: disabled || !onManage || !item.productId,
                      onSelect: () => {
                        if (item.productId) onManage?.(item.productId);
                      },
                    },
                  ]}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {item.sku} · {item.units.find((u) => u.id === item.unitId)?.code}
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full"
              aria-label={`${isPosSoldOut(item) ? 'Sold' : 'Add'} ${item.sku} · ${item.name}`}
              disabled={disabled || isPosSoldOut(item)}
              onClick={() => add(item)}
            >
              <ShoppingCart aria-hidden="true" />
              {isPosSoldOut(item)
                ? 'Sold'
                : item.price
                  ? posPriceLabel(item).replace(/ \/ .*$/, '')
                  : 'Check pricing'}
            </Button>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        Scan or type in the same search field. Prices shown are per base unit before tax and
        discounts; the cart verifies final pricing.
      </p>
      <FormSheet
        title="Product details"
        description="Current catalog information. Checkout verifies the final price and availability."
        open={!!detail}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
      >
        {detail && (
          <>
            <h3>{detail.name}</h3>
            <dl className="record-details">
              <dt>SKU</dt>
              <dd>{detail.sku}</dd>
              <dt>Price</dt>
              <dd>{posPriceLabel(detail)}</dd>
              <dt>Selected unit</dt>
              <dd>{detail.units.find((unit) => unit.id === detail.unitId)?.code}</dd>
            </dl>
            <Button
              disabled={disabled || isPosSoldOut(detail)}
              onClick={() => {
                add(detail);
                setDetail(null);
              }}
            >
              {isPosSoldOut(detail) ? 'Sold' : 'Add to cart'}
            </Button>
          </>
        )}
      </FormSheet>
      <Pagination
        label="products"
        offset={query.offset}
        hasMore={state.data?.hasMore ?? false}
        busy={disabled || state.busy}
        onChange={(offset) => setQuery({ ...query, offset })}
      />
    </div>
  );
}
