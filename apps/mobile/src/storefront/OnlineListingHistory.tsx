import { onlineError } from '@inventory/api-client';
import { useEffect, useState } from 'react';
import type { OnlineClient } from '@inventory/api-client';
import { SidePanel } from '../ui/SidePanel';
import { Text } from '../ui/Themed';
import { Action } from '../ui/Controls';
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
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    void client
      .history(id)
      .then((v) => {
        if (active) {
          setEvents(v);
          setError('');
        }
      })
      .catch((e) => {
        if (active) setError(onlineError(e));
      });
    return () => {
      active = false;
    };
  }, [client, id, retry]);
  return (
    <SidePanel title="Listing history" open onClose={onClose}>
      {error ? (
        <>
          <Text accessibilityRole="alert">{error}</Text>
          <Action label="Retry" onPress={() => setRetry(retry + 1)} />
        </>
      ) : !events ? (
        <Text>Loading history…</Text>
      ) : events.length ? (
        events.map((e) => (
          <Text key={e.id}>
            {e.transition.replace('->', ' → ')} · {e.reasonCode.replaceAll('_', ' ')}
            {' · '}
            {e.actorId ? `Account ${e.actorId}` : 'System'} ·{' '}
            {new Date(e.timestamp).toLocaleString()}
          </Text>
        ))
      ) : (
        <Text>No listing events yet.</Text>
      )}
      <Text>Latest 200 events.</Text>
    </SidePanel>
  );
}
