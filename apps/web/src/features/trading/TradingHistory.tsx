import { Pagination } from '@/components/common/Pagination';
import { usePageCollection } from '@/components/common/usePageCollection';
import { RefreshCw } from 'lucide-react';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/AsyncState';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { ResourceModel } from '@inventory/api-client';
import type { createTradingClient } from '@inventory/api-client';
import { IconButton } from '@/components/common/IconButton';
import { AccordionSection } from '@/components/ui/Accordion';
import { Table, TableScroll } from '@/components/ui/Table';
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
    <AccordionSection
      title="Shared order history"
      open={open}
      onOpenChange={setOpen}
      className="min-w-0 shrink-0"
    >
      {open && (
        <>
          {state.busy && <LoadingState message="Loading history…" />}
          {state.error && <ErrorState message={state.error} onRetry={() => void model.run()} />}
          <IconButton
            label="Refresh order history"
            icon={RefreshCw}
            onClick={() => void model.run()}
            disabled={state.busy}
          />
          {state.data &&
            (!state.data.events.length ? (
              <EmptyState message="No shared order history on this page" />
            ) : (
              <TableScroll label="Shared order history events">
                <Table>
                  <thead>
                    <tr>
                      <th scope="col">Recorded at</th>
                      <th scope="col">Status</th>
                      <th scope="col">Shared note</th>
                      <th scope="col">Business reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.data.events.map((e) => (
                      <tr key={e.id}>
                        <td>{businessTime(e.createdAt, timeZone)}</td>
                        <td>{e.state.charAt(0).toUpperCase() + e.state.slice(1)}</td>
                        <td>{e.note}</td>
                        <td>{e.businessId}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableScroll>
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
    </AccordionSection>
  );
}
