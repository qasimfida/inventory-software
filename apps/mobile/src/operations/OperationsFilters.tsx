import type { Location, OperationQuery } from '@inventory/contracts';
type Filters = Omit<OperationQuery, 'search' | 'offset'>;
import { useState } from 'react';
import { FilterButton } from '../ui/FilterButton';
import { SidePanel } from '../ui/SidePanel';
import { Choice } from '../ui/Controls';
export function OperationsFilters({
  mode,
  locations,
  value,
  onChange,
}: {
  mode: 'staff' | 'expenses';
  locations: Location[];
  value: Filters;
  onChange: (value: Filters) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <FilterButton
        active={[
          value.storeId &&
            `Store: ${locations.find((l) => l.id === value.storeId)?.name ?? value.storeId}`,
          value.kind,
          value.staffState,
        ].filter((v): v is string => !!v)}
        onPress={() => setOpen(true)}
      />
      <SidePanel title="Filters" open={open} onClose={() => setOpen(false)}>
        <Choice
          label="Store"
          value={value.storeId ?? ''}
          onChange={(storeId) => onChange({ ...value, storeId: storeId || undefined })}
          options={[
            { value: '', label: 'All stores' },
            ...locations
              .filter((l) => l.kind === 'stores')
              .map((l) => ({ value: l.id, label: l.name })),
          ]}
        />
        {mode === 'staff' ? (
          <Choice
            label="Status"
            value={value.staffState ?? ''}
            onChange={(state) =>
              onChange({ ...value, staffState: (state || undefined) as Filters['staffState'] })
            }
            options={[
              { value: '', label: 'All statuses' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
        ) : (
          <Choice
            label="Type"
            value={value.kind ?? ''}
            onChange={(kind) =>
              onChange({ ...value, kind: (kind || undefined) as Filters['kind'] })
            }
            options={[
              { value: '', label: 'All costs' },
              { value: 'expense', label: 'Expense' },
              { value: 'salary', label: 'Salary' },
            ]}
          />
        )}
      </SidePanel>
    </>
  );
}
