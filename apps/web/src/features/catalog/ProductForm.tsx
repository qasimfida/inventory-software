import { ProductImages } from './ProductImages';
import { ProductCategory } from './ProductCategory';
import { useState } from 'react';
import { RichTextEditor } from '@/components/common/RichTextEditor';
import { SkuStatusIcon, SkuProductHint } from './SkuStatus';
import { useProductFormFeedback } from './useProductFormFeedback';
import { AccordionSection } from '@/components/ui/Accordion';
import { saveProductDetails } from '@inventory/api-client';
import type { Product, Category } from '@inventory/contracts';
import type { createCatalogClient } from '@inventory/api-client';
import { Input, Select, Textarea } from '@/components/ui/FormControls';
import { Button } from '@/components/ui/Button';
export function ProductForm({
  product,
  focusField,
  categories,
  client,
  run,
  cancel,
  onSaved,
  busy = false,
  canCreateCategory = false,
}: {
  product: Product | null;
  focusField?: string;
  busy?: boolean;
  canCreateCategory?: boolean;
  categories: Category[];
  client: ReturnType<typeof createCatalogClient>;
  run: (work: () => Promise<unknown>) => void;
  cancel: () => void;
  onSaved?: (product: Product) => void;
}) {
  const [images, setImages] = useState(product?.images ?? []);
  const [imageBusy, setImageBusy] = useState(false);
  const [categoryBusy, setCategoryBusy] = useState(false);
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const {
    clearField,
    sku,
    feedback,
    skuError,
    message,
    invalidProps,
    codesOpen,
    setCodesOpen,
    settingsOpen,
    setSettingsOpen,
    showErrors,
    basicsOpen,
    setBasicsOpen,
    onChange,
  } = useProductFormFeedback(product, client, focusField);
  return (
    <form
      className="space-y-2"
      noValidate
      onChange={onChange}
      onInvalidCapture={(event) => {
        const control = event.target;
        if (control instanceof HTMLInputElement && ['name', 'sku'].includes(control.name)) {
          setBasicsOpen(true);
          requestAnimationFrame(() => control.focus());
        }
      }}
      onSubmit={(e) => {
        e.preventDefault();
        if (categoryBusy || imageBusy || busy) return;
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
            images,
            categoryId: data.get('categoryId') || null,
            barcodes: split('barcodes'),
            alternativeCodes: split('alternativeCodes'),
            state: data.get('state'),
            type: data.get('type'),
            trackInventory: data.get('trackInventory') === 'yes',
          };
          const result = await saveProductDetails(client, product, input, showErrors);
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
            <div className="relative">
              <Input
                className={id === 'sku' ? 'pr-9' : undefined}
                {...invalidProps(id)}
                id={`product-${id}`}
                name={id}
                defaultValue={value}
                required
                maxLength={id === 'sku' ? 64 : 120}
              />
              {id === 'sku' && (
                <SkuStatusIcon feedback={feedback?.value === sku ? feedback : null} />
              )}
            </div>
            {id === 'sku' && skuError ? (
              <div className="flex items-center gap-1">
                {message(id)}
                <SkuProductHint key={sku} feedback={feedback?.value === sku ? feedback : null} />
              </div>
            ) : (
              message(id)
            )}
            {id === 'sku' &&
              !skuError &&
              feedback?.value === sku &&
              feedback.state !== 'duplicate' && (
                <p
                  role="status"
                  className={
                    feedback.state === 'available' ? 'sr-only' : 'text-sm text-muted-foreground'
                  }
                >
                  {feedback.state === 'checking'
                    ? 'Checking SKU…'
                    : feedback.state === 'unknown'
                      ? 'SKU check unavailable. It will be checked when saving.'
                      : 'SKU is available.'}
                </p>
              )}
          </div>
        ))}
        <label htmlFor="product-description">Description</label>
        <input type="hidden" name="description" value={description} />
        <RichTextEditor
          id="product-description"
          label="Description"
          value={description}
          onChange={(value) => {
            setDescription(value);
            clearField('description');
          }}
          invalid={invalidProps('description')['aria-invalid']}
          describedBy={invalidProps('description')['aria-describedby']}
          disabled={busy}
        />
        {message('description')}
      </AccordionSection>
      <AccordionSection
        title="Images and product codes"
        open={codesOpen}
        onOpenChange={setCodesOpen}
      >
        <ProductImages
          upload={client.uploadImage}
          onBusyChange={setImageBusy}
          value={images}
          disabled={busy}
          onChange={(value) => {
            setImages(value);
            clearField('images');
          }}
        />
        {message('images')}
        {(
          [
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
            <Textarea
              {...invalidProps(id)}
              id={`product-${id}`}
              name={id}
              defaultValue={values.join('\n')}
            />
            {message(id)}
          </div>
        ))}
      </AccordionSection>
      <AccordionSection
        title="Category and inventory settings"
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      >
        <label htmlFor="product-category">Category</label>
        <input type="hidden" name="categoryId" value={categoryId} />
        <ProductCategory
          onBusyChange={setCategoryBusy}
          categories={categories}
          client={client}
          value={categoryId}
          onChange={setCategoryId}
          canCreate={canCreateCategory}
          disabled={busy}
        />
        {message('categoryId')}
        <label htmlFor="product-type">Product type</label>
        <Select
          {...invalidProps('type')}
          id="product-type"
          name="type"
          defaultValue={product?.type ?? 'physical'}
        >
          <option>physical</option>
          <option>service</option>
        </Select>
        {message('type')}
        <label htmlFor="product-tracking">Track inventory</label>
        <Select
          {...invalidProps('trackInventory')}
          id="product-tracking"
          name="trackInventory"
          defaultValue={product?.trackInventory === false ? 'no' : 'yes'}
        >
          <option value="yes">Yes</option>
          <option value="no">No (required for services)</option>
        </Select>
        {message('trackInventory')}
        <label htmlFor="product-state">Product status</label>
        <Select
          {...invalidProps('state')}
          id="product-state"
          name="state"
          defaultValue={product?.state ?? 'active'}
        >
          {['active', 'inactive', 'archived'].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
        {message('state')}
        <p>
          Archiving is permanent. Use the Quantity step to record opening stock or an adjustment.
        </p>
      </AccordionSection>
      <p className="text-sm text-muted-foreground">
        Save details, then continue to Price & units and Quantity. Each step confirms its own
        changes.
      </p>
      <div className="drawer-actions">
        {' '}
        <Button type="submit" disabled={busy || categoryBusy || imageBusy || !!skuError}>
          {product || !onSaved ? 'Save product' : 'Save details & continue'}
        </Button>
        <Button variant="outline" disabled={busy} onClick={cancel}>
          Cancel product edit
        </Button>
      </div>
    </form>
  );
}
