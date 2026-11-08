import { useRef, useState } from 'react';
import { View } from 'react-native';
import { categoryInputSchema } from '@inventory/contracts';
import type { Category } from '@inventory/contracts';
import type { createCatalogClient } from '@inventory/api-client';
import { SearchControl } from '../ui/SearchControl';
import { Choice, Field, Action } from '../ui/Controls';
import { Text } from '../ui/Themed';
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
    <View>
      <Choice
        label="Category"
        value={value}
        onChange={onChange}
        options={[
          { value: '', label: 'Uncategorized' },
          ...all
            .filter((c) => c.state === 'active' || c.id === value)
            .map((c) => ({ value: c.id, label: c.name })),
        ]}
      />
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
        <View>
          <Field
            label="Category name"
            value={name}
            onChange={setName}
            disabled={busy}
            maxLength={120}
          />
          <Choice
            label="Parent category"
            value={parent}
            onChange={setParent}
            options={[
              { value: '', label: 'No parent' },
              ...all
                .filter((c) => c.state === 'active')
                .map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
          {!!error && <Text accessibilityRole="alert">{error}</Text>}
          <Action
            label={busy ? 'Creating…' : 'Create category'}
            disabled={busy || disabled}
            onPress={() => void create()}
          />
          <Action label="Cancel" disabled={busy} onPress={() => setCreating(false)} />
        </View>
      )}
    </View>
  );
}
