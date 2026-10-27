import { StatusBadge } from '@/components/ui/StatusBadge';
import { MetricCard } from '@/components/common/MetricCard';
import { IconButton } from '@/components/common/IconButton';

import { CheckCircle2, AlertTriangle, ChevronRight } from 'lucide-react';
import { OnlineNotice } from './OnlineNotice';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { Settings, RefreshCw, ArrowRight } from 'lucide-react';
import type { Business } from '@inventory/contracts';
import { hasPermission } from '@inventory/contracts';
import {
  createOnlineStoreClient,
  OnlineOverviewModel,
  onlineStoreStatusLabels,
  onlineAttentionLinks,
  onlineMessages,
  setupChecklist,
} from '@inventory/api-client';
import { authClient } from '@/platform/auth-client';
import { useCatalogLive } from '@/platform/useCatalogLive';
import { Button } from '@/components/ui/Button';
import { ErrorState, LoadingState } from '@/components/common/AsyncState';
import { useStorefrontOnline } from './useStorefrontOnline';
export function OnlineOverview({ business, storeId }: { business: Business; storeId: string }) {
  const model = useMemo(
    () =>
      new OnlineOverviewModel(
        createOnlineStoreClient(authClient.organizationRequest, business.id, storeId),
        () => crypto.randomUUID(),
      ),
    [business.id, storeId],
  );
  const state = useSyncExternalStore(model.subscribe, model.snapshot),
    online = useStorefrontOnline();
  useCatalogLive(business.id, () => void model.refresh());
  useEffect(() => {
    void model.refresh();
    const timer = setInterval(() => void model.refresh(), 15000);
    return () => {
      clearInterval(timer);
      model.reset();
    };
  }, [model]);
  const { overview, settings } = state;
  if (!overview || !settings)
    return state.error ? (
      <ErrorState message={state.error} onRetry={() => void model.refresh()} />
    ) : (
      <LoadingState message="Loading online store overview…" />
    );
  const steps = settings.settings ? setupChecklist(settings.settings, settings.prerequisites) : [];
  const incomplete = steps.filter((c) => !c.done);
  const counts = {
    changes: overview.counts.needs_changes,
    soldOut: overview.soldOut,
    warnings: overview.warnings,
  };
  return (
    <section
      className="screen-section collection-surface space-y-5"
      aria-label="Online store overview"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2>Online store overview</h2>
          <p className="text-muted-foreground">Publication health for this store.</p>
        </div>
        {(incomplete.length > 0 || !settings.settings) && (
          <IconButton
            label={`Store setup needs attention: ${incomplete.map((s) => s.label).join(', ') || 'Configure this store in Settings'}`}
            icon={AlertTriangle}
            className="text-warning"
            onClick={() => {
              document.getElementById('online-setup-links')?.focus();
            }}
          />
        )}
      </div>
      {state.error && <ErrorState message={state.error} onRetry={() => void model.refresh()} />}
      {!online && <p role="status">{onlineMessages.offline}</p>}
      {state.message && <OnlineNotice key={state.message} message={state.message} />}
      <div className="rounded-lg border p-4 space-y-2">
        <h3>Store status</h3>
        <StatusBadge>{onlineStoreStatusLabels[overview.status]}</StatusBadge>
        {overview.status === 'live' && (
          <p className="text-muted-foreground">{onlineMessages.noPublicUrl}</p>
        )}
        <p className="text-sm text-muted-foreground">
          As of {new Date(overview.asOf).toLocaleString()}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {(
          [
            ['Active', overview.counts.active + overview.counts.paused, 'active'],
            ['Changes required', overview.counts.needs_changes, 'changes-required'],
            ['Ready to publish', overview.counts.ready, 'ready'],
          ] as const
        ).map(([label, count, tab]) => (
          <Link
            key={tab}
            className={`stock-metric stock-metric-${tab === 'active' ? 'all' : tab === 'changes-required' ? 'low-stock' : 'in-stock'}`}
            to={'/online-store/products?tab=' + tab}
          >
            <ArrowRight aria-hidden="true" />
            <MetricCard
              label={label}
              value={count}
              unit="View products"
              primary={tab === 'active'}
            />
          </Link>
        ))}
      </div>
      <h3>Needs attention</h3>
      <ul className="space-y-2">
        {onlineAttentionLinks
          .filter((item) => counts[item.key] > 0)
          .map((item) => (
            <li key={item.key}>
              <Link
                className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted"
                to={item.path}
              >
                <AlertTriangle
                  className={item.key === 'changes' ? 'text-destructive' : 'text-warning'}
                  aria-hidden="true"
                />
                <span className="flex-1">{item.label}</span>
                <StatusBadge>{counts[item.key]}</StatusBadge>
                <ChevronRight aria-hidden="true" />
              </Link>
            </li>
          ))}
        {(incomplete.length > 0 || !settings.settings) && (
          <li>
            <Link
              className="flex items-center gap-2 underline underline-offset-4"
              to={
                incomplete[0]?.path === '/settings/company' &&
                !hasPermission(business, 'business.write')
                  ? '/online-store/settings/general'
                  : (incomplete[0]?.path ?? '/online-store/settings/general')
              }
            >
              <Settings aria-hidden="true" />
              <span className="flex-1">Complete online store setup</span>
              <ChevronRight aria-hidden="true" />
            </Link>
          </li>
        )}
      </ul>
      {!Object.values(counts).some(Boolean) && !incomplete.length && settings.settings && (
        <p role="status" className="flex items-center gap-2">
          <CheckCircle2 className="text-success" aria-hidden="true" />
          All clear
        </p>
      )}
      {(incomplete.length > 0 || !settings.settings) && (
        <div id="online-setup-links" tabIndex={-1} className="space-y-2">
          <p className="text-muted-foreground">
            Complete these details to prepare your online store:
          </p>
          {!settings.settings && (
            <Link className="underline underline-offset-4" to="/online-store/settings/general">
              Set up online store
            </Link>
          )}
          {incomplete.map((step) => (
            <p key={step.label}>
              {step.path === '/settings/company' && !hasPermission(business, 'business.write') ? (
                <span>{step.label} — ask an administrator</span>
              ) : (
                <Link className="underline underline-offset-4" to={step.path}>
                  {step.label}
                </Link>
              )}
            </p>
          ))}
        </div>
      )}
      {!Object.values(overview.counts).some(Boolean) &&
        hasPermission(business, 'onlineStore.manage') && (
          <Button asChild>
            <Link to="/online-store/products/add">Add products</Link>
          </Button>
        )}
      <p>
        Last validated:{' '}
        {overview.lastValidatedAt
          ? new Date(overview.lastValidatedAt).toLocaleString()
          : 'Not validated yet'}
      </p>
      <div className="flex flex-wrap gap-2">
        <IconButton
          label="Refresh overview"
          icon={RefreshCw}
          disabled={state.busy}
          onClick={() => void model.refresh()}
        />
        {hasPermission(business, 'onlineStore.manage') && (
          <Button
            disabled={!online || state.busy || !!state.error || !settings.settings}
            onClick={() => void model.recheck()}
          >
            Re-check all
          </Button>
        )}
      </div>
    </section>
  );
}
