import { useEffect, useState } from 'react';
import { createOnlineStoreClient, onlineStoreChanges } from '@inventory/api-client';
import { hasPermission } from '@inventory/contracts';
import type { Business } from '@inventory/contracts';
import { authClient } from '@/platform/auth-client';
import { useCatalogLive } from '@/platform/useCatalogLive';
export function useOnlineStoreMenu(business: Business | undefined, storeId: string) {
  const [status, setStatus] = useState({ key: '', enabled: false, changes: 0 });
  const key = `${business?.id}:${storeId}:${business?.role}:${business?.permissions?.join(',')}`;
  const [revision, setRevision] = useState(0);
  useCatalogLive(business?.id ?? '', () => setRevision((v) => v + 1));
  useEffect(() => onlineStoreChanges.subscribe(() => setRevision((v) => v + 1)), []);
  useEffect(() => {
    if (!business || !storeId || !hasPermission(business, 'onlineStore.view')) return;
    let current = true;
    const refresh = () =>
      void Promise.all([
        createOnlineStoreClient(authClient.organizationRequest, business.id, storeId).settings(),
        createOnlineStoreClient(authClient.organizationRequest, business.id, storeId).overview(),
      ])
        .then((result) => {
          if (current)
            setStatus({
              key,
              enabled: !!result[0].settings?.enabled,
              changes: result[1].counts.needs_changes,
            });
        })
        .catch(() => {
          if (current) setStatus({ key, enabled: false, changes: 0 });
        });
    refresh();
    const timer = setInterval(refresh, 15000);
    return () => {
      current = false;
      clearInterval(timer);
    };
  }, [business, storeId, key, revision]);
  return status.key === key ? status : { key, enabled: false, changes: 0 };
}
