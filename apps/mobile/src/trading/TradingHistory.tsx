import { Pagination } from '../ui/Pagination';
import { usePageCollection } from '../ui/usePageCollection';
import { IconAction } from '../ui/IconAction';
import { LoadingState, ErrorState, EmptyState } from '../ui/AsyncState';
import { DisclosureTrigger } from '../ui/DisclosureTrigger';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { ResourceModel } from '@inventory/api-client';
import type { createTradingClient } from '@inventory/api-client';
import { View } from 'react-native';
import { RecordTable } from '../ui/RecordTable';
import { businessTime } from '@inventory/contracts';
export function TradingHistory({
  client,
  id,
  timeZone,
}: {
  client: ReturnType<typeof createTradingClient>;
  id: string;
  timeZone: string | undefined;
}) {
  const [open, setOpen] = useState(false),
    [offset, setOffset] = useState(0);
  const model = useMemo(
    () => new ResourceModel(() => client.history(id, offset)),
    [client, id, offset],
  );
  const rawPageState = useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot);
  const state = usePageCollection(rawPageState, [id], offset, ['events'], () => {
    setOffset(0);
  });
  useEffect(() => {
    if (open) void model.run();
    return model.reset;
  }, [model, open]);
  return (
    <View>
      <DisclosureTrigger
        expanded={open}
        label="Shared order history"
        onPress={() => setOpen(!open)}
        disabled={false}
      />
      {open && (
        <>
          {state.busy && <LoadingState message="Loading history…" />}
          {state.error && <ErrorState message={state.error} onRetry={() => void model.run()} />}
          <IconAction
            label="Refresh order history"
            onPress={() => void model.run()}
            disabled={state.busy}
            icon="↻"
          />
          {state.data &&
            (!state.data.events.length ? (
              <EmptyState message="No shared order history on this page" />
            ) : (
              <RecordTable
                label="Shared order history events"
                columns={['Recorded at', 'Status', 'Shared note', 'Business reference']}
                rows={state.data.events.map((e) => ({
                  id: e.id,
                  cells: [
                    businessTime(e.createdAt, timeZone),
                    e.state.charAt(0).toUpperCase() + e.state.slice(1),
                    e.note,
                    e.businessId,
                  ],
                }))}
              />
            ))}
          <Pagination
            label="history"
            offset={offset}
            pageSize={50}
            hasMore={state.data?.hasMore ?? false}
            busy={state.busy || Boolean(state.error)}
            onChange={setOffset}
          />
        </>
      )}
    </View>
  );
}
