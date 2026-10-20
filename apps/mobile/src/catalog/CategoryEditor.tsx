import { useState } from 'react';
import { Text, View } from 'react-native';
import { categoryInputSchema, categoryEditSchema } from '@inventory/contracts';
import type { Category } from '@inventory/contracts';
import type { createCatalogClient } from '@inventory/api-client';
import { Action, Choice, choices, Field, styles } from '../organization/Controls';
export function CategoryEditor({
  items,
  client,
  run,
}: {
  items: Category[];
  client: ReturnType<typeof createCatalogClient>;
  run: (work: () => Promise<unknown>) => void;
}) {
  const [editing, setEditing] = useState<Category | null>(null),
    [name, setName] = useState(''),
    [parentId, setParentId] = useState(''),
    [state, setState] = useState('active');
  function edit(c: Category | null) {
    setEditing(c);
    setName(c?.name ?? '');
    setParentId(c?.parentId ?? '');
    setState(c?.state ?? 'active');
  }
  return (
    <View style={styles.group}>
      <Text accessibilityRole="header">Categories</Text>
      {items.map((c) => (
        <View key={c.id}>
          <Text>
            {c.name} · {c.state} · {items.find((p) => p.id === c.parentId)?.name ?? 'Root'}
          </Text>
          {c.state !== 'archived' && (
            <Action label={`Edit category ${c.name}`} onPress={() => edit(c)} />
          )}
        </View>
      ))}
      <Field label="Category name" value={name} onChange={setName} />
      <Choice
        label="Parent category"
        value={parentId}
        onChange={setParentId}
        options={[
          { value: '', label: 'Root category' },
          ...items
            .filter((c) => c.id !== editing?.id && c.state === 'active')
            .map((c) => ({ value: c.id, label: c.name })),
        ]}
      />
      <Choice
        label="Category status"
        value={state}
        onChange={setState}
        options={choices(['active', 'inactive', 'archived'])}
      />
      <Action
        label="Save category"
        onPress={() =>
          run(async () => {
            const input = { name, parentId: parentId || null, state };
            const result = editing
              ? await client.editCategory(
                  editing.id,
                  categoryEditSchema.parse({ ...input, version: editing.version }),
                )
              : await client.createCategory(categoryInputSchema.parse(input));
            edit(null);
            return result;
          })
        }
      />
      {editing && <Action label="Cancel category edit" onPress={() => edit(null)} />}
    </View>
  );
}
