import { hasPermission, locationInScope } from '@inventory/contracts';
import type { Location, Workspace } from '@inventory/contracts';
import { View } from 'react-native';
import { RecordDetails } from '../ui/RecordDetails';
import { ConfirmAction } from '../ui/ConfirmAction';
import { Action } from '../ui/Controls';
import { Text } from '../ui/Themed';
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
    <View>
      <RecordDetails label="Location details" items={items} />
      {item.state === 'archived' && (
        <Text>Archived records are retained for history and cannot be restored.</Text>
      )}
      {writable && (
        <>
          <Action label="Edit details" disabled={busy} onPress={onEdit} />
          <ConfirmAction
            label={item.state === 'active' ? 'Deactivate' : 'Activate'}
            disabled={busy}
            description={
              item.state === 'active'
                ? 'Deactivate dependent terminals and warehouses first. Operations are blocked until reactivated.'
                : 'The parent store and warehouse must be active.'
            }
            confirmLabel={item.state === 'active' ? 'Confirm deactivation' : 'Confirm activation'}
            onConfirm={() => {
              if (!busy) onState(item.state === 'active' ? 'suspended' : 'active');
            }}
          />
          <ConfirmAction
            label="Archive"
            disabled={busy}
            description="Permanently removes this location from active operations, preserving its history. Archive dependent records first. It cannot be restored or permanently deleted."
            confirmLabel="Confirm archive"
            onConfirm={() => {
              if (!busy) onState('archived');
            }}
          />
        </>
      )}
    </View>
  );
}
