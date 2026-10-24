import { expect, it } from 'vitest';
import { reportQuerySchema } from './reports.js';
import { industryProfileSchema } from './industry.js';
import { safePolicy, resolveSettings } from './settings.js';
it('validates calendar dates, bounded ordered ranges, paging and supported profile fields', () => {
  const query = { section: 'sales', from: '2026-01-01', to: '2026-12-31' };
  expect(reportQuerySchema.parse(query).offset).toBe(0);
  for (const patch of [
    { to: '2027-02-01' },
    { from: '2026-12-31', to: '2026-01-01' },
    { from: '2026-02-30' },
    { offset: -1 },
    { lowOnly: 'yes' },
    { businessId: 'spoof' },
  ])
    expect(reportQuerySchema.safeParse({ ...query, ...patch }).success).toBe(false);
  expect(
    industryProfileSchema.safeParse({ schemaVersion: 1, kind: 'medical', lowStockThreshold: '0' })
      .success,
  ).toBe(false);
  expect(
    industryProfileSchema.safeParse({ schemaVersion: 1, kind: 'retail', lowStockThreshold: '-1' })
      .success,
  ).toBe(false);
});
it('retains versioned profiles without changing appearance precedence', () => {
  const profile = {
    schemaVersion: 1 as const,
    kind: 'wholesale' as const,
    lowStockThreshold: '2.5',
  };
  const policy = safePolicy({ enforced: { appearance: 'dark' }, industry: profile });
  expect(policy.industry).toEqual(profile);
  expect(resolveSettings({}, {}, policy).appearance).toBe('dark');
});
