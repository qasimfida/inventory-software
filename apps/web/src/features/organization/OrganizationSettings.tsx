import { CursorPagination } from '@/components/common/CursorPagination';
import type { OrganizationModel, OrganizationView } from '@inventory/api-client';
import type { Business } from '@inventory/contracts';
import { hasPermission } from '@inventory/contracts';
import { Button } from '@/components/ui/Button';
import { BusinessEditor } from './BusinessEditor';
import { LocationEditor } from './LocationEditor';
import { MemberEditor } from './MemberEditor';
import { AuditHistory } from './AuditHistory';

export function OrganizationSettings({
  business,
  model,
  state,
}: {
  business: Business;
  model: OrganizationModel;
  state: OrganizationView;
}) {
  return (
    <div className="screen-section">
      {hasPermission(business, 'business.write') && (
        <BusinessEditor
          key={`${business.id}-${business.version}`}
          business={business}
          model={model}
          busy={state.busy}
        />
      )}
      {business.state !== 'active' && (
        <p>
          This business is {business.state}. Child management is locked. Archived records cannot be
          restored.
        </p>
      )}
      {state.workspace && (
        <>
          <LocationEditor model={model} workspace={state.workspace} busy={state.busy} />
          {hasPermission(business, 'users.read') && (
            <MemberEditor model={model} workspace={state.workspace} busy={state.busy} />
          )}
        </>
      )}
      {hasPermission(business, 'audit.read') && (
        <>
          <Button disabled={state.busy} variant="outline" onClick={() => void model.audit()}>
            View audit history
          </Button>
          <AuditHistory events={state.events} timeZone={business.timeZone ?? 'UTC'} />
          {state.nextCursor && (
            <CursorPagination
              label="audit events"
              hasMore={Boolean(state.nextCursor)}
              busy={state.busy}
              onNext={() => void model.audit(true)}
            />
          )}
        </>
      )}
    </div>
  );
}
