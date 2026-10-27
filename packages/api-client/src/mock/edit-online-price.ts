import { hasPermission, priceInputSchema, priceSchema } from '@inventory/contracts';
import { DemoFailure } from './account.js';
import { demoCatalogChanges } from './catalog-events.js';
import type { DemoSeed } from './seed.js';
/** Immediate business-default pricing only; other scenarios require the real pricing API. */
export function editOnlineDemoPrice(seed: DemoSeed, body: unknown) {
  if (!hasPermission(seed.business, 'products.write') || seed.business.scope?.storeId)
    throw new DemoFailure(403, 'Business catalog edit permission required.');
  const input = priceInputSchema.parse(body);
  if (input.storeId || input.customerId || Date.parse(input.startsAt) > Date.now() || input.endsAt)
    throw new DemoFailure(400, 'Demo supports immediate business-default prices only.');
  const product = seed.products.find((p) => p.id === input.variantId);
  if (!product || product.state !== 'active')
    throw new DemoFailure(409, 'An active product is required.');
  const price = priceSchema.parse({ ...input, id: seed.id(9000 + seed.prices.length) });
  seed.prices.unshift(price);
  product.version++;
  demoCatalogChanges.notify(seed.business.id);
  return price;
}
