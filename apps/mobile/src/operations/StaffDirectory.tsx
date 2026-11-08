import { settingsModel } from '../settings/model';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createOperationsClient, cancellableResource, staffForm } from '@inventory/api-client';
import type { Business, Location } from '@inventory/contracts';
import { authClient } from '../auth/client';
import { ScreenHeader } from '../ui/ScreenHeader';
import { RecordCollection } from '../ui/RecordCollection';
import { SearchControl } from '../ui/SearchControl';
import { Pagination } from '../ui/Pagination';
import { LoadingState, ErrorState } from '../ui/AsyncState';
import { CommandForm } from '../components/CommandForm';
import { StaffDetails } from './StaffDetails';
import { View } from 'react-native';
import { operationKey } from '../platform/operation-key';
import { useTheme } from '../theme';
/** Salary-free collection. Compensation is fetched only when opening an authorized profile. */
export function StaffDirectory({
  business,
  locations,
}: {
  business: Business;
  locations: Location[];
}) {
  useTheme();
  const [search, setSearch] = useState(''),
    [offset, setOffset] = useState(0),
    [id, setId] = useState('');
  const client = useMemo(
    () => createOperationsClient(authClient.organizationRequest, operationKey, business.id),
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
    <View>
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
          <View style={{ flexGrow: 1, flexBasis: 160 }}>
            <SearchControl
              label="Search staff"
              value={search}
              onChange={(v) => {
                setSearch(v);
                setOffset(0);
                setId('');
              }}
            />
          </View>
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
    </View>
  );
}
