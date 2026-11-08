import { expect, it, vi } from 'vitest';
import { shiftQuerySchema } from '@inventory/contracts';
import { createCashClient } from './cash.js';
import { cashForms } from './cash-forms.js';
import { createDemoSeed } from './mock/seed.js';
it('keeps server filters with page offsets and validates date ranges', async () => {
  const request = vi.fn().mockResolvedValue({ shifts: [], hasMore: false, offset: 25 });
  const id = '00000000-0000-4000-8000-000000000001';
  await createCashClient(request, () => id, id).list(id, 25, {
    search: 'staff',
    state: 'closed',
    from: '2026-01-01',
    to: '2026-02-01',
  });
  const url = String(request.mock.calls[0]?.[0]);
  expect(url).toContain('offset=25');
  expect(url).toContain('search=staff');
  expect(url).toContain('state=closed');
  expect(
    shiftQuerySchema.safeParse({ warehouseId: id, from: '2026-02-01', to: '2026-01-01' }).success,
  ).toBe(false);
});
it('does not offer close for a server-denied shift', () => {
  const seed = createDemoSeed(0, 'owner');
  const client = createCashClient(vi.fn(), () => crypto.randomUUID(), seed.business.id);
  const shift = { ...seed.shifts[0]!, state: 'open' as const, canClose: false };
  expect(
    cashForms(client, seed.business, shift.warehouseId, seed.locations, [shift]).some((f) =>
      f.title.startsWith('Close'),
    ),
  ).toBe(false);
});
