import { dashboardQuerySchema, dashboardSchema, hasPermission } from '@inventory/contracts';
import type { DashboardSnapshot } from '@inventory/contracts';
import type { DemoSeed } from './seed.js';
import type { DemoQuery } from './read-inventory.js';
export function readDashboard(seed: DemoSeed, q: DemoQuery, empty: boolean) {
  const { currency, days } = dashboardQuerySchema.parse({
    currency: q.get('currency') ?? 'USD',
    days: q.get('days') ?? 30,
  });
  const now = new Date(),
    to = now.toISOString().slice(0, 10),
    day = (n: number) => new Date(Date.parse(to) + n * 86400000).toISOString().slice(0, 10),
    from = day(1 - days);
  const records = empty ? [] : seed.sales.filter((r) => r.sale.currency === currency);
  const sum = (rows: typeof records) =>
    rows.reduce((n, r) => n + BigInt(r.sale.totalMinor), 0n).toString();
  const today = records.filter((r) => r.sale.createdAt.slice(0, 10) === to);
  const period = records.filter(
    (r) => r.sale.createdAt.slice(0, 10) >= from && r.sale.createdAt.slice(0, 10) <= to,
  );
  const top = new Map<string, NonNullable<DashboardSnapshot['sales']>['topProducts'][number]>();
  for (const r of period)
    for (const l of r.lines) {
      const previous = top.get(l.variantId);
      top.set(l.variantId, {
        id: l.variantId,
        name: l.name,
        sku: l.sku,
        totalMinor: (BigInt(previous?.totalMinor ?? '0') + BigInt(l.totalMinor)).toString(),
      });
    }
  const items = (empty ? [] : seed.products)
    .map((p) => {
      const available = seed.balances.find((b) => b.variantId === p.id)?.available ?? '0';
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        unit: 'EA',
        available,
        status: Number(available) <= 0 ? 'out-of-stock' : 'in-stock',
      };
    })
    .sort((a, b) => Number(a.available) - Number(b.available));
  return dashboardSchema.parse({
    currency,
    from,
    to,
    asOf: now.toISOString(),
    sales: hasPermission(seed.business, 'sales.read')
      ? {
          todayMinor: sum(today),
          yesterdayMinor: sum(records.filter((r) => r.sale.createdAt.slice(0, 10) === day(-1))),
          todayOrders: String(today.length),
          averageBasketMinor: today.length
            ? ((BigInt(sum(today)) + BigInt(today.length) / 2n) / BigInt(today.length)).toString()
            : '0',
          periodMinor: sum(period),
          periodOrders: String(period.length),
          previousMinor: sum(
            records.filter(
              (r) =>
                r.sale.createdAt.slice(0, 10) >= day(1 - days * 2) &&
                r.sale.createdAt.slice(0, 10) < from,
            ),
          ),
          trend: [...Array.from({ length: days }).keys()].map((i) => ({
            date: day(i + 1 - days),
            totalMinor: sum(
              period.filter((r) => r.sale.createdAt.slice(0, 10) === day(i + 1 - days)),
            ),
          })),
          recent: [...period]
            .sort(
              (a, b) =>
                b.sale.createdAt.localeCompare(a.sale.createdAt) ||
                b.sale.id.localeCompare(a.sale.id),
            )
            .slice(0, 6)
            .map((r) => ({
              id: r.sale.id,
              createdAt: r.sale.createdAt,
              state: r.sale.state,
              totalMinor: r.sale.totalMinor,
              name: r.lines[0]?.name ?? 'Sale',
              sku: r.lines[0]?.sku ?? '',
              lines: String(r.lines.length),
            })),
          topProducts: [...top.values()]
            .sort((a, b) => (BigInt(a.totalMinor) > BigInt(b.totalMinor) ? -1 : 1))
            .slice(0, 5),
        }
      : null,
    inventory: hasPermission(seed.business, 'stock.read')
      ? {
          lowStock: 0,
          outOfStock: items.filter((p) => p.status === 'out-of-stock').length,
          threshold: '0',
          items: items.slice(0, 6),
        }
      : null,
  });
}
