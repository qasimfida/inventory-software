import { BusinessLocationCards } from './BusinessLocationCards';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { View } from 'react-native';
import { createPlatformBusinessesClient, cancellableResource } from '@inventory/api-client';
import type { Location, PlatformBusiness } from '@inventory/contracts';
import { authClient } from '../auth/client';
import { Action } from '../ui/Controls';
import { Text } from '../ui/Themed';
import { Pagination } from '../ui/Pagination';
import { usePageCollection } from '../ui/usePageCollection';
import { useTheme } from '../theme';
export function BusinessLocations({
  business,
  onOpen,
  grid = false,
}: {
  business: PlatformBusiness;
  grid?: boolean;
  onOpen: (location: Location) => void;
}) {
  const theme = useTheme(),
    [offset, setOffset] = useState(0);
  const request = useMemo(
    () =>
      cancellableResource(
        (signal) =>
          createPlatformBusinessesClient(authClient.accountRequest).detail(
            business.id,
            offset,
            signal,
          ),
        () => new AbortController(),
      ),
    [business.id, offset],
  );
  const raw = useSyncExternalStore(request.model.subscribe, request.model.snapshot);
  const state = usePageCollection(raw, [business.id], offset, ['locations'], () => setOffset(0));
  useEffect(() => {
    void request.model.run();
    return request.cancel;
  }, [request]);
  return (
    <View style={{ gap: theme.spacing.small }}>
      <Text accessibilityRole="header">Stores &amp; warehouses</Text>
      {state.busy && <Text accessibilityLiveRegion="polite">Loading locations…</Text>}
      {!!state.error && (
        <>
          <Text accessibilityRole="alert">{state.error}</Text>
          <Action label="Retry locations" onPress={() => void request.model.run()} />
        </>
      )}
      {state.data && !state.data.locations.length && (
        <Text>No registered stores or warehouses.</Text>
      )}
      {grid && state.data ? (
        <BusinessLocationCards locations={state.data.locations} onOpen={onOpen} />
      ) : (
        state.data?.locations.map((location) => (
          <View
            key={location.id}
            style={{
              padding: theme.spacing.small,
              backgroundColor: theme.tokens.secondary,
              borderRadius: theme.radius,
            }}
          >
            <Action variant="ghost" label={location.name} onPress={() => onOpen(location)} />
            <Text>
              {location.code} · {location.kind} · {location.state}
            </Text>
          </View>
        ))
      )}
      <Pagination
        label={`locations for ${business.name}`}
        offset={offset}
        hasMore={state.data?.hasMore ?? false}
        busy={state.busy}
        onChange={setOffset}
      />
    </View>
  );
}
