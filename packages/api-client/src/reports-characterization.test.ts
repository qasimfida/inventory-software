import { afterEach, expect, it, vi } from 'vitest';
import type { Business, Report } from '@inventory/contracts';
import { availableReports, createReportsClient, defaultReportDates } from './reports.js';
const business: Business = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Test',
  role: 'custom',
  state: 'active',
  version: 1,
  permissions: [],
};
afterEach(() => vi.useRealTimers());
it('requires reports permission and every domain permission for each category', () => {
  expect(availableReports({ ...business, permissions: ['stock.read'] })).toEqual([]);
  expect(
    availableReports({ ...business, permissions: ['reports.read', 'stock.read'] }).map(
      (s) => s.value,
    ),
  ).toEqual(['inventory', 'movements']);
  expect(
    availableReports({
      ...business,
      permissions: ['reports.read', 'payments.read', 'purchases.read'],
    }).map((s) => s.value),
  ).toEqual(['purchases', 'payments', 'payables']);
  expect(
    availableReports({ ...business, permissions: ['reports.read', 'customers.read'] }),
  ).toEqual([]);
});
it('uses UTC month boundaries even when local calendar date differs', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-01T00:30:00+05:00'));
  expect(defaultReportDates()).toEqual({ from: '2026-10-01', to: '2026-10-31' });
});
it('sends exact bounded filters and retains exact amounts, units and partial metadata', async () => {
  const data: Report = {
    section: 'inventory',
    from: '2026-10-01',
    to: '2026-10-31',
    offset: 50,
    asOf: '2026-11-01T00:00:00.000Z',
    hasMore: true,
    notes: ['Current stock'],
    rows: [{ key: 'a', label: 'Stock', value: '9007199254740993.000001', unit: 'EA' }],
  };
  const request = vi.fn().mockResolvedValue(data);
  const client = createReportsClient(request, business.id);
  expect(
    await client.load({
      section: 'inventory',
      from: data.from,
      to: data.to,
      offset: 50,
      lowOnly: 'true',
      warehouseId: business.id,
    }),
  ).toEqual(data);
  const url = new URL(request.mock.calls[0]![0], 'https://example.test');
  expect(url.pathname).toBe(`/${business.id}/reports`);
  expect(Object.fromEntries(url.searchParams)).toEqual({
    section: 'inventory',
    from: data.from,
    to: data.to,
    offset: '50',
    lowOnly: 'true',
    warehouseId: business.id,
  });
  expect(request).toHaveBeenCalledTimes(1);
});
it('rejects invalid ranges before transport and rejects malformed server data without retry', async () => {
  const request = vi.fn().mockResolvedValue({ rows: [] });
  const client = createReportsClient(request, business.id);
  const query = {
    section: 'sales' as const,
    from: '2026-10-31',
    to: '2026-10-01',
    offset: 0,
    lowOnly: 'false' as const,
  };
  await expect(client.load(query)).rejects.toThrow();
  expect(request).not.toHaveBeenCalled();
  await expect(client.load({ ...query, from: '2026-10-01' })).rejects.toThrow();
  expect(request).toHaveBeenCalledTimes(1);
});
