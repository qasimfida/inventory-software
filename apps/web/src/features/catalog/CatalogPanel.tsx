import { PricingPanel } from '../pricing/PricingPanel';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createCatalogClient, ResourceModel } from '@inventory/api-client';
import { catalogQuerySchema, hasPermission } from '@inventory/contracts';
import type { Business, Product, Location } from '@inventory/contracts';
import { authClient } from '@/platform/auth-client';
import { Input, Select } from '@/components/ui/FormControls';
import { Button } from '@/components/ui/Button';
import { ProductForm } from './ProductForm';
import { CategoryEditor } from './CategoryEditor';
export function CatalogPanel({
  business,
  locations,
}: {
  business: Business;
  locations: Location[];
}) {
  const [queryError, setQueryError] = useState('');
  const [query, setQuery] = useState(catalogQuerySchema.parse({}));
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [pricingProduct, setPricingProduct] = useState<string | null>(null);
  const client = useMemo(
    () => createCatalogClient(authClient.organizationRequest, business.id),
    [business.id],
  );
  const model = useMemo(
    () =>
      new ResourceModel(async () => ({
        page: await client.list(query),
        categories: await client.categories(),
      })),
    [client, query],
  );
  const state = useSyncExternalStore(model.subscribe, model.snapshot);
  useEffect(() => {
    void model.run();
    return model.reset;
  }, [model]);
  const writable = hasPermission(business, 'products.write') && !business.scope?.storeId;
  const cancel = () => {
    setEditing(null);
    setCreating(false);
  };
  return (
    <section aria-label="Product catalog" className="space-y-4 border-t pt-4">
      <h2>Product catalog</h2>
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
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
      >
        <label htmlFor="catalog-search">Search products</label>
        <Input id="catalog-search" name="search" maxLength={120} />
        <label htmlFor="catalog-code">Scan or enter barcode / SKU</label>
        <Input id="catalog-code" name="code" maxLength={64} />
        <p className="text-sm">
          Keyboard barcode scanners enter codes here; press Enter to search.
        </p>
        <label htmlFor="catalog-status">Filter product status</label>
        <Select id="catalog-status" name="state">
          <option value="">All statuses</option>
          {['active', 'inactive', 'archived'].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
        <label htmlFor="catalog-category">Filter category</label>
        <Select id="catalog-category" name="category">
          <option value="">All categories</option>
          {state.data?.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Button type="submit" disabled={state.busy}>
          Search catalog
        </Button>
      </form>
      {(queryError || state.error) && <p role="alert">{queryError || state.error}</p>}
      {state.busy && <p role="status">Loading catalog…</p>}
      <Button variant="outline" disabled={state.busy} onClick={() => void model.run()}>
        Refresh catalog
      </Button>
      {pricingProduct && (
        <PricingPanel
          key={pricingProduct}
          productId={pricingProduct}
          business={business}
          locations={locations}
        />
      )}
      {state.data && (
        <>
          <p>{state.data.page.total} products</p>
          <ul className="space-y-2">
            {state.data.page.items.map((p) => (
              <li key={p.id} className="rounded border p-3">
                <h3>{p.name}</h3>
                <p>
                  {p.sku} · {p.state} · {p.type}
                </p>
                <p>{p.description}</p>
                {p.images.map((url) => (
                  <img
                    key={url}
                    src={url}
                    alt={p.name}
                    className="h-24 w-24 object-contain"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ))}
                <p>Barcodes: {p.barcodes.join(', ') || 'None'}</p>
                <Button onClick={() => setPricingProduct(p.id)}>
                  Variants and pricing for {p.name}
                </Button>
                {writable && p.state !== 'archived' && (
                  <Button
                    onClick={() => {
                      setEditing(p);
                      setCreating(false);
                    }}
                  >
                    Edit product {p.name}
                  </Button>
                )}
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Button
              disabled={!query.offset}
              onClick={() => {
                cancel();
                setQuery({ ...query, offset: Math.max(0, query.offset - query.limit) });
              }}
            >
              Previous products
            </Button>
            <Button
              disabled={!state.data.page.hasMore}
              onClick={() => {
                cancel();
                setQuery({ ...query, offset: query.offset + query.limit });
              }}
            >
              Next products
            </Button>
          </div>
          {writable && (
            <>
              <Button
                onClick={() => {
                  setEditing(null);
                  setCreating(true);
                }}
              >
                New product
              </Button>
              {(creating || editing) && (
                <ProductForm
                  key={editing?.id ?? 'new'}
                  product={editing}
                  categories={state.data.categories}
                  client={client}
                  run={(work) => void model.run(work)}
                  cancel={cancel}
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
    </section>
  );
}
