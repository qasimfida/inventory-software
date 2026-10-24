import { useState } from 'react';
import { FilterButton } from '@/components/common/FilterButton';
import { SearchControl } from '@/components/common/SearchControl';
import type { Category } from '@inventory/contracts';
import { Input, Select } from '@/components/ui/FormControls';
import { Button } from '@/components/ui/Button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/Popover';
export function CatalogFilters({
  categories,
  initialSearch,
  busy,
  onSearch,
  suggestions = [],
}: {
  categories: Category[];
  suggestions?: { value: string; label: string }[];
  initialSearch?: string | undefined;
  busy: boolean;
  onSearch: (data: FormData) => void;
}) {
  const [fields, setFields] = useState({
    search: initialSearch ?? '',
    code: '',
    state: '',
    category: '',
  });
  const [applied, setApplied] = useState(fields);
  function apply(next = fields) {
    setApplied(next);
    const data = new FormData();
    Object.entries(next).forEach(([key, value]) => data.set(key, value));
    onSearch(data);
  }
  function change(key: keyof typeof fields, value: string, submit = true) {
    const next = { ...fields, [key]: value };
    setFields(next);
    if (submit) apply(next);
  }
  return (
    <>
      <SearchControl
        label="Search products"
        value={fields.search}
        suggestions={suggestions}
        busy={busy}
        onChange={(value) => change('search', value)}
      />
      <Popover>
        <PopoverTrigger asChild>
          <FilterButton
            active={[
              applied.state && `Status: ${applied.state}`,
              applied.category &&
                `Category: ${categories.find((c) => c.id === applied.category)?.name ?? applied.category}`,
              applied.code && `Code: ${applied.code}`,
            ].filter((value): value is string => Boolean(value))}
          />
        </PopoverTrigger>
        <PopoverContent>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              apply();
            }}
          >
            <label htmlFor="catalog-code">Scan or enter barcode / SKU</label>
            <Input
              id="catalog-code"
              value={fields.code}
              maxLength={64}
              onChange={(e) => change('code', e.target.value, false)}
            />
            <label htmlFor="catalog-status">Filter product status</label>
            <Select
              id="catalog-status"
              value={fields.state}
              onChange={(e) => change('state', e.target.value)}
            >
              <option value="">All statuses</option>
              {['active', 'inactive', 'archived'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
            <label htmlFor="catalog-category">Filter category</label>
            <Select
              id="catalog-category"
              value={fields.category}
              onChange={(e) => change('category', e.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Button type="submit" disabled={busy}>
              Search catalog
            </Button>
          </form>
        </PopoverContent>
      </Popover>
    </>
  );
}
