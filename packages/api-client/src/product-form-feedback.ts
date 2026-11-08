import {
  apiErrorSchema,
  createProductSchema,
  editProductSchema,
  skuAvailabilityQuerySchema,
} from '@inventory/contracts';
import type { Product, SkuProductPreview } from '@inventory/contracts';
import type { CancellationSignal } from './cancellation.js';
import type { createCatalogClient } from './catalog.js';
export type ProductFieldErrors = Record<string, string>;
const fieldHints: ProductFieldErrors = {
  name: 'Enter a product name (up to 120 characters).',
  sku: 'Use 1–64 letters or numbers, with dots, underscores, colons, slashes or hyphens; start with a letter or number.',
  description: 'Keep the description within 2,000 characters.',
  images: 'Enter up to five HTTPS image URLs without login credentials (500 characters each).',
  barcodes:
    'Enter up to 20 unique codes, using letters, numbers or . _ : / - (64 characters each).',
  alternativeCodes:
    'Enter up to 20 unique codes, using letters, numbers or . _ : / - (64 characters each).',
  categoryId: 'Choose a valid category or Uncategorized.',
  type: 'Choose a valid product type.',
  trackInventory: 'Check the inventory tracking setting.',
  state: 'Choose a valid product status.',
};
export const duplicateSkuMessage = 'SKU ID already exists.';
export type SkuFeedback = {
  value: string;
  product?: SkuProductPreview;
  state: 'checking' | 'available' | 'duplicate' | 'unknown';
};
type Client = ReturnType<typeof createCatalogClient>;
/** Advisory only: cancellation and a generation guard prevent stale replies replacing newer input. */
export function watchProductSku(
  client: Client,
  sku: string,
  productId: string | undefined,
  notify: (feedback: SkuFeedback) => void,
  runtime: {
    controller: { signal: CancellationSignal; abort(): void };
    schedule(work: () => void): () => void;
  },
) {
  const parsed = skuAvailabilityQuerySchema.safeParse({ sku, excludeProductId: productId });
  if (!parsed.success) return () => {};
  let active = true;
  const { controller } = runtime;
  notify({ value: sku, state: 'checking' });
  const cancelTimer = runtime.schedule(() => {
    void client.skuAvailability(parsed.data, controller.signal).then(
      (result) => {
        if (active)
          notify({
            value: sku,
            state: result.available ? 'available' : 'duplicate',
            ...(result.product ? { product: result.product } : {}),
          });
      },
      () => {
        if (active) notify({ value: sku, state: 'unknown' });
      },
    );
  });
  return () => {
    active = false;
    cancelTimer();
    controller.abort();
  };
}
/** Validation stays in contracts; uniqueness on save stays authoritative in PostgreSQL. */
export async function saveProductDetails(
  client: Client,
  product: Product | null,
  input: unknown,
  fields: (errors: ProductFieldErrors) => void,
) {
  const parsed = product
    ? editProductSchema.safeParse({ ...(input as object), version: product.version })
    : createProductSchema.safeParse(input);
  fields({});
  if (!parsed.success) {
    const errors: ProductFieldErrors = {};
    for (const issue of parsed.error.issues)
      errors[String(issue.path[0] ?? 'form')] ??=
        issue.code === 'custom'
          ? issue.message
          : (fieldHints[String(issue.path[0])] ?? issue.message);
    fields(errors);
    throw parsed.error;
  }
  try {
    return product
      ? await client.edit(product.id, editProductSchema.parse(parsed.data))
      : await client.create(parsed.data);
  } catch (error) {
    if (error && typeof error === 'object' && 'details' in error) {
      const detail = apiErrorSchema.safeParse(error.details);
      if (detail.success && detail.data.fields) {
        const errors: ProductFieldErrors = {};
        for (const field of detail.data.fields) {
          const name = field.path.split('.')[0]!;
          if (fieldHints[name]) errors[name] = fieldHints[name];
        }
        fields(errors);
      }
    }
    if (error && typeof error === 'object' && 'status' in error && error.status === 409) {
      // A conflict can also be a version/category problem. Only attribute it to SKU if confirmed.
      const availability = await client
        .skuAvailability({ sku: parsed.data.sku, excludeProductId: product?.id })
        .catch(() => null);
      if (availability?.available === false) {
        fields({ sku: duplicateSkuMessage });
        throw Object.assign(new Error(duplicateSkuMessage), { status: 409 });
      }
    }
    throw error;
  }
}
