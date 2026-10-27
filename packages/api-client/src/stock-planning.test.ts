import { expect, it, vi } from 'vitest';
import {
  stockPlanningSchema,
  stockWorkspaceSchema,
  orderHoldInputSchema,
} from '@inventory/contracts';
import { createDemoSeed } from './mock/seed.js';
import { readStockPlanning } from './mock/read-stock-planning.js';
import { readInventory } from './mock/read-inventory.js';
import { createStockPlanningClient } from './stock-planning.js';
import { stockPlanningForms } from './stock-planning-forms.js';
it('validates bounded positive holds and rejects extra client authority', () => {
  const s = createDemoSeed(0, 'owner');
  const input = {
    warehouseId: s.id(3),
    variantId: s.products[0]!.id,
    unitId: s.id(4),
    quantity: '1',
    reference: 'ORDER-1',
    expiresInMinutes: 60,
    reason: 'Customer pickup',
    idempotencyKey: s.id(99),
  };
  expect(orderHoldInputSchema.safeParse(input).success).toBe(true);
  for (const patch of [
    { quantity: '0' },
    { expiresInMinutes: 1441 },
    { expiresInMinutes: 0 },
    { businessId: s.id(1) },
    { state: 'expired' },
  ])
    expect(orderHoldInputSchema.safeParse({ ...input, ...patch }).success).toBe(false);
});
it('uses actual demo contracts, scopes warehouse data and hides unauthorized management forms', () => {
  const s = createDemoSeed(0, 'owner'),
    q = new URLSearchParams({ warehouseId: s.id(3) });
  const data = stockPlanningSchema.parse(readStockPlanning(s, q, false));
  const stock = stockWorkspaceSchema.parse(readInventory(s, 'stock', q, false));
  const client = createStockPlanningClient(vi.fn(), () => s.id(98), s.business.id);
  expect(data.holds[0]).toMatchObject({ state: 'cancelled', remaining: '0' });
  expect(
    stockPlanningForms(client, data, stock, s.business, s.id(3)).map((f) => f.title),
  ).toContain('Save reorder policy');
  expect(
    stockPlanningForms(
      client,
      data,
      stock,
      { ...s.business, role: 'custom', permissions: [] },
      s.id(3),
    ),
  ).toEqual([]);
  const scoped = { ...s.business, scope: { storeId: s.id(2), warehouseId: s.id(3) } };
  expect(
    stockPlanningForms(client, data, stock, scoped, s.id(3)).map((f) => f.title),
  ).not.toContain('Save custom reason code');
  q.set('warehouseId', s.id(999));
  expect(readStockPlanning(s, q, false).holds).toEqual([]);
  expect(readStockPlanning(s, q, true).reorders).toEqual([]);
});
