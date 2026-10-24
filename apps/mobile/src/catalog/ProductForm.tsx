import { FormSection } from '../ui/FormSection';
import { Text } from '../ui/Themed';
import { useState } from 'react';
import { View } from 'react-native';
import { createProductSchema, editProductSchema } from '@inventory/contracts';
import type { Product, Category } from '@inventory/contracts';
import type { createCatalogClient } from '@inventory/api-client';
import { Action, Choice, choices, Field, styles } from '../organization/Controls';
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
  const [name, setName] = useState(product?.name ?? '');
  const [sku, setSku] = useState(product?.sku ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [images, setImages] = useState(product?.images.join('\n') ?? '');
  const [barcodes, setBarcodes] = useState(product?.barcodes.join('\n') ?? '');
  const [codes, setCodes] = useState(product?.alternativeCodes.join('\n') ?? '');
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? '');
  const [state, setState] = useState<string>(product?.state ?? 'active');
  const [type, setType] = useState<string>(product?.type ?? 'physical');
  const [track, setTrack] = useState(product?.trackInventory === false ? 'no' : 'yes');
  return (
    <View style={styles.group}>
      <Text accessibilityRole="header">{product ? 'Edit product' : 'Create product'}</Text>
      <FormSection title="Product basics" defaultOpen>
        <Field label="Product name" value={name} onChange={setName} />
        <Field label="SKU" value={sku} onChange={setSku} />
        <Field
          label="Description"
          value={description}
          onChange={setDescription}
          maxLength={2000}
          multiline
        />
      </FormSection>
      <FormSection title="Images and product codes">
        <Field
          label="Image HTTPS URLs (one per line)"
          value={images}
          onChange={setImages}
          maxLength={2504}
          multiline
        />
        <Field
          label="Barcodes (one per line)"
          value={barcodes}
          onChange={setBarcodes}
          maxLength={1299}
          multiline
        />
        <Field
          label="Alternative codes (one per line)"
          value={codes}
          onChange={setCodes}
          maxLength={1299}
          multiline
        />
      </FormSection>
      <FormSection title="Category and inventory settings">
        <Choice
          label="Category"
          value={categoryId}
          onChange={setCategoryId}
          options={[
            { value: '', label: 'Uncategorized' },
            ...categories
              .filter((c) => c.state === 'active' || c.id === categoryId)
              .map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
        <Choice
          label="Product type"
          value={type}
          onChange={setType}
          options={choices(['physical', 'service'])}
        />
        <Choice
          label="Track inventory"
          value={track}
          onChange={setTrack}
          options={choices(['yes', 'no'])}
        />
        <Choice
          label="Product status"
          value={state}
          onChange={setState}
          options={choices(['active', 'inactive', 'archived'])}
        />
        <Text>
          Services must not track inventory. Archiving is permanent. Stock quantities use inventory
          movements.
        </Text>
      </FormSection>
      <Text tone="muted">
        Save details first, then set the selling price. Existing receipts keep their original
        prices.
      </Text>
      <Action
        label={product || !onSaved ? 'Save product' : 'Save and set price'}
        disabled={busy}
        onPress={() =>
          run(async () => {
            const split = (v: string) =>
              v
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean);
            const input = {
              name,
              sku,
              description,
              images: split(images),
              barcodes: split(barcodes),
              alternativeCodes: split(codes),
              categoryId: categoryId || null,
              state,
              type,
              trackInventory: track === 'yes',
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
          })
        }
      />
      <Action label="Cancel product edit" disabled={busy} onPress={cancel} />
    </View>
  );
}
