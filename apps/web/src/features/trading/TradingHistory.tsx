import { Pagination } from '@/components/common/Pagination';
import { usePageCollection } from '@/components/common/usePageCollection';
import { RefreshCw } from 'lucide-react';
import { LoadingState } from '@/components/common/AsyncState';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { ResourceModel } from '@inventory/api-client';
import type { createTradingClient } from '@inventory/api-client';
import { Button } from '@/components/ui/Button';
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
    <div>
      <Button onClick={() => setOpen(!open)} disabled={false}>
        Shared order history
      </Button>
      {open && (
        <>
          {state.busy && <LoadingState message="Loading history…" />}
          {state.error && <p role="alert">{state.error}</p>}
          <Button
            onClick={() => void model.run()}
            disabled={state.busy}
            variant="ghost"
            size="icon"
            aria-label="Refresh order history"
            title="Refresh"
          >
            <RefreshCw aria-hidden="true" />
          </Button>
          {state.data?.events.map((e) => (
            <p key={e.id}>
              {e.createdAt} · {e.state} · {e.note} · business {e.businessId}
            </p>
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
    </div>
  );
}
