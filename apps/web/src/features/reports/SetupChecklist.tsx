import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ArrowUpRight, Check, Circle } from 'lucide-react';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { createSetupClient, cancellableResource, setupSteps } from '@inventory/api-client';
import { hasPermission } from '@inventory/contracts';
import type { Business } from '@inventory/contracts';
import { authClient } from '@/platform/auth-client';
import { ErrorState, LoadingState } from '@/components/common/AsyncState';
import { Link } from 'react-router-dom';
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
  return (
    <nav aria-label="Business setup" className="overview-panel business-setup">
      <div className="overview-panel-heading">
        <h3>Business setup</h3>
        <StatusBadge
          tone={setupSteps.every((step) => state.data?.[step.key]) ? 'success' : 'neutral'}
        >
          {setupSteps.filter((step) => state.data?.[step.key]).length} of {setupSteps.length}{' '}
          complete
        </StatusBadge>
      </div>
      <p className="text-sm text-muted-foreground">
        Manage the company, locations and catalog used by this workspace.
      </p>
      <div className="flex flex-wrap gap-2">
        {setupSteps
          .filter((step) => hasPermission(business, step.permission))
          .map((step) => (
            <Button key={step.key} asChild variant="ghost" size="sm">
              <Link
                to={step.path}
                aria-label={`${step.label} · ${state.data?.[step.key] ? 'Complete' : 'Needs attention'}`}
              >
                {state.data?.[step.key] ? (
                  <Check aria-hidden="true" />
                ) : (
                  <Circle aria-hidden="true" />
                )}
                {step.label}
                <span className="sr-only">
                  {state.data?.[step.key] ? ' · Complete' : ' · Needs attention'}
                </span>
                <ArrowUpRight aria-hidden="true" />
              </Link>
            </Button>
          ))}
      </div>
    </nav>
  );
}
