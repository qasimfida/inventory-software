import type { Location, ShiftQuery } from '@inventory/contracts';
import { SearchControl } from '@/components/common/SearchControl';
import { FilterButton } from '@/components/common/FilterButton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { Input, Select } from '@/components/ui/FormControls';
import { Button } from '@/components/ui/Button';
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
  const active = [
    filters.state,
    filters.actorId
      ? (staff.find((s) => s.id === filters.actorId)?.label ?? filters.actorId)
      : undefined,
    locations.find((l) => l.id === filters.terminalId)?.name,
    filters.from && `From ${filters.from}`,
    filters.to && `To ${filters.to}`,
  ].filter((v): v is string => !!v);
  return (
    <>
      <SearchControl
        label="Search cash shifts"
        placeholder="Shift, cashier, terminal or status…"
        value={search}
        onChange={onSearch}
      />
      <Popover>
        <PopoverTrigger asChild>
          <FilterButton active={active} />
        </PopoverTrigger>
        <PopoverContent className="space-y-3">
          <label htmlFor="cash-status">
            Status
            <Select
              id="cash-status"
              aria-label="Status"
              value={filters.state ?? ''}
              onChange={(e) =>
                onChange({
                  ...filters,
                  state:
                    e.target.value === 'open' || e.target.value === 'closed'
                      ? e.target.value
                      : undefined,
                })
              }
            >
              <option value="">All statuses</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </Select>
          </label>
          <label htmlFor="cash-staff">
            Staff member
            <Select
              id="cash-staff"
              aria-label="Staff member"
              value={filters.actorId ?? ''}
              onChange={(e) => onChange({ ...filters, actorId: e.target.value || undefined })}
            >
              <option value="">All permitted staff</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </label>
          <label htmlFor="cash-terminal">
            Terminal
            <Select
              id="cash-terminal"
              aria-label="Terminal"
              value={filters.terminalId ?? ''}
              onChange={(e) => onChange({ ...filters, terminalId: e.target.value || undefined })}
            >
              <option value="">All terminals</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} · {l.code}
                </option>
              ))}
            </Select>
          </label>
          <label htmlFor="cash-from">
            Opened from
            <Input
              id="cash-from"
              type="date"
              value={filters.from ?? ''}
              max={filters.to}
              onChange={(e) => onChange({ ...filters, from: e.target.value || undefined })}
            />
          </label>
          <label htmlFor="cash-to">
            Opened through
            <Input
              id="cash-to"
              type="date"
              value={filters.to ?? ''}
              min={filters.from}
              onChange={(e) => onChange({ ...filters, to: e.target.value || undefined })}
            />
          </label>
          <p className="text-xs text-muted-foreground">
            Dates use the business timezone. Search by staff email when permitted, or staff
            reference.
          </p>
        </PopoverContent>
      </Popover>
      {(search || active.length > 0) && (
        <Button
          variant="ghost"
          onClick={() => {
            onSearch('');
            onChange({});
          }}
        >
          Clear all
        </Button>
      )}
    </>
  );
}
