import {
  createProductSchema,
  productSchema,
  variantSchema,
  movementInputSchema,
  movementSchema,
  hasPermission,
} from '@inventory/contracts';
import { decimal, decimalString, canonicalJson } from '@inventory/domain';
import { DemoFailure, demoSession } from './account.js';
import { demoCatalogChanges } from './catalog-events.js';
import type { DemoSeed } from './seed.js';
const receipts = new WeakMap<
  DemoSeed,
  Map<string, { payload: string; result: ReturnType<typeof movementSchema.parse> }>
>();
/** Explicit in-memory demo commands, never used by the production transport. */
export function createDemoProduct(seed: DemoSeed, body: unknown) {
  if (!hasPermission(seed.business, 'products.write') || seed.business.scope?.storeId)
    throw new DemoFailure(403, 'Product management permission required.');
  const input = createProductSchema.parse(body);
  const codes = [input.sku, ...input.barcodes, ...input.alternativeCodes];
  if (
    seed.products.some((p) =>
      [p.sku, ...p.barcodes, ...p.alternativeCodes].some((c) => codes.includes(c)),
    )
  )
    throw new DemoFailure(409, 'A product already uses this code.');
  const product = productSchema.parse({
    ...input,
    id: seed.id(20000 + seed.products.length),
    version: 1,
    createdAt: new Date().toISOString(),
  });
  const variant = variantSchema.parse({
    id: product.id,
    productId: product.id,
    name: product.name,
    sku: product.sku,
    baseUnitId: seed.units[0]!.id,
    isDefault: true,
    version: 1,
  });
  seed.products.unshift(product);
  seed.variants.unshift(variant);
  demoCatalogChanges.notify(seed.business.id);
  return product;
}
export function changeDemoProductQuantity(seed: DemoSeed, body: unknown) {
  if (!hasPermission(seed.business, 'stock.write'))
    throw new DemoFailure(403, 'Stock adjustment permission required.');
  const input = movementInputSchema.parse(body);
  if (!['opening', 'adjustment_in', 'adjustment_out'].includes(input.type) || input.locationId)
    throw new DemoFailure(400, 'Demo supports base-unit warehouse-root adjustments only.');
  const variant = seed.variants.find((v) => v.id === input.variantId && v.state === 'active');
  const product = seed.products.find(
    (p) => p.id === variant?.productId && p.state === 'active' && p.trackInventory,
  );
  const warehouse = seed.locations.find(
    (l) => l.id === input.warehouseId && l.kind === 'warehouses' && l.state === 'active',
  );
  const root = seed.storage.find(
    (l) => l.warehouseId === input.warehouseId && l.type === 'warehouse',
  );
  if (!variant || !product || !warehouse || !root || variant.baseUnitId !== input.unitId)
    throw new DemoFailure(400, 'Select an active product, base unit and warehouse.');
  const cache = receipts.get(seed) ?? new Map();
  receipts.set(seed, cache);
  const previous = cache.get(input.idempotencyKey),
    payload = canonicalJson(input);
  if (previous) {
    if (previous.payload !== payload)
      throw new DemoFailure(409, 'This reference was already used.');
    return previous.result;
  }
  const balance = seed.balances.find((b) => b.variantId === variant.id && b.locationId === root.id);
  const delta = decimal(input.quantity) * (input.type === 'adjustment_out' ? -1n : 1n);
  const onHand = decimal(balance?.onHand ?? '0') + delta;
  const available = onHand - decimal(balance?.reserved ?? '0') - decimal(balance?.damaged ?? '0');
  if (available < 0n)
    throw new DemoFailure(409, 'Not enough available stock to remove this quantity.');
  const result = movementSchema.parse({
    id: seed.id(30000 + seed.movements.length),
    variantId: variant.id,
    warehouseId: warehouse.id,
    locationId: root.id,
    quantityDelta: decimalString(delta),
    reservedDelta: '0',
    damagedDelta: '0',
    transitDelta: '0',
    type: input.type,
    sourceKind: 'manual',
    sourceId: input.idempotencyKey,
    actorId: demoSession().user.id,
    reason: input.reason,
    reasonCode: input.reasonCode ?? null,
    createdAt: new Date().toISOString(),
    reversalOf: null,
  });
  if (balance)
    Object.assign(balance, {
      onHand: decimalString(onHand),
      available: decimalString(available),
      version: balance.version + 1,
    });
  else
    seed.balances.push({
      variantId: variant.id,
      sku: variant.sku,
      locationId: root.id,
      locationName: root.name,
      onHand: decimalString(onHand),
      reserved: '0',
      damaged: '0',
      inTransit: '0',
      available: decimalString(available),
      version: 1,
    });
  seed.movements.push(result);
  cache.set(input.idempotencyKey, { payload, result });
  demoCatalogChanges.notify(seed.business.id);
  return result;
}
