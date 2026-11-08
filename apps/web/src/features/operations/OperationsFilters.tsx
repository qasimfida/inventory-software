import { useId } from 'react';
import type { Location, OperationQuery } from '@inventory/contracts';
type Filters = Omit<OperationQuery, 'search' | 'offset'>;
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { FilterButton } from '@/components/common/FilterButton';
import { Select } from '@/components/ui/FormControls';
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
  const id = useId();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <FilterButton
          active={[
            value.storeId &&
              `Store: ${locations.find((l) => l.id === value.storeId)?.name ?? value.storeId}`,
            value.kind,
            value.staffState,
          ].filter((v): v is string => !!v)}
        />
      </PopoverTrigger>
      <PopoverContent className="space-y-3" align="end">
        <label>
          Store
          <Select
            value={value.storeId ?? ''}
            onChange={(e) => onChange({ ...value, storeId: e.target.value || undefined })}
          >
            <option value="">All stores</option>
            {locations
              .filter((l) => l.kind === 'stores')
              .map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
          </Select>
        </label>
        {mode === 'staff' ? (
          <label htmlFor={`${id}-status`}>
            Status
            <Select
              id={`${id}-status`}
              value={value.staffState ?? ''}
              onChange={(e) =>
                onChange({
                  ...value,
                  staffState: (e.target.value || undefined) as Filters['staffState'],
                })
              }
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </label>
        ) : (
          <label htmlFor={`${id}-kind`}>
            Type
            <Select
              id={`${id}-kind`}
              value={value.kind ?? ''}
              onChange={(e) =>
                onChange({ ...value, kind: (e.target.value || undefined) as Filters['kind'] })
              }
            >
              <option value="">All costs</option>
              <option value="expense">Expense</option>
              <option value="salary">Salary</option>
            </Select>
          </label>
        )}
      </PopoverContent>
    </Popover>
  );
}
