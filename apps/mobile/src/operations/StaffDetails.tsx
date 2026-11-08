import { useDisplayMoney } from '../ui/useDisplayMoney';
import { RecordDetails } from '../ui/RecordDetails';
import { useState } from 'react';
import type { Staff, Location } from '@inventory/contracts';
import type { CommandForm as Definition } from '@inventory/api-client';

import { SidePanel } from '../ui/SidePanel';
import { CommandForm } from '../components/CommandForm';
import { Action } from '../ui/Controls';
import { Text } from '../ui/Themed';
import { useNavigation } from '../shell/Navigation';
export function StaffDetails({
  staff,
  locations,
  definition,
  salaryDefinition,
  run,
  onClose,
}: {
  staff: Staff;
  locations: Location[];
  definition: Definition;
  salaryDefinition?: Definition | undefined;
  run: (work: () => Promise<unknown>) => void;
  onClose: () => void;
}) {
  const { formatMinorUnits } = useDisplayMoney();

  const [editing, setEditing] = useState(false);
  const { navigate } = useNavigation();
  const fields = {
    Name: staff.name,
    'Staff code': staff.code,
    'Job title': staff.title || 'Not specified',
    Store: staff.storeId
      ? (locations.find((l) => l.id === staff.storeId)?.name ?? staff.storeId)
      : 'Business-wide',
    Status: staff.state,
    'Record ID': staff.id,
    Version: String(staff.version),
  };
  return (
    <SidePanel title="Staff details" open onClose={onClose}>
      <RecordDetails
        label="Employment details"
        items={Object.entries(fields).map(([label, value]) => ({ label, value }))}
      />
      <RecordDetails
        label="Salary"
        items={[
          {
            label: 'Base salary per pay period',
            value: formatMinorUnits(staff.salaryMinor, staff.currency),
          },
          { label: 'Currency', value: staff.currency },
        ]}
      />
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
      {salaryDefinition && <CommandForm definition={salaryDefinition} run={run} />}
      {editing && <CommandForm key={staff.version} inline definition={definition} run={run} />}
    </SidePanel>
  );
}
