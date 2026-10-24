import { Hint } from '@/components/ui/Tooltip';
import { RefreshCw, Settings2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createDashboardClient, cancellableResource } from '@inventory/api-client';
import type { Business } from '@inventory/contracts';
import { useAppearance } from '@/theme/Appearance';
import { authClient } from '@/platform/auth-client';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/AsyncState';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/FormControls';
import { DashboardMetrics, DashboardStock } from './DashboardStock';
import { DashboardSales } from './DashboardSales';
export function Dashboard({
  business,
  storeId,
  warehouseIds,
}: {
  business: Business;
  storeId?: string | undefined;
  warehouseIds?: string[] | undefined;
}) {
  const { preferences } = useAppearance(),
    [days, setDays] = useState<7 | 30>(30);
  const warehouseKey = warehouseIds?.join(',');
  const request = useMemo(() => {
    const client = createDashboardClient(authClient.organizationRequest, business.id);
    return cancellableResource(
      (signal) =>
        client.load(
          {
            currency: preferences.currency,
            days,
            storeId,
            warehouseIds:
              warehouseKey === undefined ? undefined : warehouseKey.split(',').filter(Boolean),
          },
          signal,
        ),
      () => new AbortController(),
    );
  }, [business.id, preferences.currency, days, storeId, warehouseKey]);
  const state = useSyncExternalStore(request.model.subscribe, request.model.snapshot);
  useEffect(() => {
    void request.model.run();
    return request.cancel;
  }, [request]);
  return (
    <section aria-label="Business dashboard" className="screen-section overview-page">
      <ScreenHeader
        title="Welcome back"
        description={`${business.name} · Confirmed activity in UTC`}
        actions={
          <>
            <label className="overview-period" htmlFor="overview-period">
              Period
              <Select
                id="overview-period"
                aria-label="Overview period"
                value={days}
                onChange={(e) => setDays(e.target.value === '7' ? 7 : 30)}
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
              </Select>
            </label>
            <Hint label="Change currency in Settings">
              <Link to="/settings/preferences" className="overview-currency">
                <Settings2 aria-hidden="true" />
                {preferences.currency}
                <span className="sr-only"> · Currency settings</span>
              </Link>
            </Hint>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Refresh dashboard"
              disabled={state.busy}
              onClick={() => void request.model.run()}
            >
              <RefreshCw />
            </Button>
          </>
        }
      />
      {state.busy && <LoadingState message="Loading overview…" />}
      {state.error && <ErrorState message={state.error} onRetry={() => void request.model.run()} />}
      {state.data && (
        <>
          <DashboardMetrics data={state.data} />
          <div className="overview-grid">
            {state.data.inventory && <DashboardStock inventory={state.data.inventory} />}
            {state.data.sales && <DashboardSales data={state.data} business={business} />}
          </div>
          {!state.data.sales && !state.data.inventory && (
            <EmptyState message="Your role has no sales or stock report access." />
          )}
          <p className="overview-note">
            {state.data.from} – {state.data.to} UTC · {state.data.currency} only. Sales figures
            include tax and are before returns; they are not net profit. Stock covers your
            authorized warehouses. Updated {new Date(state.data.asOf).toLocaleTimeString()}.
          </p>
        </>
      )}
    </section>
  );
}
