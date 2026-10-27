import { useOptionalWorkspace } from '@/shell/WorkspaceContext';
import { authClient } from '@/platform/auth-client';
import { useCatalogLive } from '@/platform/useCatalogLive';
import { useEffect, useMemo, useState } from 'react';
import { hasPermission } from '@inventory/contracts';
import type { Business, ChannelListing } from '@inventory/contracts';
import { productChannels, onlineStoreChanges, onlineError } from '@inventory/api-client';
export function useOnlineCollection(
  ids: string[],
  explicit?: { business: Business; storeId: string },
) {
  const workspace = useOptionalWorkspace(),
    business = explicit?.business ?? workspace?.business,
    stores =
      workspace?.state.workspace?.locations.filter(
        (l) => l.kind === 'stores' && l.state === 'active',
      ) ?? [],
    storeId =
      explicit?.storeId ??
      (workspace?.storeId ||
        business?.scope?.storeId ||
        (stores.length === 1 ? stores[0]!.id : ''));
  const allowed = !!business && hasPermission(business, 'onlineStore.view') && !!storeId;
  const api = useMemo(
    () =>
      allowed && business
        ? productChannels(authClient.organizationRequest, business, storeId, () =>
            crypto.randomUUID(),
          )
        : null,
    [business, storeId, allowed],
  );
  const key = [...new Set(ids)].sort().join(',');
  const [snapshot, setSnapshot] = useState<{ api: typeof api; items: ChannelListing[] }>({
      api: null,
      items: [],
    }),
    [result, setResult] = useState<Awaited<ReturnType<NonNullable<typeof api>['add']>>>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0),
    [selected, setSelected] = useState<string[]>([]);
  const refresh = () => setRevision((v) => v + 1);
  useCatalogLive(business?.id, refresh);
  useEffect(() => onlineStoreChanges.subscribe(refresh), []);
  useEffect(() => {
    let active = true;
    if (!api) return;
    void api
      .load(key ? key.split(',') : [])
      .then((items) => {
        if (active) {
          setSnapshot({ api, items });
          setError('');
        }
      })
      .catch((e) => {
        if (active) {
          setSnapshot({ api, items: [] });
          setError(onlineError(e));
        }
      });
    const timer = setInterval(refresh, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [api, key, revision]);
  const items = snapshot.api === api ? snapshot.items : [];
  const visibleSelected = selected.filter((id) => ids.includes(id));
  async function transition(listing: ChannelListing) {
    if (!api || busy || error || !api.canManage) return;
    setBusy(true);
    try {
      const result = await api.commands.command({
        action: listing.status === 'paused' ? 'resume' : 'pause',
        items: [{ id: listing.id, version: listing.version }],
        all: false,
      });
      if (result) {
        setResult(result);
        refresh();
      } else setError(api.commands.snapshot().error);
    } finally {
      setBusy(false);
    }
  }
  async function add(productIds: string[]) {
    if (!api || busy || error || !api.canManage) return;
    setBusy(true);
    try {
      const result = await api.add(productIds);
      if (result) {
        setSelected([]);
        setResult(result);
        setError('');
        refresh();
      } else setError(api.commands.snapshot().error);
    } finally {
      setBusy(false);
    }
  }
  return {
    result,
    clearResult: () => setResult(null),
    items,
    allowed,
    manage: !!api?.canManage && snapshot.api === api && !error,
    transition,
    storeId,
    error,
    busy,
    selected: visibleSelected,
    setSelected,
    add,
    refresh,
    api,
    toggle: (id: string) =>
      setSelected((old) =>
        old.includes(id) ? old.filter((v) => v !== id) : old.length < 200 ? [...old, id] : old,
      ),
  };
}
