import { expect, it } from 'vitest';
import { stockQuerySchema, stockWorkspaceSchema } from '@inventory/contracts';
import { productDetailId, productDetailTabs } from './product-detail.js';
import { createDemoSeed } from './mock/seed.js';
import { readInventory } from './mock/read-inventory.js';
it('recognizes only exact product routes and preserves the five sections', () => {
  const id = createDemoSeed(0, 'owner').products[0]!.id;
  expect(productDetailId(`/catalog/${id}`)).toBe(id);
  for (const path of ['/catalog', '/catalog/not-an-id', `/catalog/${id}/edit`, '/pos'])
    expect(productDetailId(path)).toBeNull();
  expect(productDetailTabs).toEqual(['Overview', 'Stock', 'Pricing', 'History', 'Channels']);
  expect(stockQuerySchema.safeParse({ warehouseId: id, productId: 'invalid' }).success).toBe(false);
});
it('demo detail stock excludes other products and warehouses and handles empty data', () => {
  const seed = createDemoSeed(0, 'owner'),
    id = seed.products[0]!.id;
  const query = new URLSearchParams({ warehouseId: seed.id(3), productId: id });
  const stock = stockWorkspaceSchema.parse(readInventory(seed, 'stock', query, false));
  expect(stock.items.map((p) => p.id)).toEqual([id]);
  expect(stock.totals.balances).toBe(1);
  expect(stock.balances.every((b) => b.variantId === id)).toBe(true);
  expect(stock.movements.every((b) => b.variantId === id)).toBe(true);
  query.set('warehouseId', seed.id(999));
  expect(stockWorkspaceSchema.parse(readInventory(seed, 'stock', query, false)).balances).toEqual(
    [],
  );
  expect(stockWorkspaceSchema.parse(readInventory(seed, 'stock', query, true)).movements).toEqual(
    [],
  );
});
