import { ProductImages } from './ProductImages';
import { ProductCategory } from './ProductCategory';
import { RichTextEditor } from '../ui/RichTextEditor';
import { SkuStatus } from './SkuStatus';
import { FormSection } from '../ui/FormSection';
import { Text } from '../ui/Themed';
import { useState, useEffect } from 'react';
import { View } from 'react-native';
import { saveProductDetails, watchProductSku, duplicateSkuMessage } from '@inventory/api-client';
import type { ProductFieldErrors, SkuFeedback } from '@inventory/api-client';
import type { Product, Category } from '@inventory/contracts';
import type { createCatalogClient } from '@inventory/api-client';
import { Action, Choice, choices, Field, styles } from '../organization/Controls';
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
  const [imageBusy, setImageBusy] = useState(false);
  const [categoryBusy, setCategoryBusy] = useState(false);
  const [name, setName] = useState(product?.name ?? '');
  const [sku, setSku] = useState(product?.sku ?? '');
  const [errors, setErrors] = useState<ProductFieldErrors>({});
  const [feedback, setFeedback] = useState<SkuFeedback | null>(null);
  useEffect(
    () =>
      watchProductSku(client, sku, product?.id, setFeedback, {
        controller: new AbortController(),
        schedule(work) {
          const timer = setTimeout(work, 350);
          return () => clearTimeout(timer);
        },
      }),
    [client, sku, product?.id],
  );
  const skuError =
    feedback?.value === sku && feedback.state === 'duplicate' ? duplicateSkuMessage : errors.sku;
  const [description, setDescription] = useState(product?.description ?? '');
  const [images, setImages] = useState(product?.images ?? []);
  const [barcodes, setBarcodes] = useState(product?.barcodes.join('\n') ?? '');
  const [codes, setCodes] = useState(product?.alternativeCodes.join('\n') ?? '');
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? '');
  const [state, setState] = useState<string>(product?.state ?? 'active');
  const [type, setType] = useState<string>(product?.type ?? 'physical');
  const [track, setTrack] = useState(product?.trackInventory === false ? 'no' : 'yes');
  const [basicsOpen, setBasicsOpen] = useState(true);
  const [codesOpen, setCodesOpen] = useState(!!focusField);
  const [settingsOpen, setSettingsOpen] = useState(!!focusField);
  const showErrors = (next: ProductFieldErrors) => {
    setErrors(next);
    if (next.name || next.sku || next.description) setBasicsOpen(true);
    if (next.images || next.barcodes || next.alternativeCodes) setCodesOpen(true);
    if (next.categoryId || next.type || next.trackInventory || next.state) setSettingsOpen(true);
  };
  const update = (field: string, set: (value: string) => void) => (value: string) => {
    set(value);
    setErrors((previous) => {
      const next = { ...previous };
      delete next[field];
      return next;
    });
  };
  return (
    <View style={styles.group}>
      {focusField && (
        <Text accessibilityRole="alert">
          Fix field: {focusField}. Review the expanded sections below.
        </Text>
      )}
      <Text accessibilityRole="header">{product ? 'Edit product' : 'Create product'}</Text>
      <FormSection
        open={basicsOpen || !!skuError}
        onOpenChange={setBasicsOpen}
        title="Product basics"
      >
        <Field
          autoFocus={focusField === 'title'}
          error={errors.name ?? ''}
          label="Product name"
          value={name}
          onChange={update('name', setName)}
        />
        <Field
          error={skuError ?? ''}
          trailing={<SkuStatus key={sku} feedback={feedback?.value === sku ? feedback : null} />}
          errorAccessory={
            <SkuStatus key={sku} preview feedback={feedback?.value === sku ? feedback : null} />
          }
          autoFocus={focusField === 'sku'}
          label="SKU"
          value={sku}
          onChange={(value) => {
            setSku(value);
            setErrors((previous) => ({ ...previous, sku: '' }));
          }}
        />
        {!skuError &&
          feedback?.value === sku &&
          feedback.state !== 'duplicate' &&
          feedback.state !== 'available' && (
            <Text accessibilityLiveRegion="polite" tone="muted">
              {feedback.state === 'checking'
                ? 'Checking SKU…'
                : 'SKU check unavailable. It will be checked when saving.'}
            </Text>
          )}
        <RichTextEditor
          label="Description"
          value={description}
          onChange={update('description', setDescription)}
          error={errors.description ?? ''}
        />
      </FormSection>
      <FormSection open={codesOpen} onOpenChange={setCodesOpen} title="Images and product codes">
        <ProductImages
          upload={client.uploadImage}
          onBusyChange={setImageBusy}
          value={images}
          disabled={busy}
          onChange={(value) => {
            setImages(value);
            setErrors((old) => ({ ...old, images: '' }));
          }}
        />
        {!!errors.images && <Text accessibilityRole="alert">{errors.images}</Text>}
        <Field
          error={errors.barcodes ?? ''}
          label="Barcodes (one per line)"
          value={barcodes}
          onChange={update('barcodes', setBarcodes)}
          maxLength={1299}
          multiline
        />
        <Field
          error={errors.alternativeCodes ?? ''}
          label="Alternative codes (one per line)"
          value={codes}
          onChange={update('alternativeCodes', setCodes)}
          maxLength={1299}
          multiline
        />
      </FormSection>
      <FormSection
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        title="Category and inventory settings"
      >
        <ProductCategory
          onBusyChange={setCategoryBusy}
          categories={categories}
          client={client}
          value={categoryId}
          onChange={update('categoryId', setCategoryId)}
          canCreate={canCreateCategory}
          disabled={busy}
        />
        {!!errors.categoryId && (
          <Text accessibilityRole="alert" tone="error">
            {errors.categoryId}
          </Text>
        )}
        <Choice
          label="Product type"
          value={type}
          onChange={update('type', setType)}
          options={choices(['physical', 'service'])}
        />
        {!!errors.type && (
          <Text accessibilityRole="alert" tone="error">
            {errors.type}
          </Text>
        )}
        <Choice
          label="Track inventory"
          value={track}
          onChange={update('trackInventory', setTrack)}
          options={choices(['yes', 'no'])}
        />
        {!!errors.trackInventory && (
          <Text accessibilityRole="alert" tone="error">
            {errors.trackInventory}
          </Text>
        )}
        <Choice
          label="Product status"
          value={state}
          onChange={update('state', setState)}
          options={choices(['active', 'inactive', 'archived'])}
        />
        {!!errors.state && (
          <Text accessibilityRole="alert" tone="error">
            {errors.state}
          </Text>
        )}
        <Text>
          Services must not track inventory. Archiving is permanent. Use the Quantity step to record
          stock changes.
        </Text>
      </FormSection>
      <Text tone="muted">
        Save details, then continue to Price & units and Quantity. Each step confirms its own
        changes.
      </Text>
      <Action
        label={product || !onSaved ? 'Save product' : 'Save details & continue'}
        disabled={busy || categoryBusy || imageBusy || !!skuError}
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
              images,
              barcodes: split(barcodes),
              alternativeCodes: split(codes),
              categoryId: categoryId || null,
              state,
              type,
              trackInventory: track === 'yes',
            };
            const result = await saveProductDetails(client, product, input, showErrors);
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
