import { useState } from 'react';
import { AccordionSection } from '@/components/ui/Accordion';
import { createProductSchema, editProductSchema } from '@inventory/contracts';
import type { Product, Category } from '@inventory/contracts';
import type { createCatalogClient } from '@inventory/api-client';
import { Input, Select, Textarea } from '@/components/ui/FormControls';
import { Button } from '@/components/ui/Button';
export function ProductForm({
  product,
  categories,
  client,
  run,
  cancel,
  onSaved,
  busy = false,
}: {
  product: Product | null;
  busy?: boolean;
  categories: Category[];
  client: ReturnType<typeof createCatalogClient>;
  run: (work: () => Promise<unknown>) => void;
  cancel: () => void;
  onSaved?: (product: Product) => void;
}) {
  const [basicsOpen, setBasicsOpen] = useState(true);
  return (
    <form
      className="space-y-2"
      onInvalidCapture={(event) => {
        const control = event.target;
        if (control instanceof HTMLInputElement && ['name', 'sku'].includes(control.name)) {
          setBasicsOpen(true);
          requestAnimationFrame(() => control.focus());
        }
      }}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const split = (name: string) =>
          String(data.get(name) || '')
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean);
        run(async () => {
          const input = {
            name: data.get('name'),
            sku: data.get('sku'),
            description: data.get('description'),
            images: split('images'),
            categoryId: data.get('categoryId') || null,
            barcodes: split('barcodes'),
            alternativeCodes: split('alternativeCodes'),
            state: data.get('state'),
            type: data.get('type'),
            trackInventory: data.get('trackInventory') === 'yes',
          };
          const result = product
            ? await client.edit(
                product.id,
                editProductSchema.parse({ ...input, version: product.version }),
              )
            : await client.create(createProductSchema.parse(input));
          if (onSaved) onSaved(result);
          else cancel();
          return result;
        });
      }}
    >
      <h3>{product ? 'Edit product' : 'Create product'}</h3>
      <AccordionSection title="Product basics" open={basicsOpen} onOpenChange={setBasicsOpen}>
        {(
          [
            ['name', 'Product name', product?.name ?? ''],
            ['sku', 'SKU', product?.sku ?? ''],
          ] as const
        ).map(([id, label, value]) => (
          <div key={id}>
            <label htmlFor={`product-${id}`}>{label}</label>
            <Input
              id={`product-${id}`}
              name={id}
              defaultValue={value}
              required
              maxLength={id === 'sku' ? 64 : 120}
            />
          </div>
        ))}
        <label htmlFor="product-description">Description</label>
        <Textarea
          id="product-description"
          name="description"
          defaultValue={product?.description ?? ''}
          maxLength={2000}
        />
      </AccordionSection>
      <AccordionSection title="Images and product codes">
        {(
          [
            ['images', 'Image HTTPS URLs (one per line)', product?.images ?? []],
            ['barcodes', 'Barcodes (one per line)', product?.barcodes ?? []],
            [
              'alternativeCodes',
              'Alternative codes (one per line)',
              product?.alternativeCodes ?? [],
            ],
          ] as const
        ).map(([id, label, values]) => (
          <div key={id}>
            <label htmlFor={`product-${id}`}>{label}</label>
            <Textarea id={`product-${id}`} name={id} defaultValue={values.join('\n')} />
          </div>
        ))}
      </AccordionSection>
      <AccordionSection title="Category and inventory settings">
        <label htmlFor="product-category">Category</label>
        <Select id="product-category" name="categoryId" defaultValue={product?.categoryId ?? ''}>
          <option value="">Uncategorized</option>
          {categories
            .filter((c) => c.state === 'active' || c.id === product?.categoryId)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </Select>
        <label htmlFor="product-type">Product type</label>
        <Select id="product-type" name="type" defaultValue={product?.type ?? 'physical'}>
          <option>physical</option>
          <option>service</option>
        </Select>
        <label htmlFor="product-tracking">Track inventory</label>
        <Select
          id="product-tracking"
          name="trackInventory"
          defaultValue={product?.trackInventory === false ? 'no' : 'yes'}
        >
          <option value="yes">Yes</option>
          <option value="no">No (required for services)</option>
        </Select>
        <label htmlFor="product-state">Product status</label>
        <Select id="product-state" name="state" defaultValue={product?.state ?? 'active'}>
          {['active', 'inactive', 'archived'].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
        <p>
          Archiving is permanent. Stock quantities are managed through inventory movements, never
          this form.
        </p>
      </AccordionSection>
      <p className="text-sm text-muted-foreground">
        Save product details first, then set the selling price. Existing receipts keep their
        original prices.
      </p>
      <Button type="submit" disabled={busy}>
        {product || !onSaved ? 'Save product' : 'Save and set price'}
      </Button>
      <Button variant="outline" disabled={busy} onClick={cancel}>
        Cancel product edit
      </Button>
    </form>
  );
}
