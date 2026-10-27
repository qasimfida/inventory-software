import { OnlineProductImage } from './OnlineProductImage';
import { onlinePrice } from '@inventory/api-client';
import { useNavigation } from '../shell/Navigation';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { View } from 'react-native';
import { SidePanel } from '../ui/SidePanel';
import { hasPermission } from '@inventory/contracts';
import type { Business, OnlineProductPreview } from '@inventory/contracts';
import {
  createOnlineStoreClient,
  OnlineProductsModel,
  selectionToggle,
  selectOnlineResults,
  candidateLabel,
} from '@inventory/api-client';
import { authClient } from '../auth/client';
import { Action, Field, Choice } from '../ui/Controls';
import { Text } from '../ui/Themed';
import { Checkbox } from '../ui/Checkbox';
import { EmptyState, ErrorState, LoadingState } from '../ui/AsyncState';
import { useTheme } from '../theme';
import { BarcodeScanner } from '../catalog/BarcodeScanner';
import { OnlineBulkResult } from './OnlineBulkResult';
export function OnlineProductPicker({
  business,
  storeId,
  onClose,
}: {
  business: Business;
  storeId: string;
  onClose: () => void;
}) {
  const { navigate } = useNavigation();
  const theme = useTheme(),
    client = useMemo(
      () => createOnlineStoreClient(authClient.organizationRequest, business.id, storeId),
      [business.id, storeId],
    );
  const model = useMemo(() => new OnlineProductsModel(client, () => crypto.randomUUID()), [client]),
    state = useSyncExternalStore(model.subscribe, model.snapshot);
  const [search, setSearch] = useState(''),
    [category, setCategory] = useState(''),
    [inStock, setInStock] = useState(false),
    [readiness, setReadiness] = useState<'all' | 'ready' | 'issues' | 'inactive'>('all'),
    [offset, setOffset] = useState(0),
    [page, setPage] = useState<Awaited<ReturnType<typeof client.products>> | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0),
    [selected, setSelected] = useState(new Map<string, OnlineProductPreview>());
  const q = {
    search,
    inStock: inStock ? ('true' as const) : ('false' as const),
    readiness,
    ...(category ? { category } : {}),
    offset,
    limit: 25,
  };
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setBusy(true);
      void client
        .products(
          {
            search,
            inStock: inStock ? ('true' as const) : ('false' as const),
            readiness,
            ...(category ? { category } : {}),
            offset,
            limit: 25,
          },
          controller.signal,
        )
        .then((p) => {
          if (active) {
            setPage(p);
            setError('');
          }
        })
        .catch((e) => {
          if (active) {
            setError(e.message);
            if ([401, 403, 404].includes(e.status)) setPage(null);
          }
        })
        .finally(() => {
          if (active) setBusy(false);
        });
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [client, search, category, offset, retry, inStock, readiness]);
  const disabled =
    busy ||
    state.busy ||
    !!error ||
    !!state.error ||
    !hasPermission(business, 'onlineStore.manage') ||
    !hasPermission(business, 'products.read');
  function toggle(p: OnlineProductPreview) {
    try {
      setSelected(selectionToggle(selected, p.productId, p));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function term(v: string) {
    setSearch(v);
    setOffset(0);
    setSelected(new Map());
  }
  return (
    <SidePanel
      title="Add online products"
      open
      wide
      onClose={() => {
        if (!state.busy) onClose();
      }}
      footer={
        <View style={{ padding: theme.spacing.medium, backgroundColor: theme.colors.card }}>
          <Text>{selected.size} selected</Text>
          <Action
            label={`Add ${selected.size} selected products`}
            disabled={disabled || !selected.size}
            onPress={() =>
              void model.command({
                action: 'select',
                items: [...selected.values()].map((p) => ({
                  productId: p.productId,
                  variantId: null,
                })),
              })
            }
          />
          <Action label="Close" variant="ghost" disabled={state.busy} onPress={onClose} />
        </View>
      }
    >
      <Text>Select up to 200 products. Nothing is published automatically.</Text>
      <Field label="Search products or barcode" value={search} onChange={term} />
      <BarcodeScanner onCode={term} />
      <Choice
        label="Category"
        value={category}
        options={[
          { value: '', label: 'All categories' },
          ...(page?.categories ?? []).map((c) => ({ value: c.id, label: c.name })),
        ]}
        onChange={(v) => {
          setCategory(v);
          setOffset(0);
          setSelected(new Map());
        }}
      />
      <Checkbox
        label="In stock only"
        value={inStock}
        onChange={(v) => {
          setInStock(v);
          setOffset(0);
          setSelected(new Map());
        }}
      />
      <Choice
        label="Readiness"
        value={readiness}
        options={[
          { value: 'all', label: 'All readiness' },
          { value: 'ready', label: 'Ready' },
          { value: 'issues', label: 'Needs changes' },
          { value: 'inactive', label: 'Inactive / archived' },
        ]}
        onChange={(v) => {
          setReadiness(v as typeof readiness);
          setOffset(0);
          setSelected(new Map());
        }}
      />
      {(error || state.error) && (
        <ErrorState message={error || state.error} onRetry={() => setRetry(retry + 1)} />
      )}
      {busy && <LoadingState message="Loading products…" />}
      <Action
        label={`Select all in results (${page?.total ?? 0}, maximum 200)`}
        disabled={disabled || !page?.total}
        onPress={() => {
          setBusy(true);
          void selectOnlineResults(client, q)
            .then(setSelected)
            .catch((e) => setError(e.message))
            .finally(() => setBusy(false));
        }}
      />
      {!busy && page && !page.items.length && (
        <EmptyState message="No products match" description="Try another search or category." />
      )}
      {page?.items.map((p) => (
        <View key={p.productId}>
          <Checkbox
            label={p.title}
            value={selected.has(p.productId)}
            disabled={disabled || !!p.listingId || p.source.state !== 'active'}
            onChange={() => toggle(p)}
          />
          <OnlineProductImage
            client={client}
            title={p.title}
            {...(p.source.images[0] ? { url: p.source.images[0] } : {})}
          />
          <Text>
            {p.source.variants.map((v) => v.sku).join(', ')} · {p.categoryName}
          </Text>
          <Text>
            {onlinePrice(p)} · {p.quantity} available
          </Text>
          <Text>{candidateLabel(p)}</Text>
        </View>
      ))}
      <Action
        label="Previous"
        disabled={!offset || busy}
        onPress={() => setOffset(Math.max(0, offset - 25))}
      />
      <Text>Page {offset / 25 + 1}</Text>
      <Action
        label="Next"
        disabled={!page?.hasMore || busy}
        onPress={() => setOffset(offset + 25)}
      />

      {state.result && (
        <OnlineBulkResult
          result={state.result}
          onClose={onClose}
          onOpen={(id) => navigate('/online-store/products/' + id)}
          onTab={(tab) => navigate('/online-store/products?tab=' + tab)}
        />
      )}
    </SidePanel>
  );
}
