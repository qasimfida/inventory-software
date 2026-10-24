import { Pagination } from '../ui/Pagination';
import { usePageCollection } from '../ui/usePageCollection';
import { IconAction } from '../ui/IconAction';
import { LoadingState } from '../ui/AsyncState';
import { DisclosureTrigger } from '../ui/DisclosureTrigger';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { ResourceModel } from '@inventory/api-client';
import type { createTradingClient } from '@inventory/api-client';
import { View } from 'react-native';
import { Text } from '../ui/Themed';
export function TradingHistory({
  client,
  id,
}: {
  client: ReturnType<typeof createTradingClient>;
  id: string;
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
          {Boolean(state.error) && <Text accessibilityRole="alert">{state.error}</Text>}
          <IconAction
            label="Refresh order history"
            onPress={() => void model.run()}
            disabled={state.busy}
            icon="↻"
          />
          {state.data?.events.map((e) => (
            <Text key={e.id}>
              {e.createdAt} · {e.state} · {e.note} · business {e.businessId}
            </Text>
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
