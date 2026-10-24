import { catalogCsv } from '@inventory/api-client';
import { saveLocalText } from '@/platform/files';
import { useCatalogLive } from '@/platform/useCatalogLive';
import { BulkImport } from './BulkImport';
import { ViewTabs } from '@/components/common/ViewTabs';
import { AccordionSection } from '@/components/ui/Accordion';
import { FormSheet } from '@/components/common/FormSheet';
import { usePageCollection } from '@/components/common/usePageCollection';
import { Pagination } from '@/components/common/Pagination';
import { RefreshCw, Plus } from 'lucide-react';
import { ErrorState, LoadingState } from '@/components/common/AsyncState';
import { PricingPanel } from '../pricing/PricingPanel';
import { useEffect, useId, useMemo, useState, useSyncExternalStore } from 'react';
import { createCatalogClient, cancellableResource } from '@inventory/api-client';
import { catalogQuerySchema, hasPermission } from '@inventory/contracts';
import type { Business, Product, Location } from '@inventory/contracts';
import { authClient } from '@/platform/auth-client';
import { CatalogFilters } from './CatalogFilters';
import { CatalogProducts } from './CatalogProducts';
import { Button } from '@/components/ui/Button';
import { ProductEditor } from './ProductEditor';
import { CategoryEditor } from './CategoryEditor';
export function CatalogPanel({
  business,
  locations,
  initialSearch,
}: {
  business: Business;
  locations: Location[];
  initialSearch?: string | undefined;
}) {
  const panelId = useId();
  const [view, setView] = useState<'list' | 'grid'>('grid');
  const [queryError, setQueryError] = useState('');
  const [query, setQuery] = useState(catalogQuerySchema.parse({ search: initialSearch ?? '' }));
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [pricingProduct, setPricingProduct] = useState<string | null>(null);
  const [previousSearch, setPreviousSearch] = useState(initialSearch);
  if (previousSearch !== initialSearch) {
    setPreviousSearch(initialSearch);

    if (initialSearch !== undefined)
      setQuery((previous) =>
        catalogQuerySchema.parse({ ...previous, search: initialSearch, offset: 0 }),
      );
  }
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
  return (
    <section aria-label="Product catalog" className="screen-section">
      <header className="screen-header">
        <div>
          <h2 className="text-2xl">Product catalog</h2>
          <p className="mt-2 text-muted-foreground">
            Manage products, categories and pricing across your business.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {writable && state.data && (
            <Button
              onClick={() => {
                setEditing(null);
                setCreating(true);
              }}
            >
              <Plus aria-hidden="true" /> New product
            </Button>
          )}
          {writable && (
            <BulkImport
              businessId={business.id}
              locations={locations}
              onDone={() => void model.run()}
            />
          )}
          <Button
            variant="outline"
            disabled={!state.data?.page.items.length}
            onClick={() => {
              void saveLocalText(
                'products-shown.csv',
                catalogCsv(state.data?.page.items ?? []),
                'text/csv',
              ).catch(() => setQueryError('Unable to export products. Try again.'));
            }}
          >
            Export shown products
          </Button>
        </div>
      </header>
      <div className="space-y-4">
        <div className="catalog-toolbar">
          <CatalogFilters
            key={initialSearch}
            initialSearch={initialSearch}
            categories={state.data?.categories ?? []}
            suggestions={
              state.data?.page.items.map((item) => ({
                value: item.sku,
                label: `${item.name} · ${item.sku}`,
              })) ?? []
            }
            busy={state.busy || Boolean(state.error)}
            onSearch={(data) => {
              const parsed = catalogQuerySchema.safeParse({
                ...query,
                search: data.get('search'),
                code: data.get('code') || undefined,
                state: data.get('state') || undefined,
                categoryId: data.get('category') || undefined,
                offset: 0,
              });
              if (parsed.success) {
                setQuery(parsed.data);
                setQueryError('');
                cancel();
              } else setQueryError('Check search and barcode formats.');
            }}
          />
          <Button
            disabled={state.busy}
            onClick={() => void model.run()}
            variant="ghost"
            size="icon"
            aria-label="Refresh catalog"
            title="Refresh"
          >
            <RefreshCw aria-hidden="true" />
          </Button>
          <ViewTabs panelId={panelId} label="Catalog" value={view} onChange={setView} />
        </div>
        <div className="min-w-0 space-y-4">
          {queryError && <p role="alert">{queryError}</p>}
          {state.error && <ErrorState message={state.error} onRetry={() => void model.run()} />}
          {state.busy && <LoadingState message="Loading catalog…" />}

          {state.data && writable && (creating || editing) && (
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

          {pricingProduct && (
            <FormSheet
              title="Variants and pricing"
              open
              onOpenChange={(open) => {
                if (!open) setPricingProduct(null);
              }}
            >
              <PricingPanel
                key={pricingProduct}
                productId={pricingProduct}
                business={business}
                locations={locations}
              />
            </FormSheet>
          )}
          {state.data && (
            <>
              <p>{state.data.page.total} products</p>
              <div id={panelId} role="tabpanel" aria-label={`Catalog ${view} view`} tabIndex={0}>
                <CatalogProducts
                  filtered={Boolean(query.search || query.code || query.state || query.categoryId)}
                  onCreate={() => setCreating(true)}
                  view={view}
                  products={state.data.page.items}
                  writable={writable}
                  onPricing={setPricingProduct}
                  onEdit={(product) => {
                    setEditing(product);
                    setCreating(false);
                  }}
                />
              </div>
              <Pagination
                label="products"
                offset={query.offset}
                pageSize={query.limit}
                total={state.data.page.total}
                hasMore={state.data.page.hasMore}
                busy={state.busy || Boolean(state.error)}
                onChange={(offset) => {
                  cancel();
                  setQuery({ ...query, offset });
                }}
              />
              {writable && (
                <>
                  <AccordionSection
                    className="rounded-lg border p-4"
                    open={categoriesOpen}
                    onOpenChange={setCategoriesOpen}
                    title={<>Manage categories</>}
                  >
                    <CategoryEditor
                      items={state.data.categories}
                      client={client}
                      run={(work) => void model.run(work)}
                    />
                  </AccordionSection>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
