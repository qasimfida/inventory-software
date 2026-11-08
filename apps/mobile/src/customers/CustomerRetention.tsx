import { ErrorState, LoadingState } from '../ui/AsyncState';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { createCustomerClient, ResourceModel, customerRetentionForms } from '@inventory/api-client';
import type { Business } from '@inventory/contracts';
import { hasPermission } from '@inventory/contracts';
import { authClient } from '../auth/client';
import { CommandForm } from '../components/CommandForm';
import { View } from 'react-native';
import { Text } from '../ui/Themed';
import { operationKey } from '../platform/operation-key';
export function CustomerRetention({ business }: { business: Business }) {
  const client = useMemo(
    () => createCustomerClient(authClient.organizationRequest, operationKey, business.id),
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
    <View accessibilityLabel="Customer privacy and retention">
      <Text accessibilityRole="header">Customer privacy and retention</Text>
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
    </View>
  );
}
