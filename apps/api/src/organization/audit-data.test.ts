import { expect, it } from 'vitest';
import { safeAuditData } from './audit-data.js';
it('omits credentials and personal contact data recursively from audit changes', () => {
  expect(
    safeAuditData({
      role: 'manager',
      password: 'secret',
      email: 'private@example.test',
      scope: { storeId: 'store', token: 'secret' },
      metadata: { phone: 'private' },
    }),
  ).toEqual({ role: 'manager', scope: { storeId: 'store' } });
});
