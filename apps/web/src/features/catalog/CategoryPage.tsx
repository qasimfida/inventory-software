import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { createCatalogClient, ResourceModel } from '@inventory/api-client';
import { hasPermission } from '@inventory/contracts';
import type { Business } from '@inventory/contracts';
import { CategoryEditor } from './CategoryEditor';
import { LoadingState, ErrorState } from '@/components/common/AsyncState';
import { authClient } from '@/platform/auth-client';
export function CategoryPage({ business }: { business: Business }) {
  const client = useMemo(
    () => createCatalogClient(authClient.organizationRequest, business.id),
    [business.id],
  );
  const model = useMemo(() => new ResourceModel(() => client.categories()), [client]);
  const state = useSyncExternalStore(model.subscribe, model.snapshot);
  useEffect(() => {
    void model.run();
    return model.reset;
  }, [model]);
  if (!hasPermission(business, 'products.write') || business.scope?.storeId) return <></>;
  return (
    <section>
      {state.error && <ErrorState message={state.error} onRetry={() => void model.run()} />}
      {!state.data && !state.error && <LoadingState message="Loading categories…" />}
      {state.data && (
        <CategoryEditor
          items={state.data}
          client={client}
          run={(work) => void model.run(work, true)}
        />
      )}
    </section>
  );
}
