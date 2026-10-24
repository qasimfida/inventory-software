import { useEffect, useSyncExternalStore } from 'react';
import { hasPermission } from '@inventory/contracts';
import { settingsModel } from '@/platform/settings';
import { useWorkspace } from '@/shell/WorkspaceContext';
import { SecurityPanel } from './SecurityPanel';
import { AuditHistory } from '@/features/organization/AuditHistory';
import { ErrorState, LoadingState } from '@/components/common/AsyncState';
import { CursorPagination } from '@/components/common/CursorPagination';
export function LogsPage() {
  const { business, model, state } = useWorkspace();
  const settings = useSyncExternalStore(settingsModel.subscribe, settingsModel.snapshot);
  const allowed = !!business && hasPermission(business, 'audit.read');
  useEffect(() => {
    if (allowed) void model.audit();
  }, [allowed, business?.id, model]);
  if (!allowed && !settings.snapshot?.canManagePlatform) return <p>Audit access is required.</p>;
  return (
    <section className="screen-section" aria-label="Logs">
      {settings.snapshot?.canManagePlatform && <SecurityPanel platform section="security" />}
      {allowed && (
        <>
          <div className="screen-header">
            <h2>Business activity</h2>
          </div>
          {state.busy && <LoadingState message="Loading logs…" />}
          {state.error && <ErrorState message={state.error} onRetry={() => void model.audit()} />}
          <AuditHistory
            onRefresh={() => void model.audit()}
            busy={state.busy}
            events={state.events}
            timeZone={business?.timeZone ?? 'UTC'}
          />
          {state.nextCursor && (
            <CursorPagination
              label="audit events"
              hasMore
              busy={state.busy}
              onNext={() => void model.audit(true)}
            />
          )}
        </>
      )}
    </section>
  );
}
