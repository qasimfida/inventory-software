import { CashFilters } from './CashFilters';
import type { CashFilterValues } from './CashFilters';
import { businessTime } from '@inventory/contracts';
import { CashRecords } from './CashRecords';
import { Pagination } from '@/components/common/Pagination';
import { usePageCollection } from '@/components/common/usePageCollection';
import { RefreshCw } from 'lucide-react';
import { ErrorState, LoadingState } from '@/components/common/AsyncState';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createCashClient, cashForms, ResourceModel } from '@inventory/api-client';
import type { Business, Location } from '@inventory/contracts';
import { IconButton } from '@/components/common/IconButton';

import { CommandForm } from '@/components/common/CommandForm';
import { authClient } from '@/platform/auth-client';

const operationKey = () => crypto.randomUUID();
export function CashPanel({
  business,
  warehouseId,
  locations,
}: {
  business: Business;
  warehouseId: string;
  locations: Location[];
}) {
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
    <section aria-label="Cash shifts" className="screen-section">
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
        <section
          key={s.id}
          aria-label="My open cash shift"
          className="rounded-md border bg-card p-3 space-y-2"
        >
          <p>
            My open shift · {s.storeName} · {s.terminalName}
          </p>
          <p>
            {s.actorName ?? 'You'} · {businessTime(s.openedAt, business.timeZone)} · Opening{' '}
            {s.openingMinor} {s.currency} minor units · Expected {s.expectedMinor} {s.currency}{' '}
            minor units
          </p>
          {cashForms(client, business, warehouseId, locations, [s])
            .filter((f) => f.title.startsWith('Close cash shift'))
            .map((f) => (
              <CommandForm key={f.title} definition={f} run={execute} error={state.error} />
            ))}
        </section>
      ))}
      {state.error && <ErrorState message={state.error} onRetry={() => void model.run()} />}
      <div className="collection-toolbar">
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
        <IconButton
          label="Refresh cash shifts"
          icon={RefreshCw}
          onClick={() => void model.run()}
          disabled={state.busy}
        />
        {state.data &&
          cashForms(client, business, warehouseId, locations, state.data.shifts)
            .filter((f) => f.title === 'Open cash shift')
            .map((f) => (
              <CommandForm key={f.title} definition={f} run={execute} error={state.error} />
            ))}
      </div>
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
    </section>
  );
}
