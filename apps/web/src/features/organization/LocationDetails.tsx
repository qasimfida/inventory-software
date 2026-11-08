import { hasPermission, locationInScope } from '@inventory/contracts';
import type { Location, Workspace } from '@inventory/contracts';
import { RecordDetails } from '@/components/common/RecordDetails';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { Archive, Pencil, Power } from 'lucide-react';
export function LocationDetails({
  item,
  workspace,
  busy,
  onEdit,
  onState,
}: {
  item: Location;
  workspace: Workspace;
  busy: boolean;
  onEdit: () => void;
  onState: (state: 'active' | 'suspended' | 'archived') => void;
}) {
  const writable =
    workspace.business.state === 'active' &&
    hasPermission(workspace.business, 'locations.write') &&
    locationInScope(workspace.business, item, true) &&
    item.state !== 'archived';
  const related = (id: string | null) =>
    id
      ? (workspace.locations.find((location) => location.id === id)?.name ??
        'Outside your visible scope')
      : 'Not assigned';
  const items = [
    { label: 'Name', value: item.name },
    { label: 'Code', value: item.code },
    { label: 'Type', value: item.type === 'pos' ? 'POS terminal' : item.type },
    { label: 'Status', value: item.state === 'suspended' ? 'Inactive' : item.state },
    { label: 'Business', value: workspace.business.name },
    ...(item.kind !== 'stores' ? [{ label: 'Parent store', value: related(item.storeId) }] : []),
    ...(item.kind === 'terminals'
      ? [{ label: 'Warehouse', value: related(item.warehouseId) }]
      : []),
    { label: 'Record ID', value: item.id },
    { label: 'Revision', value: String(item.version) },
  ];
  return (
    <div className="space-y-4">
      <RecordDetails label="Location details" items={items} />
      {item.state === 'archived' && (
        <p className="text-sm text-muted-foreground">
          Archived records are retained for history and cannot be restored.
        </p>
      )}
      {writable && (
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} onClick={onEdit}>
            <Pencil aria-hidden="true" />
            Edit details
          </Button>
          <ConfirmDialog
            trigger={
              <Button variant="outline" disabled={busy}>
                <Power aria-hidden="true" />
                {item.state === 'active' ? 'Deactivate' : 'Activate'}
              </Button>
            }
            title={`${item.state === 'active' ? 'Deactivate' : 'Activate'} ${item.name}?`}
            description={
              item.state === 'active'
                ? 'Deactivate dependent terminals and warehouses first. This blocks operations until reactivated.'
                : 'The parent store and warehouse must be active before this record can be activated.'
            }
            confirmLabel={item.state === 'active' ? 'Confirm deactivation' : 'Confirm activation'}
            onConfirm={() => {
              if (!busy) onState(item.state === 'active' ? 'suspended' : 'active');
            }}
          />
          <ConfirmDialog
            trigger={
              <Button variant="destructive" disabled={busy}>
                <Archive aria-hidden="true" />
                Archive
              </Button>
            }
            title={`Archive ${item.name}?`}
            description="This permanently removes the location from active operations while preserving its history. Archive dependent records first. It cannot be restored or permanently deleted."
            confirmLabel="Confirm archive"
            onConfirm={() => {
              if (!busy) onState('archived');
            }}
          />
        </div>
      )}
    </div>
  );
}
