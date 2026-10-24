import type { DemoSeed } from './seed.js';
import { demoPage } from './seed.js';
import type { DemoQuery } from './read-inventory.js';
export function readCommerce(s: DemoSeed, path: string, q: DemoQuery, empty: boolean): unknown {
  const purchases = demoPage(empty ? [] : s.purchases, q, (p) => p.order.reference);
  if (path === 'purchasing')
    return {
      suppliers: empty ? [] : s.suppliers,
      orders: purchases.items.map((p) => p.order),
      offset: purchases.offset,
      hasMore: purchases.hasMore,
    };
  if (path.startsWith('purchases/'))
    return s.purchases.find((p) => p.order.id === path.split('/')[1]);
  const transfers = demoPage(empty ? [] : s.transfers, q, (t) => t.transfer.reference);
  if (path === 'transfers')
    return {
      transfers: transfers.items.map((t) => t.transfer),
      offset: transfers.offset,
      hasMore: transfers.hasMore,
    };
  if (path.startsWith('transfers/'))
    return s.transfers.find((t) => t.transfer.id === path.split('/')[1]);
  const customers = demoPage(
    empty
      ? []
      : s.customers.filter(
          (c) =>
            (!q.get('state') || c.state === q.get('state')) &&
            (!q.get('currency') || c.currency === q.get('currency')) &&
            (!q.get('storeId') || c.storeId === q.get('storeId')),
        ),
    q,
    (c) => `${c.name} ${c.code}`,
  );
  if (path === 'customers')
    return { customers: customers.items, offset: customers.offset, hasMore: customers.hasMore };
  if (path === 'customers/retention/policy') return { inactiveDays: 365, version: 1 };
  if (/^customers\/[^/]+\/prices$/.test(path)) return { prices: [] };
  if (/^customers\/[^/]+\/statement$/.test(path)) {
    const customerId = path.split('/')[1];
    const receipts = empty
      ? []
      : s.sales.filter((r) => r.sale.customerId === customerId && r.receivableId);
    return {
      customerId,
      currency: s.currency,
      outstandingMinor: receipts
        .reduce((sum, r) => sum + BigInt(r.finance.outstandingMinor), 0n)
        .toString(),
      hasMore: false,
      receivables: receipts.map((r) => ({
        id: r.receivableId,
        saleId: r.sale.id,
        warehouseId: r.sale.warehouseId,
        amountMinor: r.sale.totalMinor,
        outstandingMinor: r.finance.outstandingMinor,
        dueDate: r.finance.dueDate,
        createdAt: r.sale.createdAt,
      })),
      payments: [],
      credits: [],
      refunds: [],
    };
  }
  const sales = demoPage(empty ? [] : s.sales, q, (r) => r.sale.id);
  if (path === 'sales')
    return { sales: sales.items.map((r) => r.sale), hasMore: sales.hasMore, offset: sales.offset };
  if (/^sales\/[^/]+\/receipt$/.test(path))
    return s.sales.find((r) => r.sale.id === path.split('/')[1]);
  if (path === 'cash-shifts') return { shifts: empty ? [] : s.shifts, hasMore: false, offset: 0 };
  if (path === 'payables')
    return {
      invoices: empty ? [] : s.payables.map((p) => p.invoice),
      totals: empty ? [] : [{ currency: s.currency, payableMinor: '7600', supplierOwesMinor: '0' }],
      offset: 0,
      hasMore: false,
    };
  if (path.startsWith('payables/'))
    return s.payables.find((p) => p.invoice.id === path.split('/')[1]);
  return undefined;
}
