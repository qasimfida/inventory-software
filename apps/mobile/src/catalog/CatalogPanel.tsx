import { PricingPanel } from '../pricing/PricingPanel';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Image, Text, View } from 'react-native';
import { createCatalogClient, ResourceModel } from '@inventory/api-client';
import { catalogQuerySchema, hasPermission } from '@inventory/contracts';
import type { Business, Product, Location } from '@inventory/contracts';
import { authClient } from '../auth/client';
import { Action, Choice, choices, Field, styles } from '../organization/Controls';
import { ProductForm } from './ProductForm';
import { CategoryEditor } from './CategoryEditor';
import { BarcodeScanner } from './BarcodeScanner';
export function CatalogPanel({
  business,
  locations,
}: {
  business: Business;
  locations: Location[];
}) {
  const [query, setQuery] = useState(catalogQuerySchema.parse({})),
    [search, setSearch] = useState(''),
    [code, setCode] = useState(''),
    [status, setStatus] = useState(''),
    [category, setCategory] = useState(''),
    [queryError, setQueryError] = useState('');
  const [editing, setEditing] = useState<Product | null>(null),
    [creating, setCreating] = useState(false);
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
  const state = useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot);
  useEffect(() => {
    void model.run();
    return model.reset;
  }, [model]);
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
    <View style={styles.group}>
      <Text accessibilityRole="header" style={styles.heading}>
        Product catalog
      </Text>
      <Field label="Search products" value={search} onChange={setSearch} />
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
      {(queryError || state.error) && (
        <Text accessibilityRole="alert">{queryError || state.error}</Text>
      )}
      {state.busy && <Text>Loading catalog…</Text>}
      <Action label="Refresh catalog" onPress={() => void model.run()} disabled={state.busy} />
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
          <Text>{state.data.page.total} products</Text>
          {state.data.page.items.map((p) => (
            <View key={p.id} style={styles.group}>
              <Text accessibilityRole="header">{p.name}</Text>
              <Text>
                {p.sku} · {p.state} · {p.type}
              </Text>
              <Text>{p.description}</Text>
              {p.images.map((url) => (
                <Image
                  key={url}
                  source={{ uri: url }}
                  accessibilityLabel={p.name}
                  style={{ height: 96, width: 96 }}
                />
              ))}
              <Text>Barcodes: {p.barcodes.join(', ') || 'None'}</Text>
              <Action
                label={`Variants and pricing for ${p.name}`}
                onPress={() => setPricingProduct(p.id)}
              />
              {writable && p.state !== 'archived' && (
                <Action
                  label={`Edit product ${p.name}`}
                  onPress={() => {
                    setEditing(p);
                    setCreating(false);
                  }}
                />
              )}
            </View>
          ))}
          <Action
            label="Previous products"
            disabled={!query.offset}
            onPress={() => {
              cancel();
              setQuery({ ...query, offset: Math.max(0, query.offset - query.limit) });
            }}
          />
          <Action
            label="Next products"
            disabled={!state.data.page.hasMore}
            onPress={() => {
              cancel();
              setQuery({ ...query, offset: query.offset + query.limit });
            }}
          />
          {writable && (
            <>
              <Action
                label="New product"
                onPress={() => {
                  setEditing(null);
                  setCreating(true);
                }}
              />
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
    </View>
  );
}
