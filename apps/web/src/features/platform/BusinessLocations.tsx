import { BusinessLocationCards } from './BusinessLocationCards';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createPlatformBusinessesClient, cancellableResource } from '@inventory/api-client';
import type { Location, PlatformBusiness } from '@inventory/contracts';
import { authClient } from '@/platform/auth-client';
import { Table, TableScroll } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/common/Pagination';
import { usePageCollection } from '@/components/common/usePageCollection';
import { ErrorState, LoadingState, EmptyState } from '@/components/common/AsyncState';
import { StatusBadge } from '@/components/ui/StatusBadge';
export function BusinessLocations({
  business,
  onOpen,
  grid = false,
}: {
  business: PlatformBusiness;
  grid?: boolean;
  onOpen: (location: Location) => void;
}) {
  const [offset, setOffset] = useState(0);
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
    <div className="space-y-3">
      <h3>Stores &amp; warehouses · {business.name}</h3>
      {state.busy && <LoadingState message="Loading locations…" />}
      {state.error && <ErrorState message={state.error} onRetry={() => void request.model.run()} />}
      {state.data && !state.data.locations.length && (
        <EmptyState message="No registered stores or warehouses." />
      )}
      {!!state.data?.locations.length &&
        (grid ? (
          <BusinessLocationCards locations={state.data.locations} onOpen={onOpen} />
        ) : (
          <TableScroll label={`Locations for ${business.name}`}>
            <Table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Code</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {state.data.locations.map((location) => (
                  <tr key={location.id}>
                    <th scope="row">
                      <Button variant="ghost" onClick={() => onOpen(location)}>
                        {location.name}
                      </Button>
                    </th>
                    <td>
                      {location.kind === 'stores'
                        ? location.type === 'branch'
                          ? 'Branch'
                          : 'Store'
                        : 'Warehouse'}
                    </td>
                    <td>{location.code}</td>
                    <td>
                      <StatusBadge tone={location.state === 'active' ? 'success' : 'warning'}>
                        {location.state}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableScroll>
        ))}
      <Pagination
        label={`locations for ${business.name}`}
        offset={offset}
        hasMore={state.data?.hasMore ?? false}
        busy={state.busy}
        onChange={setOffset}
      />
    </div>
  );
}
