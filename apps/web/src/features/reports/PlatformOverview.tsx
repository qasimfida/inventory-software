import { RegistrationTrend } from './RegistrationTrend';
import { Link } from 'react-router-dom';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { Building2, Users, Store, Warehouse, RefreshCw, ArrowUpRight } from 'lucide-react';
import { createSecurityClient, ResourceModel } from '@inventory/api-client';
import { authClient } from '@/platform/auth-client';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { MetricCard } from '@/components/common/MetricCard';
import { ErrorState, LoadingState } from '@/components/common/AsyncState';
import { Button } from '@/components/ui/Button';
export function PlatformOverview() {
  const model = useMemo(
    () => new ResourceModel(() => createSecurityClient(authClient.accountRequest).overview()),
    [],
  );
  const state = useSyncExternalStore(model.subscribe, model.snapshot);
  useEffect(() => {
    const timer = setTimeout(() => void model.run(), 250);
    return () => {
      clearTimeout(timer);
      model.reset();
    };
  }, [model]);
  const data = state.data;
  return (
    <section className="screen-section" aria-label="Platform overview">
      <ScreenHeader
        title="Platform overview"
        description="Application registrations and business activity. Administrative access is verified by the server."
        actions={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Refresh platform overview"
            disabled={state.busy}
            onClick={() => void model.run()}
          >
            <RefreshCw />
          </Button>
        }
      />
      {state.error && <ErrorState message={state.error} onRetry={() => void model.run()} />}
      {state.busy && <LoadingState message="Loading platform analytics…" />}
      {data && (
        <>
          <div className="overview-metrics">
            {[
              {
                label: 'Businesses',
                value: data.totals.businesses,
                unit: `${data.totals.activeBusinesses} active`,
                Icon: Building2,
              },
              {
                label: 'Accounts',
                value: data.totals.accounts,
                unit: 'Registered accounts',
                Icon: Users,
              },
              {
                label: 'Stores',
                value: data.totals.stores,
                unit: 'Registered stores',
                Icon: Store,
              },
              {
                label: 'Warehouses',
                value: data.totals.warehouses,
                unit: `${data.totals.terminals} terminals`,
                Icon: Warehouse,
              },
            ].map((m, i) => (
              <div
                key={m.label}
                className={`overview-metric ${['overview-metric-primary', 'stock-metric-in-stock', 'stock-metric-low-stock', 'stock-metric-out-of-stock'][i]}`}
              >
                <m.Icon aria-hidden="true" />
                <MetricCard label={m.label} value={m.value} unit={m.unit} primary={i === 0} />
              </div>
            ))}
          </div>
          <RegistrationTrend rows={data.registrations} />
          <Button asChild variant="ghost">
            <Link to="/logs">View administrative logs</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/admin/businesses">
              <Building2 aria-hidden="true" />
              View all businesses
              <ArrowUpRight aria-hidden="true" />
            </Link>
          </Button>
        </>
      )}
    </section>
  );
}
