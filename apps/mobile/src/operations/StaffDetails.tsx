import { useState } from 'react';
import type { Staff, Location } from '@inventory/contracts';
import type { CommandForm as Definition } from '@inventory/api-client';
import { formatMinorUnits } from '@inventory/domain';
import { SidePanel } from '../ui/SidePanel';
import { CommandForm } from '../components/CommandForm';
import { Action } from '../ui/Controls';
import { Text } from '../ui/Themed';
import { useNavigation } from '../shell/Navigation';
export function StaffDetails({
  staff,
  locations,
  definition,
  run,
  onClose,
}: {
  staff: Staff;
  locations: Location[];
  definition: Definition;
  run: (work: () => Promise<unknown>) => void;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const { navigate } = useNavigation();
  const fields = {
    Name: staff.name,
    'Staff code': staff.code,
    'Job title': staff.title || 'Not specified',
    Store: staff.storeId
      ? (locations.find((l) => l.id === staff.storeId)?.name ?? staff.storeId)
      : 'Business-wide',
    'Base salary': formatMinorUnits(staff.salaryMinor, staff.currency),
    Currency: staff.currency,
    Status: staff.state,
    'Record ID': staff.id,
    Version: String(staff.version),
  };
  return (
    <SidePanel title="Staff details" open onClose={onClose}>
      {Object.entries(fields).map(([label, value]) => (
        <Text key={label}>
          {label}: {value}
        </Text>
      ))}
      <Text>
        Staff records track employment and salary details. Account roles and access are managed
        separately in Team &amp; permissions.
      </Text>
      <Action
        label="Manage permissions and access"
        onPress={() => {
          onClose();
          navigate('/team');
        }}
      />
      <Action
        label={editing ? 'Cancel editing' : 'Edit staff details'}
        onPress={() => setEditing((value) => !value)}
      />
      {editing && <CommandForm key={staff.version} inline definition={definition} run={run} />}
    </SidePanel>
  );
}
