import { builtInStockReasons } from '@inventory/contracts';
import type { DemoSeed } from './seed.js';
export function readStockPlanning(
  s: DemoSeed,
  q: { get(key: string): string | null },
  empty: boolean,
) {
  const inWarehouse = q.get('warehouseId') === s.id(3),
    offset = Number(q.get('offset') ?? 0);
  return {
    reasons: builtInStockReasons.map((r) => ({ ...r, active: true, builtin: true, version: 0 })),
    offset,
    hasMore: false,
    reorders:
      !empty && inWarehouse && offset === 0
        ? [
            {
              variantId: s.products[1]!.id,
              warehouseId: s.id(3),
              locationId: s.id(20),
              sku: s.products[1]!.sku,
              locationName: 'Main warehouse',
              reorderPoint: '25',
              targetQuantity: '40',
              active: true,
              version: 1,
              available: s.balances[1]!.available,
              needsReorder: true,
            },
          ]
        : [],
    holds:
      !empty && inWarehouse && offset === 0
        ? [
            {
              id: s.id(960),
              reference: 'DEMO-ORDER-001',
              warehouseId: s.id(3),
              variantId: s.products[1]!.id,
              reservationId: s.id(961),
              quantity: '1',
              remaining: '0',
              state: 'cancelled',
              expiresAt: '2026-10-05T12:30:00.000Z',
              createdBy: s.id(900),
              createdAt: '2026-10-05T12:00:00.000Z',
            },
          ]
        : [],
  };
}
