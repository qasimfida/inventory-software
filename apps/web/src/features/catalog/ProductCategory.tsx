import { useRef, useState } from 'react';
import { categoryInputSchema } from '@inventory/contracts';
import type { Category } from '@inventory/contracts';
import type { createCatalogClient } from '@inventory/api-client';
import { SearchControl } from '@/components/common/SearchControl';
import { Input, Select } from '@/components/ui/FormControls';
import { Button } from '@/components/ui/Button';
export function ProductCategory({
  categories,
  client,
  value,
  onChange,
  canCreate,
  disabled,
  onBusyChange,
}: {
  categories: Category[];
  client: ReturnType<typeof createCatalogClient>;
  value: string;
  onChange: (v: string) => void;
  canCreate: boolean;
  disabled: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [added, setAdded] = useState<Category[]>([]),
    [search, setSearch] = useState(''),
    [creating, setCreating] = useState(false),
    [name, setName] = useState(''),
    [parent, setParent] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const pending = useRef(false);
  const all = [...categories, ...added.filter((c) => !categories.some((x) => x.id === c.id))];
  async function create() {
    if (pending.current) return;
    setError('');
    const parsed = categoryInputSchema.safeParse({
      name,
      parentId: parent || null,
      state: 'active',
    });
    if (!parsed.success) {
      setError('Enter a category name (up to 120 characters) and valid parent.');
      return;
    }
    if (
      all.some(
        (c) =>
          c.name.toLocaleLowerCase() === parsed.data.name.toLocaleLowerCase() &&
          c.parentId === parsed.data.parentId,
      )
    ) {
      setError(
        'A category with this name already exists under this parent. Select it from the list.',
      );
      return;
    }
    pending.current = true;
    onBusyChange?.(true);
    setBusy(true);
    try {
      const category = await client.createCategory(parsed.data);
      setAdded((v) => [...v, category]);
      onChange(category.id);
      setCreating(false);
      setSearch('');
    } catch (e) {
      setError(
        e instanceof Error && 'status' in e
          ? e.message
          : 'Unable to create category. Check your connection and review existing categories before retrying.',
      );
    } finally {
      pending.current = false;
      onBusyChange?.(false);
      setBusy(false);
    }
  }
  return (
    <div className="space-y-2">
      <Select
        id="product-category"
        aria-label="Category"
        value={value}
        disabled={disabled || busy}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Uncategorized</option>
        {all
          .filter((c) => c.state === 'active' || c.id === value)
          .map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
      </Select>
      <SearchControl
        label="Find or create category"
        value={search}
        onChange={setSearch}
        disabled={disabled || busy}
        suggestions={all
          .filter(
            (c) => c.state === 'active' && c.name.toLowerCase().includes(search.toLowerCase()),
          )
          .map((c) => ({ value: c.id, label: c.name }))}
        onSelect={onChange}
        action={
          canCreate
            ? {
                label: 'Create category',
                onSelect: () => {
                  setName(search);
                  setCreating(true);
                },
              }
            : undefined
        }
      />
      {creating && (
        <div role="group" aria-label="Create category" className="space-y-2 rounded-md border p-3">
          <label htmlFor="inline-category-name">
            Category name
            <Input
              id="inline-category-name"
              value={name}
              disabled={busy}
              maxLength={120}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label htmlFor="inline-category-parent">
            Parent category
            <Select
              id="inline-category-parent"
              value={parent}
              disabled={busy}
              onChange={(e) => setParent(e.target.value)}
            >
              <option value="">No parent</option>
              {all
                .filter((c) => c.state === 'active')
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </Select>
          </label>
          {error && <p role="alert">{error}</p>}
          <div className="flex gap-2">
            <Button disabled={busy || disabled} onClick={() => void create()}>
              {busy ? 'Creating…' : 'Create category'}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setCreating(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
