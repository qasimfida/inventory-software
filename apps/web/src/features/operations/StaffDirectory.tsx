import { settingsModel } from '@/platform/settings';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createOperationsClient, cancellableResource, staffForm } from '@inventory/api-client';
import type { Business, Location } from '@inventory/contracts';
import { authClient } from '@/platform/auth-client';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { RecordCollection } from '@/components/common/RecordCollection';
import { SearchControl } from '@/components/common/SearchControl';
import { Pagination } from '@/components/common/Pagination';
import { LoadingState, ErrorState } from '@/components/common/AsyncState';
import { CommandForm } from '@/components/common/CommandForm';
import { StaffDetails } from './StaffDetails';
import { useAppearance } from '@/theme/Appearance';
/** Salary-free collection. Compensation is fetched only when opening an authorized profile. */
export function StaffDirectory({
  business,
  locations,
}: {
  business: Business;
  locations: Location[];
}) {
  useAppearance();
  const [search, setSearch] = useState(''),
    [offset, setOffset] = useState(0),
    [id, setId] = useState('');
  const client = useMemo(
    () =>
      createOperationsClient(
        authClient.organizationRequest,
        () => crypto.randomUUID(),
        business.id,
      ),
    [business.id],
  );
  const request = useMemo(
    () =>
      cancellableResource(
        async (signal) => ({
          page: await client.directory(search, offset, signal),
          selected: id ? await client.staff(id) : null,
        }),
        () => new AbortController(),
      ),
    [client, search, offset, id],
  );
  const { model } = request;
  const state = useSyncExternalStore(model.subscribe, model.snapshot);
  useEffect(() => {
    const timer = setTimeout(() => void model.run(), 250);
    return () => {
      clearTimeout(timer);
      request.cancel();
    };
  }, [request, model]);
  const run = (work: () => Promise<unknown>) => {
    if (!model.snapshot().busy) void model.run(work);
  };
  return (
    <section className="screen-section">
      <ScreenHeader
        title="Staff"
        description="Employment and location assignments. Compensation is available in authorized profiles and Salaries."
        actions={
          <CommandForm
            definition={staffForm(client, locations, settingsModel.transactionCurrency())}
            run={run}
          />
        }
      />
      <RecordCollection
        emptyState={
          state.error ? (
            <ErrorState message={state.error} onRetry={() => void model.run()} />
          ) : !state.data ? (
            <LoadingState message="Loading staff…" />
          ) : undefined
        }
        label="staff directory"
        toolbar={
          <div className="collection-search">
            {' '}
            <SearchControl
              label="Search staff"
              value={search}
              onChange={(v) => {
                setSearch(v);
                setOffset(0);
                setId('');
              }}
            />
          </div>
        }
        items={(state.data?.page.staff ?? []).map((s) => ({
          id: s.id,
          title: s.name,
          subtitle: s.code,
          detail: s.title || 'No job title',
          status: s.state,
          tone: s.state === 'active' ? 'success' : 'neutral',
        }))}
        onOpen={setId}
      />
      <Pagination
        label="staff directory"
        offset={offset}
        pageSize={25}
        hasMore={state.data?.page.hasMore ?? false}
        busy={state.busy}
        onChange={setOffset}
      />
      {state.data?.selected && (
        <StaffDetails
          staff={state.data.selected}
          locations={locations}
          definition={staffForm(
            client,
            locations,
            settingsModel.transactionCurrency(),
            state.data.selected,
          )}
          run={run}
          onClose={() => setId('')}
        />
      )}
    </section>
  );
}
