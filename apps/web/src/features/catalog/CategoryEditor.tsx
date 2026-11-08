import { ScreenHeader } from '@/components/common/ScreenHeader';
import { ExportRecords } from '@/components/common/ExportRecords';
import { Plus } from 'lucide-react';
import { RecordCollection } from '@/components/common/RecordCollection';
import { FormSheet } from '@/components/common/FormSheet';
import { SearchControl } from '@/components/common/SearchControl';
import { useState } from 'react';
import { categoryInputSchema, categoryEditSchema } from '@inventory/contracts';
import type { Category } from '@inventory/contracts';
import type { createCatalogClient } from '@inventory/api-client';
import { Input, Select } from '@/components/ui/FormControls';
import { Button } from '@/components/ui/Button';
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

  const [editing, setEditing] = useState<Category | null>(null);
  return (
    <section aria-label="Categories">
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
            <Button
              disabled={busy}
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              <Plus aria-hidden="true" /> Add category
            </Button>
          </>
        }
      />
      <RecordCollection
        showExport={false}
        label="categories"
        columns={['Category', 'Parent category', 'Hierarchy']}
        toolbar={
          <>
            <SearchControl label="Search categories" value={search} onChange={setSearch} />
            <Select
              aria-label="Category status filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              {['active', 'inactive', 'archived'].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </Select>
            <Select
              aria-label="Category parent filter"
              value={parentFilter}
              onChange={(e) => setParentFilter(e.target.value)}
            >
              <option value="">All parents</option>
              <option value="root">Root categories</option>
              {items.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            {(statusFilter || parentFilter || search) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setStatusFilter('');
                  setParentFilter('');
                  setSearch('');
                }}
              >
                Clear filters
              </Button>
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
          setEditing(items.find((c) => c.id === id) ?? null);
          setOpen(true);
        }}
      />
      <FormSheet
        title={editing ? 'Edit category' : 'Add category'}
        open={open}
        description="Name the category and choose its parent. Archived categories cannot be edited."
        onOpenChange={setOpen}
      >
        <form
          key={editing?.id ?? 'new'}
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            run(async () => {
              const input = {
                name: data.get('name'),
                parentId: data.get('parentId') || null,
                state: data.get('state'),
              };
              const result = editing
                ? await client.editCategory(
                    editing.id,
                    categoryEditSchema.parse({ ...input, version: editing.version }),
                  )
                : await client.createCategory(categoryInputSchema.parse(input));
              setEditing(null);
              setOpen(false);
              return result;
            });
          }}
        >
          <fieldset disabled={busy || editing?.state === 'archived'} className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="category-name">Category name</label>
              <Input
                id="category-name"
                name="name"
                defaultValue={editing?.name ?? ''}
                required
                maxLength={120}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="category-parent">Parent category</label>
              <Select id="category-parent" name="parentId" defaultValue={editing?.parentId ?? ''}>
                <option value="">Root category</option>
                {items
                  .filter((c) => c.id !== editing?.id && c.state === 'active')
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </Select>
            </div>
            <div className="space-y-1">
              <label htmlFor="category-state">Category status</label>
              <Select id="category-state" name="state" defaultValue={editing?.state ?? 'active'}>
                {['active', 'inactive', 'archived'].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            </div>
            <div className="drawer-actions">
              <Button type="submit">Save category</Button>
              {editing && (
                <Button variant="outline" onClick={() => setEditing(null)}>
                  Cancel category edit
                </Button>
              )}
            </div>
          </fieldset>
        </form>
      </FormSheet>
    </section>
  );
}
