import { useEffect, useMemo, useSyncExternalStore } from 'react';
import {
  createSetupClient,
  cancellableResource,
  setupSteps,
  dismissSetup,
} from '@inventory/api-client';
import { hasPermission } from '@inventory/contracts';
import type { Business } from '@inventory/contracts';
import { authClient } from '@/platform/auth-client';
import { ErrorState, LoadingState } from '@/components/common/AsyncState';
import { SetupCard } from '@/components/common/SetupCard';
export function SetupChecklist({ business }: { business: Business }) {
  if (!hasPermission(business, 'business.write') || business.scope?.storeId) return null;
  return <Checklist business={business} />;
}
function Checklist({ business }: { business: Business }) {
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
    return <ErrorState message={state.error} onRetry={() => void resource.model.run()} />;
  if (!state.data) return <LoadingState message="Checking business setup…" />;
  if (state.data.dismissed) return null;
  return (
    <SetupCard
      title="Business setup"
      steps={setupSteps.map((step) => ({
        id: step.key,
        title: step.label,
        path: step.path,
        done: state.data![step.key],
        allowed: hasPermission(business, step.permission),
      }))}
      onDismiss={() =>
        void dismissSetup(authClient.organizationRequest, business.id)
          .then(() => resource.model.run())
          .catch(() => resource.model.run())
      }
      busy={state.busy}
    />
  );
}
