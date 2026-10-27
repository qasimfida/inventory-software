import { builtInStockReasons } from '@inventory/contracts';
import type { DemoSeed } from './seed.js';
import { demoPage } from './seed.js';
export function readProductStock(s: DemoSeed, q: Parameters<typeof demoPage>[1], empty: boolean) {
  const candidates = (empty ? [] : s.products).filter(
    (p) => !q.get('productId') || p.id === q.get('productId'),
  );
  const variants = s.variants.filter((v) => candidates.some((p) => p.id === v.productId));
  const locations = s.storage.filter(
    (l) => !q.get('warehouseId') || l.warehouseId === q.get('warehouseId'),
  );
  const balances = s.balances.filter(
    (b) =>
      variants.some((v) => v.id === b.variantId) && locations.some((l) => l.id === b.locationId),
  );
  const result = demoPage(balances, q, (b) => b.sku);
  const history = empty
    ? []
    : s.movements
        .map((m, index) => ({ ...m, sequence: String(index + 1) }))
        .filter(
          (m) =>
            variants.some((v) => v.id === m.variantId) &&
            locations.some((l) => l.id === m.locationId) &&
            (!q.get('cursor') || BigInt(m.sequence) < BigInt(q.get('cursor')!)),
        )
        .sort((a, b) => Number(BigInt(b.sequence) - BigInt(a.sequence)));
  return {
    reasons: builtInStockReasons.map((r) => ({ ...r, builtin: true, active: true, version: 0 })),
    totals: { items: variants.length, balances: result.total, reservations: 0 },
    limit: result.limit,
    offset: result.offset,
    hasMore: result.hasMore,
    items: variants.map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      baseUnitId: v.baseUnitId,
    })),
    units: s.units,
    locations,
    balances: result.items,
    movements: history.slice(0, 50),
    nextCursor: history.length > 50 ? history[49]!.sequence : null,
    reservations: [],
    policy: { allowNegative: false, version: 1 },
  };
}
