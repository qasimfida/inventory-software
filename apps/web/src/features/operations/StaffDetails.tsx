import { useDisplayMoney } from '@/theme/useDisplayMoney';
import { RecordDetails } from '@/components/common/RecordDetails';
import { useState } from 'react';
import type { Staff, Location } from '@inventory/contracts';
import type { CommandForm as Definition } from '@inventory/api-client';

import { FormSheet } from '@/components/common/FormSheet';
import { CommandForm } from '@/components/common/CommandForm';
import { Button } from '@/components/ui/Button';
import { Link } from 'react-router-dom';
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
    <FormSheet
      title="Staff details"
      description="Employment, location and recorded base salary."
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
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
      <p>
        Staff records track employment and salary details. Account roles and access are managed
        separately in Team &amp; permissions.
      </p>
      <Link className="text-primary underline" to="/team">
        Manage permissions and access
      </Link>
      <Button onClick={() => setEditing((value) => !value)}>
        {editing ? 'Cancel editing' : 'Edit staff details'}
      </Button>
      {salaryDefinition && <CommandForm definition={salaryDefinition} run={run} />}
      {editing && <CommandForm key={staff.version} inline definition={definition} run={run} />}
    </FormSheet>
  );
}
