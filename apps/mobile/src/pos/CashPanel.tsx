import { Text } from '../ui/Themed';
import { CashFilters } from './CashFilters';
import type { CashFilterValues } from './CashFilters';
import { businessTime } from '@inventory/contracts';
import { View } from 'react-native';
import { useTheme } from '../theme';
import { CashRecords } from './CashRecords';
import { Pagination } from '../ui/Pagination';
import { usePageCollection } from '../ui/usePageCollection';
import { IconAction } from '../ui/IconAction';
import { ErrorState, LoadingState } from '../ui/AsyncState';
import { ScreenBody, ScreenHeader } from '../ui/ScreenHeader';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createCashClient, cashForms, ResourceModel } from '@inventory/api-client';
import type { Business, Location } from '@inventory/contracts';
import { CommandForm } from '../components/CommandForm';
import { authClient } from '../auth/client';
import { operationKey } from '../platform/operation-key';

export function CashPanel({
  business,
  warehouseId,
  locations,
}: {
  business: Business;
  warehouseId: string;
  locations: Location[];
}) {
  const theme = useTheme();
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<CashFilterValues>({});
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search);
      setOffset(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  const client = useMemo(
    () => createCashClient(authClient.organizationRequest, operationKey, business.id),
    [business.id],
  );
  const model = useMemo(
      () =>
        new ResourceModel(() => client.list(warehouseId, offset, { ...filters, search: query })),
      [client, warehouseId, offset, query, filters],
    ),
    rawPageState = useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot);
  const state = usePageCollection(
    rawPageState,
    [business, warehouseId, query, filters],
    offset,
    ['shifts'],
    () => {
      setOffset(0);
    },
  );
  const pendingCommand = useRef(false);
  const execute = (work: () => Promise<unknown>) => {
    if (pendingCommand.current) return;
    pendingCommand.current = true;
    void model.run(work, true).finally(() => {
      pendingCommand.current = false;
    });
  };
  useEffect(() => {
    void model.run();
    return model.reset;
  }, [model]);
  return (
    <ScreenBody>
      <ScreenHeader
        title="Cash shifts"
        description={
          <>
            Cash only. Open a shift before collecting cash. Confirm money received before recording.
            Closed shifts are immutable.
          </>
        }
      />
      {state.data?.activeShifts?.map((s) => (
        <View key={s.id} accessibilityLabel="My open cash shift">
          <Text>
            My open shift · {s.storeName} · {s.terminalName}
          </Text>
          <Text>
            {s.actorName ?? 'You'} · {businessTime(s.openedAt, business.timeZone)} · Opening{' '}
            {s.openingMinor} {s.currency} minor units · Expected {s.expectedMinor} {s.currency}{' '}
            minor units
          </Text>
          {cashForms(client, business, warehouseId, locations, [s])
            .filter((f) => f.title.startsWith('Close cash shift'))
            .map((f) => (
              <CommandForm key={f.title} definition={f} run={execute} error={state.error} />
            ))}
        </View>
      ))}
      {Boolean(state.error) && (
        <ErrorState message={state.error} onRetry={() => void model.run()} />
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.small }}>
        <CashFilters
          staff={state.data?.staff ?? []}
          search={search}
          onSearch={setSearch}
          filters={filters}
          onChange={(v) => {
            setFilters(v);
            setOffset(0);
          }}
          locations={locations.filter(
            (l) => l.kind === 'terminals' && l.warehouseId === warehouseId,
          )}
        />
        <IconAction
          label="Refresh cash shifts"
          onPress={() => void model.run()}
          disabled={state.busy}
          icon="↻"
        />
        {state.data &&
          cashForms(client, business, warehouseId, locations, state.data.shifts)
            .filter((f) => f.title === 'Open cash shift')
            .map((f) => (
              <CommandForm key={f.title} definition={f} run={execute} error={state.error} />
            ))}
      </View>
      {!state.data && !state.error && <LoadingState message="Loading cash shifts…" />}
      {state.data && (
        <CashRecords
          error={state.error}
          filtered={Boolean(query || Object.values(filters).some(Boolean))}
          shifts={state.data.shifts}
          forms={cashForms(client, business, warehouseId, locations, state.data.shifts)}
          timeZone={business.timeZone}
          run={execute}
        />
      )}

      <Pagination
        label="cash shifts"
        offset={offset}
        pageSize={25}
        hasMore={state.data?.hasMore ?? false}
        busy={state.busy || Boolean(state.error)}
        onChange={setOffset}
      />
    </ScreenBody>
  );
}
