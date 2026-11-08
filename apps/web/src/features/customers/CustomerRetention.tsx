import { ErrorState, LoadingState } from '@/components/common/AsyncState';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { createCustomerClient, ResourceModel, customerRetentionForms } from '@inventory/api-client';
import type { Business } from '@inventory/contracts';
import { hasPermission } from '@inventory/contracts';
import { authClient } from '@/platform/auth-client';
import { CommandForm } from '@/components/common/CommandForm';
export function CustomerRetention({ business }: { business: Business }) {
  const client = useMemo(
    () =>
      createCustomerClient(authClient.organizationRequest, () => crypto.randomUUID(), business.id),
    [business.id],
  );
  const model = useMemo(() => new ResourceModel(() => client.retention()), [client]);
  const state = useSyncExternalStore(model.subscribe, model.snapshot);
  useEffect(() => {
    if (hasPermission(business, 'business.write')) void model.run();
    return model.reset;
  }, [model, business]);
  if (!hasPermission(business, 'business.write')) return null;
  return (
    <section className="space-y-3" aria-label="Customer privacy and retention">
      <h3>Customer privacy and retention</h3>
      {state.error ? (
        <ErrorState message={state.error} onRetry={() => void model.run()} />
      ) : !state.data ? (
        <LoadingState message="Loading retention settings…" />
      ) : null}
      {state.data &&
        customerRetentionForms(client, state.data).map((definition) => (
          <CommandForm
            key={definition.title}
            definition={definition}
            run={(work) => void model.run(work)}
          />
        ))}
    </section>
  );
}
