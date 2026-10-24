import { useState } from 'react';
import type { Staff, Location } from '@inventory/contracts';
import type { CommandForm as Definition } from '@inventory/api-client';
import { formatMinorUnits } from '@inventory/domain';
import { FormSheet } from '@/components/common/FormSheet';
import { CommandForm } from '@/components/common/CommandForm';
import { Button } from '@/components/ui/Button';
import { Link } from 'react-router-dom';
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
    <FormSheet
      title="Staff details"
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <dl className="space-y-3">
        {Object.entries(fields).map(([label, value]) => (
          <div key={label}>
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="break-words">{value}</dd>
          </div>
        ))}
      </dl>
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
      {editing && <CommandForm key={staff.version} inline definition={definition} run={run} />}
    </FormSheet>
  );
}
