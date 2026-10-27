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
    <FormSheet title="Listing history" open onOpenChange={onClose}>
      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !events ? (
        <LoadingState message="Loading history…" />
      ) : !events.length ? (
        <EmptyState message="No listing events yet" />
      ) : (
        <ol className="space-y-4">
          {events.map((e) => (
            <li key={e.id} className="border-b pb-3">
              <p className="font-medium">{e.transition.replace('->', ' → ')}</p>
              <p>{e.reasonCode.replaceAll('_', ' ')}</p>
              <p className="text-muted-foreground">
                {e.actorId ? `Account ${e.actorId}` : 'System'} ·{' '}
                {new Date(e.timestamp).toLocaleString()}
              </p>
            </li>
          ))}
        </ol>
      )}
      <p className="text-muted-foreground">Latest 200 events.</p>
    </FormSheet>
  );
}
