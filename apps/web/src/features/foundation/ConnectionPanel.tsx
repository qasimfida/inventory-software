import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/AsyncState';
import { apiClient } from '@/lib/api';
import { Panel } from '@/components/common/Layout';

type ConnectionState = 'idle' | 'loading' | 'available' | 'error';

export function ConnectionPanel() {
  const [connection, setConnection] = useState<ConnectionState>('idle');
  async function checkConnection() {
    setConnection('loading');
    try {
      await apiClient.getHealth();
      setConnection('available');
    } catch {
      setConnection('error');
    }
  }

  return (
    <Panel aria-labelledby="connection-heading">
      <h2 id="connection-heading">API connection</h2>
      <p className="text-sm text-muted-foreground">
        Checks the API process, not database or device readiness.
      </p>
      {connection === 'idle' && <EmptyState message="No connection check has been run." />}
      {connection === 'loading' && <LoadingState message="Checking the API…" />}
      {connection === 'available' && <p role="status">API is reachable.</p>}
      {connection === 'error' ? (
        <ErrorState
          message="The API could not be reached or returned an invalid response."
          onRetry={() => void checkConnection()}
        />
      ) : (
        <Button disabled={connection === 'loading'} onClick={() => void checkConnection()}>
          Check connection
        </Button>
      )}
    </Panel>
  );
}
