import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/AsyncState';
import { apiClient } from '@/lib/api';
import { Panel } from '@/components/common/Layout';

type ConnectionState = 'idle' | 'loading' | 'available' | 'error';

export function ConnectionPanel() {
  const [connection, setConnection] = useState<ConnectionState>('idle');
  const checkConnection = useCallback(async () => {
    setConnection('loading');
    try {
      await apiClient.getHealth('ready');
      setConnection('available');
    } catch {
      setConnection('error');
    }
  }, []);
  useEffect(() => {
    const initial = setTimeout(() => void checkConnection(), 0);
    const offline = () => setConnection('error');
    const online = () => {
      void checkConnection();
    };
    const timer = setInterval(online, 30000);
    window.addEventListener('offline', offline);
    window.addEventListener('online', online);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
      window.removeEventListener('offline', offline);
      window.removeEventListener('online', online);
    };
  }, [checkConnection]);

  return (
    <Panel aria-labelledby="connection-heading">
      <h2 id="connection-heading">API connection</h2>
      <p className="text-sm text-muted-foreground">
        Checks API and database readiness every 30 seconds. This does not confirm pending sales have
        synchronized.
      </p>
      {connection === 'idle' && <EmptyState message="No connection check has been run." />}
      {connection === 'loading' && <LoadingState message="Checking the API…" />}
      {connection === 'available' && <p role="status">API and database are ready.</p>}
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
