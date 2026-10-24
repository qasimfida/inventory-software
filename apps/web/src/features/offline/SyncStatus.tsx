import { syncActivity } from '@inventory/api-client';
import { useEffect, useState } from 'react';
import type { OfflineWorkspace } from '@inventory/api-client';
import { Progress } from '@/components/ui/Progress';
import { Button } from '@/components/ui/Button';
import { FormSheet } from '@/components/common/FormSheet';
export function SyncStatus({ state }: { state: ReturnType<OfflineWorkspace['snapshot']> }) {
  const [open, setOpen] = useState(false);
  const sync = state.sync;
  useEffect(() => (sync ? syncActivity.publish(sync, () => setOpen(true)) : undefined), [sync]);
  const [dismissed, setDismissed] = useState<typeof sync>(undefined);
  const notice =
    sync &&
    sync !== dismissed &&
    sync.total > 0 &&
    (sync.phase === 'complete' || sync.phase === 'attention')
      ? sync.phase === 'complete'
        ? `Sync complete: ${sync.confirmed} records confirmed by the server.`
        : `Sync needs attention: ${sync.remaining} records still await confirmation.`
      : '';
  if (!sync) return null;
  const running = sync.phase === 'uploading' || sync.phase === 'downloading';
  const message = running
    ? `Synchronizing: ${sync.confirmed} of ${sync.total} pending records confirmed`
    : sync.phase === 'complete'
      ? 'Synchronization complete'
      : 'Synchronization needs attention';
  return (
    <section
      aria-label="Synchronization activity"
      className="rounded-lg border bg-card p-3 space-y-2"
    >
      {notice && (
        <div role="status" className="sync-toast">
          <p>{notice}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
              View result
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDismissed(sync)}>
              Dismiss
            </Button>
          </div>
        </div>
      )}
      <h3>Synchronization activity</h3>
      <p role="status">{message}</p>
      {running && (
        <Progress
          label={message}
          {...(sync.total ? { value: (100 * sync.confirmed) / sync.total } : {})}
        />
      )}
      <p className="text-sm text-muted-foreground">
        {sync.remaining} records still await server confirmation.{' '}
        {sync.phase === 'downloading' ? 'Refreshing the authorized catalog…' : ''}
      </p>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        View synchronization details
      </Button>
      <FormSheet title="Synchronization details" open={open} onOpenChange={setOpen}>
        {state.error && <p role="alert">{state.error}</p>}
        {state.data?.outbox.map((e) => (
          <div key={e.operation.id} className="border-b py-2 break-all">
            <p>
              {e.state} · {e.operation.id}
            </p>
            <p>
              {e.result?.saleId ? `Confirmed sale: ${e.result.saleId}` : 'No confirmed sale yet'}
            </p>
            <p>{e.error}</p>
          </div>
        ))}
        {!state.data?.outbox.length && <p>No locally recorded sales.</p>}
      </FormSheet>
    </section>
  );
}
