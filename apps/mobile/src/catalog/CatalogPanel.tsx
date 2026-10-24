import { FilterButton } from '../ui/FilterButton';
import { catalogCsv } from '@inventory/api-client';
import { saveLocalText } from '../platform/files';
import { useCatalogLive } from '../platform/useCatalogLive';
import { BulkImport } from './BulkImport';
import { CatalogProducts } from './CatalogProducts';
import { ViewTabs } from '../ui/ViewTabs';
import { useTheme } from '../theme';
import { SidePanel } from '../ui/SidePanel';
import { usePageCollection } from '../ui/usePageCollection';
import { Pagination } from '../ui/Pagination';
import { SearchControl } from '../ui/SearchControl';
import { IconAction } from '../ui/IconAction';
import { LoadingState, ErrorState } from '../ui/AsyncState';
import { ScreenBody, ScreenHeader } from '../ui/ScreenHeader';
import { Text } from '../ui/Themed';
import { PricingPanel } from '../pricing/PricingPanel';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { View } from 'react-native';
import { createCatalogClient, cancellableResource } from '@inventory/api-client';
import { catalogQuerySchema, hasPermission } from '@inventory/contracts';
import type { Business, Product, Location } from '@inventory/contracts';
import { authClient } from '../auth/client';
import { Action, Choice, choices, Field } from '../organization/Controls';
import { ProductEditor } from './ProductEditor';
import { CategoryEditor } from './CategoryEditor';
import { BarcodeScanner } from './BarcodeScanner';
export function CatalogPanel({
  business,
  locations,
  initialSearch,
}: {
  business: Business;
  locations: Location[];
  page?: boolean;
  initialSearch?: string | undefined;
}) {
  const theme = useTheme();
  const [grid, setGrid] = useState(true),
    [filtersOpen, setFiltersOpen] = useState(false);
  const [query, setQuery] = useState(catalogQuerySchema.parse({ search: initialSearch ?? '' })),
    [search, setSearch] = useState(initialSearch ?? ''),
    [code, setCode] = useState(''),
    [status, setStatus] = useState(''),
    [category, setCategory] = useState(''),
    [queryError, setQueryError] = useState('');
  const [editing, setEditing] = useState<Product | null>(null),
    [creating, setCreating] = useState(false);
  const [pricingProduct, setPricingProduct] = useState<string | null>(null);
  const [previousSearch, setPreviousSearch] = useState(initialSearch);
  if (previousSearch !== initialSearch) {
    setPreviousSearch(initialSearch);

    if (initialSearch !== undefined) {
      setSearch(initialSearch);
      setQuery((previous) =>
        catalogQuerySchema.parse({ ...previous, search: initialSearch, offset: 0 }),
      );
    }
  }
  useEffect(() => {
    const timer = setTimeout(() => {
      const parsed = catalogQuerySchema.safeParse({
        search,
        state: status || undefined,
        categoryId: category || undefined,
      });
      if (parsed.success) setQuery(parsed.data);
    }, 250);
    return () => clearTimeout(timer);
  }, [search, status, category]);
  const client = useMemo(
    () => createCatalogClient(authClient.organizationRequest, business.id),
    [business.id],
  );
  const priceStores = [
    ...new Set(
      locations
        .filter((l) => l.kind === 'warehouses')
        .map((l) => l.storeId)
        .filter(Boolean),
    ),
  ];
  const priceStoreId = priceStores.length === 1 ? priceStores[0] : undefined;
  const request = useMemo(
    () =>
      cancellableResource(
        async (signal) => ({
          page: await client.list(
            { ...query, ...(priceStoreId ? { storeId: priceStoreId } : {}) },
            signal,
          ),
          categories: await client.categories(),
        }),
        () => new AbortController(),
      ),
    [client, query, priceStoreId],
  );
  const { model } = request;
  const rawPageState = useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot);
  const state = usePageCollection(
    rawPageState,
    [business, priceStoreId, { ...query, offset: undefined }],
    query.offset,
    ['page.items'],
    () => {
      setQuery((previous) => ({ ...previous, offset: 0 }));
    },
  );
  useEffect(() => {
    const timer = setTimeout(() => void model.run(), 250);
    return () => {
      clearTimeout(timer);
      request.cancel();
    };
  }, [model, request]);
  useCatalogLive(business.id, () => {
    if (query.offset > 0) setQuery((old) => ({ ...old, offset: 0 }));
    else void model.refresh();
  });
  const writable = hasPermission(business, 'products.write') && !business.scope?.storeId;
  const cancel = () => {
    setEditing(null);
    setCreating(false);
  };
  function searchFor(scanned = code) {
    const parsed = catalogQuerySchema.safeParse({
      ...query,
      search,
      code: scanned || undefined,
      state: status || undefined,
      categoryId: category || undefined,
      offset: 0,
    });
    if (parsed.success) {
      setQuery(parsed.data);
      setQueryError('');
      cancel();
    } else setQueryError('Check search and barcode formats.');
  }
  return (
    <ScreenBody>
      <ScreenHeader title="Product catalog" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.small }}>
        {writable && (
          <BulkImport
            businessId={business.id}
            locations={locations}
            onDone={() => void model.run()}
          />
        )}
        {writable && state.data && (
          <Action
            label="+ New product"
            onPress={() => {
              setEditing(null);
              setCreating(true);
            }}
          />
        )}
        <Action
          variant="outline"
          label="Export shown products"
          disabled={!state.data?.page.items.length}
          onPress={() => {
            void saveLocalText(
              'products-shown.csv',
              catalogCsv(state.data?.page.items ?? []),
              'text/csv',
            ).catch(() => setQueryError('Unable to export products. Try again.'));
          }}
        />
      </View>
      <View style={{ gap: theme.spacing.small }}>
        <SearchControl
          label="Search products"
          value={search}
          onChange={setSearch}
          busy={state.busy || (!state.data && !state.error)}
          suggestions={
            state.data?.page.items.map((item) => ({
              value: item.sku,
              label: `${item.name} · ${item.sku}`,
            })) ?? []
          }
        />
        <View
          style={{
            flexDirection: 'row',
            gap: theme.spacing.small,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <FilterButton
            active={[
              query.state && `Status: ${query.state}`,
              query.categoryId &&
                `Category: ${state.data?.categories.find((c) => c.id === query.categoryId)?.name ?? query.categoryId}`,
              query.code && `Code: ${query.code}`,
            ].filter((value): value is string => Boolean(value))}
            onPress={() => setFiltersOpen(true)}
          />
          <ViewTabs grid={grid} onChange={setGrid} label="Catalog" />
        </View>
      </View>
      <SidePanel title="Catalog filters" open={filtersOpen} onClose={() => setFiltersOpen(false)}>
        <Field label="Scan or enter barcode / SKU" value={code} onChange={setCode} />
        <BarcodeScanner
          onCode={(value) => {
            setCode(value);
            searchFor(value);
          }}
        />
        <Choice
          label="Filter product status"
          value={status}
          onChange={setStatus}
          options={[
            { value: '', label: 'All statuses' },
            ...choices(['active', 'inactive', 'archived']),
          ]}
        />
        <Choice
          label="Filter category"
          value={category}
          onChange={setCategory}
          options={[
            { value: '', label: 'All categories' },
            ...(state.data?.categories ?? []).map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
        <Action label="Search catalog" onPress={() => searchFor()} disabled={state.busy} />
      </SidePanel>
      {Boolean(queryError) && <Text accessibilityRole="alert">{queryError}</Text>}
      {Boolean(state.error) && (
        <ErrorState message={state.error} onRetry={() => void model.run()} />
      )}
      {state.busy && <LoadingState message="Loading catalog…" />}
      <IconAction
        label="Refresh catalog"
        onPress={() => void model.run()}
        disabled={state.busy}
        icon="↻"
      />
      {pricingProduct !== null && (
        <SidePanel title="Variants and pricing" open onClose={() => setPricingProduct(null)}>
          <PricingPanel
            key={pricingProduct}
            productId={pricingProduct}
            business={business}
            locations={locations}
          />
        </SidePanel>
      )}
      {state.data && (
        <>
          <Text>{state.data.page.total} products</Text>
          <CatalogProducts
            filtered={Boolean(query.search || query.code || query.state || query.categoryId)}
            onCreate={() => setCreating(true)}
            products={state.data.page.items}
            grid={grid}
            writable={writable}
            onPricing={setPricingProduct}
            onEdit={(product) => {
              setEditing(product);
              setCreating(false);
            }}
          />
          <Pagination
            label="products"
            offset={query.offset}
            pageSize={query.limit}
            total={state.data.page.total}
            hasMore={state.data.page.hasMore}
            busy={state.busy || (!state.data && !state.error)}
            onChange={(offset) => {
              cancel();
              setQuery({ ...query, offset });
            }}
          />
          {writable && (
            <>
              {(creating || editing) && (
                <ProductEditor
                  key={editing?.id ?? 'new'}
                  product={editing}
                  categories={state.data.categories}
                  client={client}
                  onClose={cancel}
                  onSaved={(product) => {
                    cancel();
                    setPricingProduct(product.id);
                    void model.run();
                  }}
                  onPricing={(id) => {
                    setPricingProduct(id);
                    cancel();
                  }}
                />
              )}
              <CategoryEditor
                items={state.data.categories}
                client={client}
                run={(work) => void model.run(work)}
              />
            </>
          )}
        </>
      )}
    </ScreenBody>
  );
}
