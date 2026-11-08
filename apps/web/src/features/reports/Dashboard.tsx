import { RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createDashboardClient, cancellableResource } from '@inventory/api-client';
import type { Business } from '@inventory/contracts';
import { settingsModel } from '@/platform/settings';
import { currencySchema } from '@inventory/contracts';
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
  useSyncExternalStore(settingsModel.subscribe, settingsModel.snapshot);
  const transactionCurrency = settingsModel.transactionCurrency();
  const [selection, setSelection] = useState<{
    businessId: string;
    currency: ReturnType<typeof currencySchema.parse>;
  } | null>(null);
  const currency = selection?.businessId === business.id ? selection.currency : transactionCurrency;
  const setCurrency = (value: ReturnType<typeof currencySchema.parse>) =>
    setSelection({ businessId: business.id, currency: value });
  const [days, setDays] = useState<7 | 30>(30);
  const warehouseKey = warehouseIds?.join(',');
  const request = useMemo(() => {
    const client = createDashboardClient(authClient.organizationRequest, business.id);
    return cancellableResource(
      (signal) =>
        client.load(
          {
            currency: currency,
            days,
            storeId,
            warehouseIds:
              warehouseKey === undefined ? undefined : warehouseKey.split(',').filter(Boolean),
          },
          signal,
        ),
      () => new AbortController(),
    );
  }, [business.id, currency, days, storeId, warehouseKey]);
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
            <label>
              Recorded currency
              <Select
                aria-label="Overview recorded currency"
                value={currency}
                onChange={(e) => setCurrency(currencySchema.parse(e.target.value))}
              >
                {currencySchema.options.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </Select>
            </label>
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
