import { operationKey } from '../platform/operation-key';
import { hasPermission } from '@inventory/contracts';
import { useCatalogLive } from '../platform/useCatalogLive';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import {
  createStorefrontClient,
  storefrontResource,
  storefrontForms,
  listingForm,
} from '@inventory/api-client';
import type { Business, Location } from '@inventory/contracts';
import { View } from 'react-native';
import { authClient } from '../auth/client';
import { CommandForm } from '../components/CommandForm';
import { ErrorState, LoadingState, EmptyState } from '../ui/AsyncState';
import { Action } from '../ui/Controls';
import { Text } from '../ui/Themed';
import { useTheme } from '../theme';

export function StorefrontPanel({
  business,
  locations,
}: {
  business: Business;
  locations: Location[];
}) {
  const client = useMemo(
    () => createStorefrontClient(authClient.organizationRequest, business.id, operationKey),
    [business.id],
  );
  const model = useMemo(() => storefrontResource(client.load), [client]);
  const state = useSyncExternalStore(model.subscribe, model.snapshot);
  useCatalogLive(business.id, () => void model.refresh());
  const canManage = hasPermission(business, 'onlineStore.manage');
  useEffect(() => {
    void model.refresh();
    const timer = setInterval(() => void model.refresh(), 15000);
    return () => {
      clearInterval(timer);
      model.reset();
    };
  }, [model]);
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.medium }}>
      <Text accessibilityRole="header">Online store</Text>
      <Text tone="muted">
        Manage your store details and published products. Orders and checkout are not available yet.
      </Text>
      {state.error && <ErrorState message={state.error} onRetry={() => void model.refresh()} />}
      {state.busy && <LoadingState message="Checking storefront readiness…" />}
      {state.data && (
        <Text>
          {state.error
            ? 'Offline or unable to verify access. Last loaded data is read-only.'
            : 'Updated just now'}{' '}
          · As of {new Date(state.data.asOf).toLocaleTimeString()}
        </Text>
      )}
      {state.data && (
        <>
          <View
            style={{
              gap: theme.spacing.small,
              padding: theme.spacing.medium,
              borderRadius: theme.radius,
              backgroundColor: theme.colors.card,
            }}
          >
            <Text accessibilityRole="header">
              {state.data.settings?.name ?? state.data.defaults.name ?? business.name}
            </Text>
            <Text>
              {state.data.settings?.enabled ? 'Published catalog enabled' : 'Not published'}
            </Text>
            <Text>
              {locations.find(
                (l) => l.id === (state.data?.settings?.storeId ?? state.data?.defaults.storeId),
              )?.name ?? 'Choose a store'}{' '}
              · {state.data.settings?.currency ?? state.data.defaults.currency ?? 'USD'}
            </Text>
            <Text>
              {state.data.settings?.contact ??
                state.data.defaults.contact ??
                'Add your public contact details.'}
            </Text>
            <Text tone="muted">
              Existing business details prefill setup. You can edit them for this online store.
              Stock comes from warehouses linked to the selected store.
            </Text>
          </View>
          <Text>
            Trusted image origins:{' '}
            {state.data.trustedMediaOrigins.join(', ') ||
              'None configured; image publication is blocked.'}
          </Text>
          {state.data.prerequisites.map((issue) => (
            <Text key={issue}>{issue}</Text>
          ))}
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
          {!state.data.listings.length && (
            <EmptyState
              message="No selected products"
              description="Configure a default store, then select a catalog product by its product ID. Readiness checks protect publication."
            />
          )}
          {state.data.listings.map((listing) => (
            <View
              key={listing.id}
              style={{
                gap: theme.spacing.small,
                padding: theme.spacing.medium,
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: theme.radius,
              }}
            >
              <Text accessibilityRole="header">
                {listing.projection?.title ||
                  listing.title ||
                  listing.productName ||
                  'Selected product'}
              </Text>
              <Text>{listing.state.replaceAll('_', ' ')}</Text>
              <Text>
                {listing.issues.length
                  ? listing.issues.join(' · ')
                  : 'Content and pricing checks passed'}
              </Text>
              <Text>
                Availability: {listing.projection?.availability ?? 'Unavailable until ready'} ·
                Readiness rule {listing.ruleVersion}
              </Text>
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
                      <Action
                        key={action}
                        label={`${action} listing`}
                        onPress={() =>
                          void model.run(
                            () => client.command(listing.id, listing.version, action),
                            true,
                          )
                        }
                      />
                    ))}
                </>
              )}
            </View>
          ))}
        </>
      )}
      <Action
        label="Refresh readiness"
        disabled={state.busy}
        onPress={() => void model.refresh()}
      />
    </View>
  );
}
