import { useState } from 'react';
import { View } from 'react-native';
import type { Location, ShiftQuery } from '@inventory/contracts';
import { SearchControl } from '../ui/SearchControl';
import { Action, Choice, Field } from '../ui/Controls';
import { SidePanel } from '../ui/SidePanel';
export type CashFilterValues = Omit<ShiftQuery, 'warehouseId' | 'offset' | 'search'>;
export function CashFilters({
  staff,
  search,
  onSearch,
  filters,
  onChange,
  locations,
}: {
  staff: { id: string; label: string }[];
  search: string;
  onSearch: (v: string) => void;
  filters: CashFilterValues;
  onChange: (v: CashFilterValues) => void;
  locations: Location[];
}) {
  const [open, setOpen] = useState(false);
  const count = Object.values(filters).filter(Boolean).length;
  return (
    <View>
      <SearchControl label="Search cash shifts" value={search} onChange={onSearch} />
      <Action label={`Filters${count ? ` (${count})` : ''}`} onPress={() => setOpen(true)} />
      {(search || count > 0) && (
        <Action
          label="Clear all"
          onPress={() => {
            onSearch('');
            onChange({});
          }}
        />
      )}
      <SidePanel title="Cash shift filters" open={open} onClose={() => setOpen(false)}>
        <Choice
          label="Status"
          value={filters.state ?? ''}
          options={[
            { value: '', label: 'All statuses' },
            { value: 'open', label: 'Open' },
            { value: 'closed', label: 'Closed' },
          ]}
          onChange={(v) =>
            onChange({ ...filters, state: v === 'open' || v === 'closed' ? v : undefined })
          }
        />
        <Choice
          label="Staff member"
          value={filters.actorId ?? ''}
          onChange={(v) => onChange({ ...filters, actorId: v || undefined })}
          options={[
            { value: '', label: 'All permitted staff' },
            ...staff.map((s) => ({ value: s.id, label: s.label })),
          ]}
        />
        <Choice
          label="Terminal"
          value={filters.terminalId ?? ''}
          options={[
            { value: '', label: 'All terminals' },
            ...locations.map((l) => ({ value: l.id, label: l.name })),
          ]}
          onChange={(v) => onChange({ ...filters, terminalId: v || undefined })}
        />
        <Field
          label="Opened from (YYYY-MM-DD)"
          value={filters.from ?? ''}
          onChange={(v) => onChange({ ...filters, from: v || undefined })}
        />
        <Field
          label="Opened through (YYYY-MM-DD)"
          value={filters.to ?? ''}
          onChange={(v) => onChange({ ...filters, to: v || undefined })}
        />
      </SidePanel>
    </View>
  );
}
