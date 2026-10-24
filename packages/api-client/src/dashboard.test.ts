import { expect, it, vi } from 'vitest';
import { createDashboardClient, dashboardGrowth, dashboardHeights } from './dashboard.js';
import { readDashboard } from './mock/read-dashboard.js';
import { createDemoSeed } from './mock/seed.js';
it('loads a bounded validated overview for the selected currency', async () => {
  const seed = createDemoSeed(0, 'owner'),
    snapshot = readDashboard(seed, { get: (key) => (key === 'currency' ? 'PKR' : '7') }, false);
  const request = vi.fn().mockResolvedValue(snapshot);
  const client = createDashboardClient(request, seed.business.id);
  expect((await client.load({ currency: 'PKR', days: 7 })).sales?.periodMinor).toBe('0');
  expect(request).toHaveBeenCalledWith(
    expect.stringContaining('/reports/overview?currency=PKR&days=7'),
    'GET',
    undefined,
    undefined,
  );
  request.mockResolvedValue({ ...snapshot, currency: 'INVALID' });
  await expect(client.load({ currency: 'USD', days: 7 })).rejects.toThrow();
  request.mockRejectedValue(new Error('unavailable'));
  await expect(client.load({ currency: 'USD', days: 7 })).rejects.toThrow('unavailable');
});
it('keeps exact large amounts and never invents growth over a zero baseline', () => {
  expect(dashboardGrowth('150', '100')).toBe('+50.00%');
  expect(dashboardGrowth('50', '100')).toBe('−50.00%');
  expect(dashboardGrowth('1', '0')).toBeNull();
  expect(dashboardGrowth('900719925474099300', '900719925474099300')).toBe('+0.00%');
  expect(dashboardHeights(['0', '900719925474099300', '450359962737049650'])).toEqual([0, 100, 50]);
});
it('demo snapshots derive values from sales and restrict inaccessible sections', () => {
  const seed = createDemoSeed(0, 'owner');
  const result = readDashboard(seed, { get: () => null }, false);
  expect(result.sales?.periodMinor).toBe(
    seed.sales.reduce((n, r) => n + BigInt(r.sale.totalMinor), 0n).toString(),
  );
  expect(result.sales?.trend).toHaveLength(30);
  expect(
    readDashboard(
      {
        ...seed,
        business: { ...seed.business, role: 'custom', permissions: ['reports.read', 'stock.read'] },
      },
      { get: () => null },
      false,
    ).sales,
  ).toBeNull();
});
