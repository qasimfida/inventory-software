import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createOnlineStoreClient, OnlineProductsModel } from '@inventory/api-client';
import type { ListingQuery } from '@inventory/contracts';
import { authClient } from '@/platform/auth-client';
import { useCatalogLive } from '@/platform/useCatalogLive';
export function useOnlineProducts(businessId: string, storeId: string, q: Partial<ListingQuery>) {
  const client = useMemo(
    () => createOnlineStoreClient(authClient.organizationRequest, businessId, storeId),
    [businessId, storeId],
  );
  const model = useMemo(() => new OnlineProductsModel(client, () => crypto.randomUUID()), [client]);
  const state = useSyncExternalStore(model.subscribe, model.snapshot);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const identity = JSON.stringify(q);
  useEffect(() => {
    let active = true;
    void client
      .products({ limit: 1 })
      .then((p) => {
        if (active) setCategories(p.categories);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [client]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(
      () => void model.load(JSON.parse(identity) as Partial<ListingQuery>, controller.signal),
      300,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [model, identity]);
  useCatalogLive(businessId, () => {
    if (!model.snapshot().busy) void model.load(q);
  });
  useEffect(() => {
    const timer = setInterval(() => {
      if (!model.snapshot().busy) void model.load(JSON.parse(identity) as Partial<ListingQuery>);
    }, 15000);
    return () => clearInterval(timer);
  }, [model, identity]);
  useEffect(() => () => model.reset(), [model]);
  return { client, model, state, categories };
}
