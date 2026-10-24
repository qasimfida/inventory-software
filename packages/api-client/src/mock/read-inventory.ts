import type { DemoSeed } from './seed.js';
import { demoPage } from './seed.js';
export interface DemoQuery {
  get(key: string): string | null;
}
export function readInventory(s: DemoSeed, path: string, q: DemoQuery, empty: boolean): unknown {
  const products = empty ? [] : s.products;
  const page = demoPage(products, q, (p) => `${p.name} ${p.sku} ${p.barcodes.join(' ')}`);
  if (path === 'products')
    return {
      items: page.items,
      total: page.total,
      hasMore: page.hasMore,
      offset: page.offset,
      limit: page.limit,
    };
  if (path === 'categories') return { items: empty ? [] : s.categories };
  if (/^products\/[^/]+\/pricing$/.test(path)) {
    const productId = path.split('/')[1];
    return {
      units: s.units,
      variants: s.variants.filter((v) => v.productId === productId),
      prices: s.prices.filter((p) => p.variantId === productId),
      promotions: [],
      conversions: [],
    };
  }
  if (path === 'stock/overview') {
    const threshold = s.industry.lowStockThreshold;
    const items = products.map((p) => {
      const ids = q.get('warehouseIds')?.split(',') ?? [q.get('warehouseId')];
      const available = String(
        s.balances
          .filter(
            (b) =>
              b.variantId === p.id &&
              ids.includes(s.storage.find((l) => l.id === b.locationId)?.warehouseId ?? null),
          )
          .reduce((sum, b) => sum + Number(b.available), 0),
      );
      const status =
        Number(available) <= 0
          ? 'out-of-stock'
          : Number(available) <= Number(threshold)
            ? 'low-stock'
            : 'in-stock';
      const price = s.prices.find((value) => value.variantId === p.id);
      return {
        id: p.id,
        productId: p.id,
        name: p.name,
        sku: p.sku,
        unit: 'EA',
        available,
        status,
        price: price ? { unitPrice: price.unitPrice, currency: price.currency, unit: 'EA' } : null,
      };
    });
    const counts = {
      all: items.length,
      'in-stock': items.filter((p) => p.status === 'in-stock').length,
      'low-stock': items.filter((p) => p.status === 'low-stock').length,
      'out-of-stock': items.filter((p) => p.status === 'out-of-stock').length,
    };
    const result = demoPage(
      items.filter(
        (p) => !q.get('status') || q.get('status') === 'all' || p.status === q.get('status'),
      ),
      q,
      (p) => `${p.name} ${p.sku}`,
    );
    return { ...result, counts, threshold };
  }
  if (path === 'stock')
    return {
      totals: { items: products.length, balances: empty ? 0 : s.balances.length, reservations: 0 },
      limit: page.limit,
      offset: page.offset,
      hasMore: page.hasMore,
      items: page.items.map((p) => ({ id: p.id, name: p.name, sku: p.sku, baseUnitId: s.id(10) })),
      units: s.units,
      locations: s.storage,
      balances: empty ? [] : s.balances.filter((b) => page.items.some((p) => p.id === b.variantId)),
      movements: empty ? [] : s.movements.slice(page.offset, page.offset + page.limit),
      nextCursor: null,
      reservations: [],
      policy: { allowNegative: false, version: 1 },
    };
  if (path === 'storage')
    return {
      locations: empty ? [] : s.storage,
      totals: empty ? [] : s.balances,
      offset: 0,
      hasMore: false,
    };
  if (path === 'pos/items') {
    const candidates = products.filter((p) => {
      const price = s.prices.find((e) => e.variantId === p.id);
      const available = s.balances
        .filter((b) => b.variantId === p.id)
        .reduce((n, b) => n + Number(b.available), 0);
      return (
        (!q.get('currency') || price?.currency === q.get('currency')) &&
        (!q.get('categoryId') || p.categoryId === q.get('categoryId')) &&
        (q.get('availability') !== 'in-stock' || available > 0) &&
        (q.get('availability') !== 'out-of-stock' || available <= 0)
      );
    });
    const page = demoPage(candidates, q, (p) => `${p.name} ${p.sku} ${p.barcodes.join(' ')}`);
    return {
      categories: s.categories
        .filter((c) => c.state === 'active')
        .map((c) => ({ id: c.id, name: c.name })),
      items: page.items.map((p) => {
        const price = s.prices.find((e) => e.variantId === p.id);
        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          unitId: s.id(10),
          units: s.units,
          price: price
            ? { unitPrice: price.unitPrice, currency: price.currency, unit: s.units[0]!.code }
            : null,
        };
      }),
      offset: page.offset,
      hasMore: page.hasMore,
    };
  }
  if (path === 'counts') return { counts: empty ? [] : s.counts.map((c) => c.count) };
  if (path.startsWith('counts/')) return s.counts.find((c) => c.count.id === path.split('/')[1]);
  if (path.endsWith('/reconciliation')) return { consistent: true, mismatches: [] };
  if (path === 'warehouse-view') {
    const node = s.storage.find((l) => l.id === q.get('locationId')) ?? s.storage[0]!;
    const view = ({ id, parentId, name, code, type, state }: typeof node) => ({
      id,
      parentId,
      name,
      code,
      type,
      state,
    });
    return {
      node: view(node),
      children: empty ? [] : s.storage.filter((l) => l.parentId === node.id).map(view),
      hasMore: false,
      stockHasMore: page.hasMore,
      stock: empty
        ? []
        : s.balances
            .filter((b) => b.locationId === node.id)
            .slice(page.offset, page.offset + page.limit)
            .map((b) => ({
              variantId: b.variantId,
              sku: b.sku,
              unit: 'EA',
              onHand: b.onHand,
              available: b.available,
              damaged: b.damaged,
              low: Number(b.available) < 5,
            })),
    };
  }
  return undefined;
}
