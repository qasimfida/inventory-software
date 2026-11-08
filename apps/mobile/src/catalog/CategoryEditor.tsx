import { ScreenHeader } from '../ui/ScreenHeader';
import { ExportRecords } from '../ui/ExportRecords';
import { Text } from '../ui/Themed';
import { RecordCollection } from '../ui/RecordCollection';
import { SidePanel } from '../ui/SidePanel';
import { SearchControl } from '../ui/SearchControl';
import { useState } from 'react';
import { View } from 'react-native';
import { categoryInputSchema, categoryEditSchema } from '@inventory/contracts';
import type { Category } from '@inventory/contracts';
import type { createCatalogClient } from '@inventory/api-client';
import { Action, Choice, choices, Field, styles } from '../organization/Controls';
export function CategoryEditor({
  items,
  busy = false,
  client,
  run,
}: {
  items: Category[];
  busy?: boolean;
  client: ReturnType<typeof createCatalogClient>;
  run: (work: () => Promise<unknown>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [parentFilter, setParentFilter] = useState('');
  const filtered = items.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) &&
      (!statusFilter || c.state === statusFilter) &&
      (!parentFilter || (parentFilter === 'root' ? !c.parentId : c.parentId === parentFilter)),
  );

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
      <ScreenHeader
        title="Categories"
        description="Organize products with categories and subcategories."
        actions={
          <>
            <ExportRecords
              name="categories"
              headers={['Category', 'Parent category', 'Status']}
              rows={filtered.map((c) => [
                c.name,
                items.find((p) => p.id === c.parentId)?.name ?? 'Root category',
                c.state,
              ])}
            />
            <Action
              label="Add category"
              disabled={busy}
              onPress={() => {
                edit(null);
                setOpen(true);
              }}
            />
          </>
        }
      />
      <RecordCollection
        showExport={false}
        label="categories"
        toolbar={
          <>
            <SearchControl label="Search categories" value={search} onChange={setSearch} />
            <Choice
              label="Category status filter"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: '', label: 'All statuses' },
                ...choices(['active', 'inactive', 'archived']),
              ]}
            />
            <Choice
              label="Category parent filter"
              value={parentFilter}
              onChange={setParentFilter}
              options={[
                { value: '', label: 'All parents' },
                { value: 'root', label: 'Root categories' },
                ...items.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
            {(statusFilter || parentFilter || search) && (
              <Action
                label="Clear filters"
                variant="ghost"
                onPress={() => {
                  setStatusFilter('');
                  setParentFilter('');
                  setSearch('');
                }}
              />
            )}
          </>
        }

        items={filtered.map((c) => ({
          id: c.id,
          title: c.name,
          subtitle: items.find((p) => p.id === c.parentId)?.name ?? 'Root category',
          detail: c.parentId ? 'Subcategory' : 'Root category',
          status: c.state,
          tone: c.state === 'active' ? 'success' : 'neutral',
        }))}
        onOpen={(id) => {
          edit(items.find((c) => c.id === id) ?? null);
          setOpen(true);
        }}
      />
      <SidePanel
        title={editing ? 'Edit category' : 'Add category'}
        open={open}
        onClose={() => setOpen(false)}
      >
        <Text tone="muted">
          Name the category and choose its parent. Archived categories cannot be edited.
        </Text>
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
          disabled={busy || editing?.state === 'archived'}
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
              setOpen(false);
              return result;
            })
          }
        />
        {editing && <Action label="Cancel category edit" onPress={() => edit(null)} />}
      </SidePanel>
    </View>
  );
}
