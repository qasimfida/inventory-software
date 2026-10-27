import { useStorefrontOnline } from './useStorefrontOnline';
import { hasPermission } from '@inventory/contracts';
import { useCatalogLive } from '@/platform/useCatalogLive';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import {
  createStorefrontClient,
  storefrontResource,
  storefrontForms,
  listingForm,
} from '@inventory/api-client';
import type { Business, Location } from '@inventory/contracts';
import { authClient } from '@/platform/auth-client';
import { CommandForm } from '@/components/common/CommandForm';
import { ErrorState, LoadingState, EmptyState } from '@/components/common/AsyncState';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';

export function StorefrontPanel({
  business,
  locations,
}: {
  business: Business;
  locations: Location[];
}) {
  const client = useMemo(
    () =>
      createStorefrontClient(authClient.organizationRequest, business.id, () =>
        crypto.randomUUID(),
      ),
    [business.id],
  );
  const model = useMemo(() => storefrontResource(client.load), [client]);
  const state = useSyncExternalStore(model.subscribe, model.snapshot);
  useCatalogLive(business.id, () => void model.refresh());
  const online = useStorefrontOnline();
  const canManage = online && hasPermission(business, 'onlineStore.manage');
  useEffect(() => {
    void model.refresh();
    const timer = setInterval(() => void model.refresh(), 15000);
    return () => {
      clearInterval(timer);
      model.reset();
    };
  }, [model]);
  return (
    <section className="screen-section collection-surface" aria-label="Online store foundation">
      <ScreenHeader
        title="Online store"
        description="Manage your store details and published products. Orders and checkout are not available yet."
        actions={
          <Button
            variant="ghost"
            size="icon"
            title="Refresh online store"
            aria-label="Refresh online store"
            disabled={state.busy}
            onClick={() => void model.refresh()}
          >
            <RefreshCw />
          </Button>
        }
      />
      {state.error && <ErrorState message={state.error} onRetry={() => void model.refresh()} />}
      {state.busy && <LoadingState message="Checking storefront readiness…" />}
      {state.data && (
        <p>
          {state.error || !online
            ? 'Offline or unable to verify access. Last loaded data is read-only.'
            : 'Updated just now'}{' '}
          · As of {new Date(state.data.asOf).toLocaleTimeString()}
        </p>
      )}
      {state.data && (
        <>
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3>{state.data.settings?.name ?? state.data.defaults.name ?? business.name}</h3>
              <StatusBadge tone={state.data.settings?.enabled ? 'success' : 'neutral'}>
                {state.data.settings?.enabled ? 'Published catalog enabled' : 'Not published'}
              </StatusBadge>
            </div>
            <p className="text-sm text-muted-foreground">
              {locations.find(
                (l) => l.id === (state.data?.settings?.storeId ?? state.data?.defaults.storeId),
              )?.name ?? 'Choose a store'}{' '}
              · {state.data.settings?.currency ?? state.data.defaults.currency ?? 'USD'}
            </p>
            <p className="text-sm">
              {state.data.settings?.contact ??
                state.data.defaults.contact ??
                'Add your public contact details.'}
            </p>
            <p className="text-sm text-muted-foreground">
              Existing business details prefill setup. You can edit them for this online store.
              Stock comes from warehouses linked to the selected store.
            </p>
          </div>
          <p>
            Trusted image origins:{' '}
            {state.data.trustedMediaOrigins.join(', ') ||
              'None configured; image publication is blocked.'}
          </p>
          {state.data.prerequisites.map((issue) => (
            <p key={issue} role="status">
              {issue}
            </p>
          ))}
          <div className="collection-toolbar">
            {canManage &&
              !state.busy &&
              !state.error &&
              storefrontForms(client, state.data, locations).map((form) => (
                <CommandForm
                  key={form.title}
                  definition={form}
                  run={(work) => void model.run(work, true)}
                />
              ))}
          </div>
          <h3>Published products and readiness</h3>
          {!state.data.listings.length && (
            <EmptyState
              message="No selected products"
              description="Configure a default store, then select a catalog product by its product ID. Readiness checks protect publication."
            />
          )}
          {state.data.listings.map((listing) => (
            <article key={listing.id} className="space-y-3 rounded-lg border bg-card p-4">
              <h3>
                {listing.projection?.title ||
                  listing.title ||
                  listing.productName ||
                  'Selected product'}
              </h3>
              <StatusBadge>{listing.state.replaceAll('_', ' ')}</StatusBadge>
              <p>
                {listing.issues.length
                  ? listing.issues.join(' · ')
                  : 'Content and pricing checks passed'}
              </p>
              <p>
                Availability: {listing.projection?.availability ?? 'Unavailable until ready'} ·
                Readiness rule {listing.ruleVersion}
              </p>
              {canManage && !state.busy && !state.error && (
                <>
                  <CommandForm
                    definition={listingForm(client, listing)}
                    run={(work) => void model.run(work, true)}
                  />
                  {(['publish', 'pause', 'remove'] as const)
                    .filter((action) =>
                      action === 'publish'
                        ? ['ready', 'paused'].includes(listing.state)
                        : action === 'pause'
                          ? listing.state === 'active'
                          : listing.state !== 'delisted',
                    )
                    .map((action) => (
                      <Button
                        key={action}
                        variant="outline"
                        onClick={() =>
                          void model.run(
                            () => client.command(listing.id, listing.version, action),
                            true,
                          )
                        }
                      >
                        {action} listing
                      </Button>
                    ))}
                </>
              )}
            </article>
          ))}
        </>
      )}
    </section>
  );
}
