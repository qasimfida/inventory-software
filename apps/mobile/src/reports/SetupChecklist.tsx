import { useNavigation } from '../shell/Navigation';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { View } from 'react-native';
import { createSetupClient, cancellableResource, setupSteps } from '@inventory/api-client';
import { hasPermission } from '@inventory/contracts';
import type { Business } from '@inventory/contracts';
import { authClient } from '../auth/client';
import { Text } from '../ui/Themed';
import { Surface } from '../ui/Surface';
import { Action } from '../ui/Controls';
import { LoadingState } from '../ui/AsyncState';

export function SetupChecklist({ business }: { business: Business }) {
  if (!hasPermission(business, 'business.write') || business.scope?.storeId) return null;
  return <Checklist business={business} />;
}
function Checklist({ business }: { business: Business }) {
  const { navigate } = useNavigation();
  const resource = useMemo(
    () =>
      cancellableResource(
        createSetupClient(authClient.organizationRequest, business.id),
        () => new AbortController(),
      ),
    [business.id],
  );
  const state = useSyncExternalStore(resource.model.subscribe, resource.model.snapshot);
  useEffect(() => {
    void resource.model.run();
    const timer = setInterval(() => void resource.model.refresh(), 15000);
    return () => {
      clearInterval(timer);
      resource.cancel();
    };
  }, [resource]);
  if (state.error)
    return (
      <View>
        <Text accessibilityRole="alert">{state.error}</Text>
        <Action label="Retry business setup" onPress={() => void resource.model.run()} />
      </View>
    );
  if (!state.data) return <LoadingState message="Checking business setup…" />;
  return (
    <Surface>
      <Text accessibilityRole="header">Business setup</Text>
      <Text>
        {setupSteps.filter((step) => state.data?.[step.key]).length} of {setupSteps.length} complete
      </Text>
      <Text tone="muted">Manage the company, locations and catalog used by this workspace.</Text>
      {setupSteps
        .filter((step) => hasPermission(business, step.permission))
        .map((step) => (
          <Action
            key={step.key}
            variant="link"
            label={`${step.label} · ${state.data?.[step.key] ? 'Complete' : 'Needs attention'}`}
            onPress={() => navigate(step.path)}
          />
        ))}
    </Surface>
  );
}
