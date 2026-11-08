import { Table, TableScroll } from '@/components/ui/Table';
import { onlineError } from '@inventory/api-client';
import { useEffect, useState } from 'react';
import type { OnlineClient } from '@inventory/api-client';
import { FormSheet } from '@/components/common/FormSheet';
import { ErrorState, EmptyState, LoadingState } from '@/components/common/AsyncState';
export function OnlineListingHistory({
  client,
  id,
  onClose,
}: {
  client: OnlineClient;
  id: string;
  onClose: () => void;
}) {
  const [events, setEvents] = useState<Awaited<ReturnType<OnlineClient['history']>> | null>(null),
    [error, setError] = useState('');
  const load = () => {
    setError('');
    void client
      .history(id)
      .then(setEvents)
      .catch((e) => setError(onlineError(e)));
  };
  useEffect(() => {
    let active = true;
    void client
      .history(id)
      .then((v) => {
        if (active) setEvents(v);
      })
      .catch((e) => {
        if (active) setError(onlineError(e));
      });
    return () => {
      active = false;
    };
  }, [client, id]);
  return (
    <FormSheet
      title="Listing history"
      description="Recorded publication transitions; latest 200 events."
      open
      onOpenChange={onClose}
    >
      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !events ? (
        <LoadingState message="Loading history…" />
      ) : !events.length ? (
        <EmptyState message="No listing events yet" />
      ) : (
        <TableScroll label="Listing events">
          <Table>
            <thead>
              <tr>
                <th>Transition</th>
                <th>Reason</th>
                <th>Actor reference</th>
                <th>Recorded at</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <th scope="row">{e.transition.replace('->', ' → ')}</th>
                  <td>{e.reasonCode.replaceAll('_', ' ')}</td>
                  <td>{e.actorId ?? 'System'}</td>
                  <td>{new Date(e.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableScroll>
      )}
      <p className="text-muted-foreground">Latest 200 events.</p>
    </FormSheet>
  );
}
