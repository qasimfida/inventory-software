import { OnlineProductImage } from './OnlineProductImage';
import { onlinePrice } from '@inventory/api-client';
import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { hasPermission } from '@inventory/contracts';
import type { Business, OnlineProductPreview } from '@inventory/contracts';
import {
  createOnlineStoreClient,
  OnlineProductsModel,
  selectionToggle,
  selectOnlineResults,
  candidateLabel,
} from '@inventory/api-client';
import { authClient } from '@/platform/auth-client';
import { FormSheet } from '@/components/common/FormSheet';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/FormControls';
import { Checkbox } from '@/components/ui/Checkbox';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/AsyncState';
import { useStorefrontOnline } from './useStorefrontOnline';
import { OnlineBulkResult } from './OnlineBulkResult';
import { useSyncExternalStore } from 'react';
export function OnlineProductPicker({
  business,
  storeId,
  onClose,
}: {
  business: Business;
  storeId: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const client = useMemo(
    () => createOnlineStoreClient(authClient.organizationRequest, business.id, storeId),
    [business.id, storeId],
  );
  const model = useMemo(() => new OnlineProductsModel(client, () => crypto.randomUUID()), [client]),
    state = useSyncExternalStore(model.subscribe, model.snapshot),
    online = useStorefrontOnline();
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
    !online ||
    !!error ||
    !hasPermission(business, 'onlineStore.manage') ||
    !hasPermission(business, 'products.read');
  function toggle(p: OnlineProductPreview) {
    try {
      setSelected(selectionToggle(selected, p.productId, p));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <FormSheet
      title="Add online products"
      description="Select up to 200 products. Products are checked before they can be published."
      open
      onOpenChange={(v) => {
        if (!v && !state.busy) onClose();
      }}
    >
      <div className="flex flex-wrap gap-2">
        <label htmlFor="online-picker-search">
          Search products or barcode
          <Input
            id="online-picker-search"
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOffset(0);
              setSelected(new Map());
            }}
          />
        </label>
        <label>
          Category
          <Select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setOffset(0);
              setSelected(new Map());
            }}
          >
            <option value="">All categories</option>
            {page?.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </label>
      </div>
      <div className="flex flex-wrap gap-3">
        <label htmlFor="online-in-stock" className="flex items-center gap-2">
          <Checkbox
            id="online-in-stock"
            checked={inStock}
            onCheckedChange={(v) => {
              setInStock(!!v);
              setOffset(0);
              setSelected(new Map());
            }}
          />
          In stock only
        </label>
        <label htmlFor="online-readiness">
          Readiness
          <Select
            id="online-readiness"
            value={readiness}
            onChange={(e) => {
              setReadiness(e.target.value as typeof readiness);
              setOffset(0);
              setSelected(new Map());
            }}
          >
            <option value="all">All readiness</option>
            <option value="ready">Ready</option>
            <option value="issues">Needs changes</option>
            <option value="inactive">Inactive / archived</option>
          </Select>
        </label>
      </div>
      {(error || state.error) && (
        <ErrorState message={error || state.error} onRetry={() => setRetry(retry + 1)} />
      )}
      {!online && <p role="status">Offline — selection commands are unavailable.</p>}
      {busy && <LoadingState message="Loading products…" />}
      <Button
        variant="outline"
        disabled={disabled || !page?.total}
        onClick={() => {
          setBusy(true);
          void selectOnlineResults(client, q)
            .then(setSelected)
            .catch((e) => setError(e.message))
            .finally(() => setBusy(false));
        }}
      >
        Select all in results ({page?.total ?? 0}, maximum 200)
      </Button>
      {!busy && page && !page.items.length && (
        <EmptyState message="No products match" description="Try a different search or category." />
      )}
      <ul className="space-y-3">
        {page?.items.map((p) => (
          <li key={p.productId} className="flex items-center gap-3 border-b py-3">
            <Checkbox
              aria-label={`Select ${p.title}`}
              checked={selected.has(p.productId)}
              disabled={disabled || !!p.listingId || p.source.state !== 'active'}
              onCheckedChange={() => toggle(p)}
            />
            <OnlineProductImage
              client={client}
              title={p.title}
              {...(p.source.images[0] ? { url: p.source.images[0] } : {})}
            />
            <div className="min-w-0 break-words">
              <p>{p.title}</p>
              <p className="text-muted-foreground">
                {p.source.variants.map((v) => v.sku).join(', ')} · {p.categoryName}
              </p>
              <p>
                {onlinePrice(p)} · {p.quantity} available
              </p>
              <small>{candidateLabel(p)}</small>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Button disabled={!offset || busy} onClick={() => setOffset(Math.max(0, offset - 25))}>
          Previous
        </Button>
        <span>Page {offset / 25 + 1}</span>
        <Button disabled={!page?.hasMore || busy} onClick={() => setOffset(offset + 25)}>
          Next
        </Button>
      </div>
      <div className="sticky bottom-0 flex flex-wrap gap-2 border-t bg-card py-3">
        <span>{selected.size} selected</span>
        <Button
          disabled={disabled || !selected.size}
          onClick={() =>
            void model.command({
              action: 'select',
              items: [...selected.values()].map((p) => ({
                productId: p.productId,
                variantId: null,
              })),
            })
          }
        >
          Add {selected.size} selected products
        </Button>
        <Button variant="ghost" disabled={state.busy} onClick={onClose}>
          Close
        </Button>
      </div>
      {state.result && (
        <OnlineBulkResult
          result={state.result}
          onClose={onClose}
          onOpen={(id) => void navigate('/online-store/products/' + id)}
          onTab={(tab) => void navigate('/online-store/products?tab=' + tab)}
        />
      )}
    </FormSheet>
  );
}
