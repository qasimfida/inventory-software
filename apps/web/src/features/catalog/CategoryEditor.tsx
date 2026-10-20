import { useState } from 'react';
import { categoryInputSchema, categoryEditSchema } from '@inventory/contracts';
import type { Category } from '@inventory/contracts';
import type { createCatalogClient } from '@inventory/api-client';
import { Input, Select } from '@/components/ui/FormControls';
import { Button } from '@/components/ui/Button';
export function CategoryEditor({
  items,
  client,
  run,
}: {
  items: Category[];
  client: ReturnType<typeof createCatalogClient>;
  run: (work: () => Promise<unknown>) => void;
}) {
  const [editing, setEditing] = useState<Category | null>(null);
  return (
    <section aria-label="Categories">
      <h3>Categories</h3>
      <ul>
        {items.map((c) => (
          <li key={c.id}>
            {c.name} · {c.state} · {items.find((p) => p.id === c.parentId)?.name ?? 'Root'}{' '}
            {c.state !== 'archived' && (
              <Button variant="outline" onClick={() => setEditing(c)}>
                Edit category {c.name}
              </Button>
            )}
          </li>
        ))}
      </ul>
      <form
        key={editing?.id ?? 'new'}
        className="space-y-2"
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
            return result;
          });
        }}
      >
        <label htmlFor="category-name">Category name</label>
        <Input
          id="category-name"
          name="name"
          defaultValue={editing?.name ?? ''}
          required
          maxLength={120}
        />
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
        <label htmlFor="category-state">Category status</label>
        <Select id="category-state" name="state" defaultValue={editing?.state ?? 'active'}>
          {['active', 'inactive', 'archived'].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
        <Button type="submit">Save category</Button>
        {editing && (
          <Button variant="outline" onClick={() => setEditing(null)}>
            Cancel category edit
          </Button>
        )}
      </form>
    </section>
  );
}
