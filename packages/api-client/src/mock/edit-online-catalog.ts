import { demoCatalogChanges } from './catalog-events.js';
import { editProductSchema, hasPermission } from '@inventory/contracts';
import { DemoFailure } from './account.js';
import type { DemoSeed } from './seed.js';
/** Session-only catalog edits used by the online publication fix scenario. */
export function editOnlineDemoProduct(seed: DemoSeed, id: string, body: unknown) {
  if (!hasPermission(seed.business, 'products.write'))
    throw new DemoFailure(403, 'Catalog edit permission required.');
  const input = editProductSchema.parse(body),
    product = seed.products.find((p) => p.id === id);
  if (!product) throw new DemoFailure(404, 'Product not found.');
  if (input.version !== product.version || product.state === 'archived')
    throw new DemoFailure(409, 'Reload the product before editing.');
  const codes = [input.sku, ...input.barcodes, ...input.alternativeCodes];
  if (
    seed.products.some(
      (p) =>
        p.id !== id &&
        [p.sku, ...p.barcodes, ...p.alternativeCodes].some((code) => codes.includes(code)),
    )
  )
    throw new DemoFailure(409, 'A product already uses this code.');
  Object.assign(product, input, { version: product.version + 1 });
  demoCatalogChanges.notify(seed.business.id);
  return product;
}
