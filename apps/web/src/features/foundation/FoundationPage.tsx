import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/AsyncState';
import { apiClient } from '@/lib/api';

type ConnectionState = 'idle' | 'loading' | 'available' | 'error';

export function FoundationPage() {
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
    <main id="main" className="mx-auto max-w-3xl space-y-8 px-6 py-12 sm:py-20">
      <header className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">Development foundation</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Inventory platform</h1>
        <p className="max-w-prose text-muted-foreground">
          The application shell is ready. Business workflows and offline storage are not
          implemented.
        </p>
      </header>
      <section
        aria-labelledby="connection-heading"
        className="space-y-4 rounded-xl border bg-card p-6"
      >
        <h2 id="connection-heading" className="text-lg font-semibold">
          API connection
        </h2>
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
      </section>
    </main>
  );
}
