import type { DemoSeed } from './seed.js';
import type { DemoQuery } from './read-inventory.js';
import { demoDate } from './identity.js';
export function readReport(s: DemoSeed, q: DemoQuery, empty: boolean) {
  const section = q.get('section') ?? 'sales',
    from = q.get('from') ?? demoDate(30).slice(0, 10),
    to = q.get('to') ?? demoDate().slice(0, 10);
  const within = (date: string) => date.slice(0, 10) >= from && date.slice(0, 10) <= to;
  const money = (minor: bigint) => `${minor / 100n}.${String(minor % 100n).padStart(2, '0')}`;
  const sum = (values: string[]) => values.reduce((a, b) => a + BigInt(b), 0n);
  const sales = s.sales.filter((r) => within(r.sale.createdAt));
  let rows: { key: string; label: string; value: string; unit: string }[] = [];
  if (!empty) {
    if (section === 'sales')
      rows = [
        {
          key: 'sales',
          label: 'Sales total',
          value: money(sum(sales.map((r) => r.sale.totalMinor))),
          unit: s.currency,
        },
        { key: 'orders', label: 'Completed sales', value: String(sales.length), unit: 'sales' },
      ];
    if (section === 'payments')
      rows = [
        {
          key: 'cash',
          label: 'Cash received',
          value: money(sum(sales.flatMap((r) => r.payments.map((p) => p.amountMinor)))),
          unit: s.currency,
        },
      ];
    if (section === 'receivables')
      rows = [
        {
          key: 'receivables',
          label: 'Outstanding customer balances',
          value: money(sum(s.sales.map((r) => r.finance.outstandingMinor))),
          unit: s.currency,
        },
      ];
    if (section === 'payables')
      rows = [
        {
          key: 'payables',
          label: 'Outstanding supplier balances',
          value: money(sum(s.payables.map((p) => p.invoice.outstandingMinor))),
          unit: s.currency,
        },
      ];
    if (section === 'purchases')
      rows = [
        {
          key: 'received',
          label: 'Received supplier invoices',
          value: money(sum(s.payables.map((p) => p.invoice.amountMinor))),
          unit: s.currency,
        },
      ];
    if (section === 'inventory')
      rows = s.balances
        .filter((b) => q.get('lowOnly') !== 'true' || Number(b.available) < 5)
        .map((b) => ({ key: b.variantId, label: b.sku, value: b.available, unit: 'EA' }));
    if (section === 'movements')
      rows = s.movements
        .filter((m) => within(m.createdAt))
        .map((m) => ({ key: m.id, label: m.reason, value: m.quantityDelta, unit: 'EA' }));
  }
  const offset = Number(q.get('offset') ?? 0);
  return {
    section,
    from,
    to,
    asOf: demoDate(),
    rows: rows.slice(offset, offset + 50),
    offset,
    hasMore: offset + 50 < rows.length,
    notes: ['Local demonstration data. Reports are not production financial statements.'],
  };
}
